import { prisma } from "../../prisma";

const PRIORITIES = ["CRITICAL", "HIGH", "MEDIUM", "LOW"] as const;
const SEVERITIES = ["BLOCKER", "CRITICAL", "MAJOR", "MINOR", "TRIVIAL"] as const;
const TYPES = [
  "FUNCTIONAL",
  "REGRESSION",
  "SMOKE",
  "INTEGRATION",
  "UAT",
  "PERFORMANCE",
  "SECURITY",
  "USABILITY",
] as const;
const STATUSES = ["DRAFT", "READY_FOR_REVIEW", "APPROVED", "DEPRECATED", "ARCHIVED"] as const;

type Priority = (typeof PRIORITIES)[number];
type Severity = (typeof SEVERITIES)[number];
type TestType = (typeof TYPES)[number];
type TestStatus = (typeof STATUSES)[number];

export const IMPORT_TARGET_FIELDS = [
  "title",
  "description",
  "module",
  "priority",
  "severity",
  "type",
  "status",
  "preConditions",
  "testData",
  "environment",
  "steps",
  "stepAction",
  "stepExpectedResult",
] as const;

type TargetField = (typeof IMPORT_TARGET_FIELDS)[number];
type ImportMapping = Partial<Record<TargetField, string>>;
type RawRow = Record<string, unknown>;

type ParsedStep = {
  action: string;
  expectedResult: string;
};

type NormalizedRow = {
  title: string;
  description: string;
  module: string;
  priority: Priority;
  severity: Severity;
  type: TestType;
  status: TestStatus;
  preConditions: string;
  testData: string;
  environment: string;
  steps: ParsedStep[];
};

export type ImportRowPreview = {
  rowNumber: number;
  errors: string[];
  data: NormalizedRow;
};

export type ImportPreviewResult = {
  totalRows: number;
  validRows: number;
  invalidRows: number;
  rows: ImportRowPreview[];
};

export type ImportCommitResult = ImportPreviewResult & {
  importedCount: number;
  importedIds: string[];
};

const parseText = (value: unknown): string => {
  if (value === null || value === undefined) return "";
  return String(value).trim();
};

const normalizeEnumToken = (value: string) =>
  value.trim().toUpperCase().replace(/[\s-]+/g, "_");

const parseEnum = <T extends readonly string[]>(
  value: string,
  allowed: T,
  fallback: T[number]
): T[number] => {
  const normalized = normalizeEnumToken(value);
  if ((allowed as readonly string[]).includes(normalized)) {
    return normalized as T[number];
  }
  return fallback;
};

const isValidEnum = <T extends readonly string[]>(value: string, allowed: T) => {
  const normalized = normalizeEnumToken(value);
  return (allowed as readonly string[]).includes(normalized);
};

const parseStepsFromString = (rawSteps: string): { steps: ParsedStep[]; stepErrors: string[] } => {
  if (!rawSteps) return { steps: [], stepErrors: [] };

  const tokens = rawSteps
    .split(/\r?\n|\|\||;;/)
    .map((item) => item.trim())
    .filter(Boolean);

  const steps: ParsedStep[] = [];
  const stepErrors: string[] = [];

  tokens.forEach((token, index) => {
    const parts = token.split(/\s*(?:=>|->|\|)\s*/).map((item) => item.trim());
    if (parts.length < 2 || !parts[0]) {
      stepErrors.push(
        `Step ${index + 1} in "steps" must use format "action => expected result".`
      );
      return;
    }

    steps.push({
      action: parts[0],
      expectedResult: parts.slice(1).join(" | "),
    });
  });

  return { steps, stepErrors };
};

const normalizeSingleRow = (row: RawRow, mapping: ImportMapping, rowNumber: number): ImportRowPreview => {
  const errors: string[] = [];
  const getMapped = (field: TargetField) => parseText(row[mapping[field] || ""]);

  const title = getMapped("title");
  if (!title) errors.push("title is required.");

  const description = getMapped("description") || "N/A";
  const moduleName = getMapped("module") || "General";
  const priorityRaw = getMapped("priority") || "HIGH";
  const severityRaw = getMapped("severity") || "MAJOR";
  const typeRaw = getMapped("type") || "FUNCTIONAL";
  const statusRaw = getMapped("status") || "DRAFT";
  const preConditions = getMapped("preConditions") || "N/A";
  const testData = getMapped("testData") || "N/A";
  const environment = getMapped("environment") || "N/A";

  if (priorityRaw && !isValidEnum(priorityRaw, PRIORITIES)) {
    errors.push(`Invalid priority "${priorityRaw}". Allowed: ${PRIORITIES.join(", ")}.`);
  }
  if (severityRaw && !isValidEnum(severityRaw, SEVERITIES)) {
    errors.push(`Invalid severity "${severityRaw}". Allowed: ${SEVERITIES.join(", ")}.`);
  }
  if (typeRaw && !isValidEnum(typeRaw, TYPES)) {
    errors.push(`Invalid type "${typeRaw}". Allowed: ${TYPES.join(", ")}.`);
  }
  if (statusRaw && !isValidEnum(statusRaw, STATUSES)) {
    errors.push(`Invalid status "${statusRaw}". Allowed: ${STATUSES.join(", ")}.`);
  }

  const priority = parseEnum(priorityRaw, PRIORITIES, "HIGH");
  const severity = parseEnum(severityRaw, SEVERITIES, "MAJOR");
  const type = parseEnum(typeRaw, TYPES, "FUNCTIONAL");
  const status = parseEnum(statusRaw, STATUSES, "DRAFT");

  let steps: ParsedStep[] = [];
  const rawSteps = getMapped("steps");
  const singleAction = getMapped("stepAction");
  const singleExpected = getMapped("stepExpectedResult");

  if (rawSteps) {
    const parsed = parseStepsFromString(rawSteps);
    steps = parsed.steps;
    errors.push(...parsed.stepErrors);
  } else if (singleAction || singleExpected) {
    if (!singleAction || !singleExpected) {
      errors.push('Both "stepAction" and "stepExpectedResult" are required for single-step mapping.');
    } else {
      steps = [{ action: singleAction, expectedResult: singleExpected }];
    }
  }

  return {
    rowNumber,
    errors,
    data: {
      title,
      description,
      module: moduleName,
      priority,
      severity,
      type,
      status,
      preConditions,
      testData,
      environment,
      steps,
    },
  };
};

export const previewMappedImport = (rows: RawRow[], mapping: ImportMapping): ImportPreviewResult => {
  if (!Array.isArray(rows)) throw new Error("rows must be an array.");
  if (!mapping.title) throw new Error("Mapping for title is required.");

  const previewRows = rows.map((row, index) => normalizeSingleRow(row, mapping, index + 2));
  const invalidRows = previewRows.filter((row) => row.errors.length > 0).length;

  return {
    totalRows: previewRows.length,
    validRows: previewRows.length - invalidRows,
    invalidRows,
    rows: previewRows,
  };
};

export const commitMappedImport = async (
  rows: RawRow[],
  mapping: ImportMapping,
  createdById: number,
  projectId: string,
  mode: "skip_errors" | "all_or_nothing" = "skip_errors"
): Promise<ImportCommitResult> => {
  const preview = previewMappedImport(rows, mapping);
  if (mode === "all_or_nothing" && preview.invalidRows > 0) {
    return {
      ...preview,
      importedCount: 0,
      importedIds: [],
    };
  }

  const validRows = preview.rows.filter((row) => row.errors.length === 0);
  const importedIds: string[] = [];

  for (const row of validRows) {
    const created = await prisma.testCase.create({
      data: {
        title: row.data.title,
        description: row.data.description,
        module: row.data.module,
        priority: row.data.priority,
        severity: row.data.severity,
        type: row.data.type,
        status: row.data.status,
        preConditions: row.data.preConditions,
        testData: row.data.testData,
        environment: row.data.environment,
        createdById,
        projectId,
        steps: row.data.steps.length
          ? {
              create: row.data.steps.map((step, index) => ({
                stepNumber: index + 1,
                action: step.action,
                expectedResult: step.expectedResult,
              })),
            }
          : undefined,
      },
    });
    importedIds.push(created.id);
  }

  return {
    ...preview,
    importedCount: importedIds.length,
    importedIds,
  };
};

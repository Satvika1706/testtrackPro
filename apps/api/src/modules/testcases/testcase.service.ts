import { commitMappedImport, previewMappedImport } from "./testcase.import";
import { prisma } from "../../prisma";

export const createTestCaseService = async (
  data: any,
  userId: number,
  projectId: string
) => {
  const { steps, ...testCaseData } = data;

  return prisma.testCase.create({
    data: {
      ...testCaseData,
      projectId,
      createdById: userId,
      steps: steps
        ? {
            create: steps.map((step: any, index: number) => ({
              stepNumber: index + 1,
              action: step.action,
              expectedResult: step.expectedResult,
            })),
          }
        : undefined,
    },
  });
};

export const getTestCasesService = async (projectId: string) => {
  return prisma.testCase.findMany({
    where: {
      projectId,
      isDeleted: false,
    },
    orderBy: { createdAt: "desc" },
    include: {
      steps: true,
    },
  });
};

export const getTestCaseByIdService = async (id: string, projectId: string) => {
  return prisma.testCase.findFirst({
    where: { id, projectId, isDeleted: false },
    include: {
      steps: {
        orderBy: { stepNumber: "asc" },
      },
    },
  });
};

export const updateTestCaseService = async (
  id: string,
  data: any,
  userId: number,
  projectId: string
) => {
  const existing = await prisma.testCase.findFirst({
    where: { id, projectId, isDeleted: false },
    include: { steps: true },
  });

  if (!existing) {
    throw new Error("Test case not found");
  }

  const newVersion = existing.version + 1;

  if (data.steps && Array.isArray(data.steps)) {
    await prisma.testStep.deleteMany({
      where: { testCaseId: id },
    });

    for (let i = 0; i < data.steps.length; i++) {
      const step = data.steps[i];

      await prisma.testStep.create({
        data: {
          testCaseId: id,
          action: step.action,
          expectedResult: step.expectedResult,
          stepNumber: i + 1,
        },
      });
    }
  }

  const updated = await prisma.testCase.update({
    where: { id },
    data: {
      title: data.title,
      description: data.description,
      module: data.module,
      priority: data.priority,
      severity: data.severity,
      type: data.type,
      status: data.status,
      preConditions: data.preConditions,
      testData: data.testData,
      environment: data.environment,
      version: newVersion,
      updatedAt: new Date(),
    },
    include: { steps: true },
  });

  const stepsSnapshot = updated.steps.map((step) => ({
    id: step.id,
    action: step.action,
    expectedResult: step.expectedResult,
    stepNumber: step.stepNumber,
  }));

  await prisma.testCaseHistory.create({
    data: {
      testCaseId: id,
      version: newVersion,
      title: updated.title,
      description: updated.description,
      module: updated.module,
      priority: updated.priority,
      severity: updated.severity,
      type: updated.type,
      status: updated.status,
      preConditions: updated.preConditions,
      testData: updated.testData,
      environment: updated.environment,
      stepsSnapshot,
      changedBy: userId,
      changedAt: new Date(),
    },
  });

  return updated;
};

export const deleteTestCaseService = async (id: string, projectId: string) => {
  const existing = await prisma.testCase.findFirst({
    where: { id, projectId, isDeleted: false },
    select: { id: true },
  });
  if (!existing) {
    throw new Error("Test case not found");
  }

  return prisma.testCase.update({
    where: { id },
    data: { isDeleted: true },
  });
};

export const cloneTestCaseService = async (id: string, userId: number, projectId: string) => {
  const original = await prisma.testCase.findFirst({
    where: { id, projectId, isDeleted: false },
    include: { steps: true },
  });

  if (!original) throw new Error("Not found");

  const { id: _, createdAt, updatedAt, ...data } = original;

  return prisma.testCase.create({
    data: {
      ...data,
      title: `${original.title} (Clone)`,
      createdById: userId,
      projectId,
      steps: {
        create: original.steps.map((s) => ({
          stepNumber: s.stepNumber,
          action: s.action,
          expectedResult: s.expectedResult,
        })),
      },
    },
  });
};

export const createTestCaseTemplateService = async (
  testCaseId: string,
  templateData: {
    name: string;
    category: string;
    description?: string;
  },
  userId: number,
  projectId: string
) => {
  const testCase = await prisma.testCase.findFirst({
    where: { id: testCaseId, projectId, isDeleted: false },
    include: { steps: true },
  });

  if (!testCase) {
    throw new Error("Test case not found");
  }

  const stepsSnapshot = testCase.steps.map((step) => ({
    stepNumber: step.stepNumber,
    action: step.action,
    expectedResult: step.expectedResult,
  }));

  return prisma.testCaseTemplate.create({
    data: {
      name: templateData.name,
      category: templateData.category,
      description: templateData.description,
      title: testCase.title,
      priority: testCase.priority,
      severity: testCase.severity,
      type: testCase.type,
      preConditions: testCase.preConditions,
      testData: testCase.testData,
      environment: testCase.environment,
      stepsSnapshot,
      createdById: userId,
      projectId,
    },
  });
};

export const getTestCaseTemplatesService = async (projectId: string) => {
  return prisma.testCaseTemplate.findMany({
    where: { isActive: true, projectId },
    orderBy: { createdAt: "desc" },
  });
};

export const previewTestCaseImportService = async (rows: unknown, mapping: unknown) => {
  return previewMappedImport(rows as Record<string, unknown>[], mapping as Record<string, string>);
};

export const commitTestCaseImportService = async (
  rows: unknown,
  mapping: unknown,
  createdById: number,
  projectId: string,
  mode?: "skip_errors" | "all_or_nothing"
) => {
  return commitMappedImport(
    rows as Record<string, unknown>[],
    mapping as Record<string, string>,
    createdById,
    projectId,
    mode || "skip_errors"
  );
};

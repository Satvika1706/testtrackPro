import { Request, Response } from 'express';
import { 
  createTestCaseService, 
  getTestCasesService, 
  getTestCaseByIdService, 
  updateTestCaseService, 
  deleteTestCaseService,
  cloneTestCaseService,
  getTestCaseTemplatesService,
  previewTestCaseImportService,
  commitTestCaseImportService,
} from './testcase.service';
import { IMPORT_TARGET_FIELDS } from "./testcase.import";
import { resolveProjectId } from "../projects/project.context";


interface AuthRequest extends Request {
  user?: {
    userId: number;
  };
}

export const createTestCase = async (req: AuthRequest, res: Response) => {
  try {
    const projectId = await resolveProjectId(req, req.user?.userId);
    const testCase = await createTestCaseService(req.body, req.user!.userId, projectId);
    res.json(testCase);
  } catch (error) {
    res.status(500).json({ error: "Failed to create test case" });
  }
};

export const getTestCases = async (req: AuthRequest, res: Response) => {
  try {
    const projectId = await resolveProjectId(req, req.user?.userId);
    const testCases = await getTestCasesService(projectId);
    res.json(testCases);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch test cases" });
  }
};

export const getTestCaseById = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const projectId = await resolveProjectId(req, req.user?.userId);
    const testCase = await getTestCaseByIdService(id, projectId);
    if (!testCase) return res.status(404).json({ error: "Test case not found" });
    res.json(testCase);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch test case" });
  }
};

export const updateTestCaseController = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const projectId = await resolveProjectId(req, req.user?.userId);
    const updated = await updateTestCaseService(id, req.body, req.user!.userId, projectId);
    res.json(updated);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to update test case" });
  }
};

export const deleteTestCase = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const projectId = await resolveProjectId(req, req.user?.userId);
    await deleteTestCaseService(id, projectId);
    res.json({ message: "Test case deleted" });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete test case" });
  }
};

export const cloneTestCase = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const projectId = await resolveProjectId(req, req.user?.userId);
    const cloned = await cloneTestCaseService(id, req.user!.userId, projectId);
    res.json(cloned);
  } catch (error) {
    res.status(500).json({ error: "Failed to clone test case" });
  }
};
import { prisma } from "../../prisma"; 

export const getTestCaseHistory = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const projectId = await resolveProjectId(req, req.user?.userId);
    const testCase = await prisma.testCase.findFirst({
      where: { id, projectId },
      select: { id: true },
    });
    if (!testCase) {
      return res.status(404).json({ error: "Test case not found" });
    }

    const history = await prisma.testCaseHistory.findMany({
      where: { testCaseId: id },
      orderBy: { version: "desc" },
    });

    res.json(history);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch history" });
  }
};
import {
  createTestCaseTemplateService
} from "./testcase.service";

export const createTemplateFromTestCase = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const { id } = req.params;
    const { name, category, description } = req.body;
    const projectId = await resolveProjectId(req, req.user?.userId);

    const template = await createTestCaseTemplateService(
      id,
      { name, category, description },
      req.user!.userId,
      projectId
    );

    res.status(201).json(template);
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
};
export const getTestCaseTemplates = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const projectId = await resolveProjectId(req, req.user?.userId);
    const templates = await getTestCaseTemplatesService(projectId);
    res.json(templates);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch templates" });
  }
};

export const getTestCaseImportMeta = async (_req: Request, res: Response) => {
  res.json({
    supportedFormats: ["csv", "xlsx", "xls", "json"],
    targetFields: IMPORT_TARGET_FIELDS,
    requiredFields: ["title"],
  });
};

export const previewTestCaseImport = async (req: Request, res: Response) => {
  try {
    const { rows, mapping } = req.body || {};
    const preview = await previewTestCaseImportService(rows, mapping);
    res.json(preview);
  } catch (error: any) {
    res.status(400).json({ error: error?.message || "Failed to preview import" });
  }
};

export const commitTestCaseImport = async (req: AuthRequest, res: Response) => {
  try {
    const { rows, mapping, mode } = req.body || {};
    const projectId = await resolveProjectId(req, req.user?.userId);
    const result = await commitTestCaseImportService(
      rows,
      mapping,
      req.user!.userId,
      projectId,
      mode
    );
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: error?.message || "Failed to import test cases" });
  }
};
  

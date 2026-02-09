import { Request, Response } from 'express';
import { 
  createTestCaseService, 
  getTestCasesService, 
  getTestCaseByIdService, 
  updateTestCaseService, 
  deleteTestCaseService,
  cloneTestCaseService,
  getTestCaseTemplatesService
} from './testcase.service';


interface AuthRequest extends Request {
  user?: {
    userId: number;
  };
}

export const createTestCase = async (req: AuthRequest, res: Response) => {
  try {
    const testCase = await createTestCaseService(req.body, req.user!.userId);
    res.json(testCase);
  } catch (error) {
    res.status(500).json({ error: "Failed to create test case" });
  }
};

export const getTestCases = async (req: Request, res: Response) => {
  try {
    const testCases = await getTestCasesService();
    res.json(testCases);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch test cases" });
  }
};

export const getTestCaseById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const testCase = await getTestCaseByIdService(id);
    if (!testCase) return res.status(404).json({ error: "Test case not found" });
    res.json(testCase);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch test case" });
  }
};

export const updateTestCaseController = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const updated = await updateTestCaseService(id, req.body, req.user!.userId);
    res.json(updated);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to update test case" });
  }
};

export const deleteTestCase = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await deleteTestCaseService(id);
    res.json({ message: "Test case deleted" });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete test case" });
  }
};

export const cloneTestCase = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const cloned = await cloneTestCaseService(id, req.user!.userId);
    res.json(cloned);
  } catch (error) {
    res.status(500).json({ error: "Failed to clone test case" });
  }
};
import { prisma } from "../../prisma"; 

export const getTestCaseHistory = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

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

    const template = await createTestCaseTemplateService(
      id,
      { name, category, description },
      req.user!.userId
    );

    res.status(201).json(template);
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
};
export const getTestCaseTemplates = async (
  _req: Request,
  res: Response
) => {
  try {
    const templates = await getTestCaseTemplatesService();
    res.json(templates);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch templates" });
  }
};
  
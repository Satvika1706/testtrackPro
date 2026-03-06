import { Response } from "express";
import { AuthRequest } from "../../middleware/auth.middleware";
import { createTestRunSchema } from "./testrun.schema";
import * as testRunService from "./testrun.service";
import { assignTestRunItemSchema } from "./testrun.schema";
import { resolveProjectId } from "../projects/project.context";

export const createTestRun = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const parsedData = createTestRunSchema.parse(req.body);

    const userId = req.user!.userId;
    const projectId = await resolveProjectId(req, userId);

    const testRun = await testRunService.createTestRun({
      ...parsedData,
      userId,
      projectId,
    });

    return res.status(201).json({
      message: "Test run created successfully",
      data: testRun
    });

  } catch (error: any) {
    return res.status(400).json({
      message: error.message
    });
  }
};
export const getAllTestRuns = async (req: AuthRequest, res: Response) => {
  try {
    const projectId = await resolveProjectId(req, req.user?.userId);
    const runs = await testRunService.getAllTestRuns(projectId);
    return res.status(200).json({
      message: "Test runs fetched successfully",
      data: runs
    });
  } catch (error: any) {
    return res.status(400).json({ message: error.message });
  }
};
export const getTestRun = async (req: AuthRequest, res: Response) => {
  try {
    const projectId = await resolveProjectId(req, req.user?.userId);
    const run = await testRunService.getTestRunById(req.params.id, projectId);
    return res.status(200).json({
      message: "Test run fetched successfully",
      data: run
    });
  } catch (error: any) {
    return res.status(404).json({ message: error.message });
  }
};
export const getTestRunItems = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const testRunId = req.params.id;
    const projectId = await resolveProjectId(req, req.user?.userId);

    const items = await testRunService.getTestRunItems(testRunId, projectId);

    return res.status(200).json({
      message: "Test run items fetched successfully",
      data: items
    });

  } catch (error: any) {
    return res.status(400).json({ message: error.message });
  }
};

export const startExecution = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const testRunItemId = req.params.id;

    const result = await testRunService.startExecution(testRunItemId);

    return res.status(200).json({
      message: "Execution started successfully",
      data: result
    });

  } catch (error: any) {
    return res.status(400).json({
      message: error.message
    });
  }
};
export const pauseExecution = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const id = req.params.id;
    const result = await testRunService.pauseExecution(id);

    return res.status(200).json({
      message: "Execution paused",
      data: result
    });
  } catch (error: any) {
    return res.status(400).json({
      message: error.message
    });
  }
};
export const resumeExecution = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const id = req.params.id;
    const result = await testRunService.resumeExecution(id);

    return res.status(200).json({
      message: "Execution resumed",
      data: result
    });
  } catch (error: any) {
    return res.status(400).json({
      message: error.message
    });
  }
};

export const completeExecution = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const testRunItemId = req.params.id;

    const result = await testRunService.completeExecution(testRunItemId);

    return res.status(200).json({
      message: "Execution completed successfully",
      data: result
    });

  } catch (error: any) {
    return res.status(400).json({
      message: error.message
    });
  }
};
export const getTestRunItem = async (
      req: AuthRequest,
  res: Response) => {
  try {
    const item = await testRunService.getTestRunItem(req.params.id);

    res.status(200).json({
      message: "Test run item fetched successfully",
      data: item
    });

  } catch (error: any) {
    res.status(400).json({
      message: error.message
    });
  }
};
export const getExecutionSteps = async (
      req: AuthRequest,
  res: Response
) => {
  try {
    const steps = await testRunService.getExecutionSteps(req.params.id);

    res.status(200).json({
      message: "Execution steps fetched successfully",
      data: steps
    });

  } catch (error: any) {
    res.status(400).json({
      message: error.message
    });
  }
};

export const assignTestRunItem = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const testRunItemId = req.params.id;

    const parsed = assignTestRunItemSchema.parse(req.body);

    const result = await testRunService.assignTestRunItem(
      testRunItemId,
      parsed.userId
    );

    return res.status(200).json({
      message: "Test run item assigned successfully",
      data: result
    });

  } catch (error: any) {
    return res.status(400).json({
      message: error.message
    });
  }
};
export const getRunProgress = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const testRunId = req.params.id;
    const projectId = await resolveProjectId(req, req.user?.userId);

   
    const result = await testRunService.getRunProgress(testRunId, projectId);


    return res.status(200).json({
      message: "Run progress fetched successfully",
      data: result
    });

  } catch (error: any) {
    return res.status(400).json({ message: error.message });
  }
};
export const updateExecutionStepStatus = async (
   req: AuthRequest,
  res: Response
) => {
  try {
    const { status } = req.body;

    if (!["PASS", "FAIL", "BLOCKED"].includes(status)) {
      throw new Error("Invalid status");
    }

    const step = await testRunService.updateExecutionStepStatus(
      req.params.id,
      status
    );

    res.status(200).json({
      message: "Step updated successfully",
      data: step
    });

  } catch (error: any) {
    res.status(400).json({
      message: error.message
    });
  }
};

export const createReExecution = async (req: AuthRequest, res: Response) => {
  try {
    const result = await testRunService.createReExecution(req.params.id);
    return res.status(201).json({
      message: "Re-execution created successfully",
      data: result,
    });
  } catch (error: any) {
    return res.status(400).json({
      message: error.message,
    });
  }
};

export const getExecutionComparison = async (req: AuthRequest, res: Response) => {
  try {
    const result = await testRunService.getExecutionComparison(req.params.id);
    return res.status(200).json({
      message: "Execution comparison fetched successfully",
      data: result,
    });
  } catch (error: any) {
    return res.status(400).json({
      message: error.message,
    });
  }
};

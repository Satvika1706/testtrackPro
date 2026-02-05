import { Response } from "express";
import { AuthRequest } from "../../middleware/auth.middleware";
import { createTestCaseService } from "./testcase.service";

import { prisma } from "../../prisma";


export const createTestCase = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    // ✅ TypeScript now knows userId exists
    const userId = req.user!.userId;

    const testCase = await createTestCaseService(req.body, userId);

    return res.status(201).json({
      success: true,
      message: "Test case created successfully",
      data: testCase
    });
  } catch (error: any) {
    console.error("Create Test Case Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

export const getTestCases = async (req: AuthRequest, res: Response) => {
  const testCases = await prisma.testCase.findMany({
    where: { isDeleted: false },
    include: { steps: true },
  });

  res.json(testCases);
};


import { updateTestCaseService } from "./testcase.service";

export const updateTestCase = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const { id } = req.params;
    const { changeSummary } = req.body;

    if (!changeSummary) {
      return res.status(400).json({
        success: false,
        message: "Change summary is required"
      });
    }

    const userId = req.user!.userId;

    const updated = await updateTestCaseService(
      id,
      req.body,
      userId
    );

    return res.status(200).json({
      success: true,
      message: "Test case updated successfully",
      data: updated
    });
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

import { cloneTestCaseService } from "./testcase.service";

export const cloneTestCase = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const { id } = req.params;
    const userId = req.user!.userId;

    const cloned = await cloneTestCaseService(id, userId);

    return res.status(201).json({
      success: true,
      message: "Test case cloned successfully",
      data: cloned
    });
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

import { deleteTestCaseService } from "./testcase.service";

export const deleteTestCase = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const { id } = req.params;
    const userId = req.user!.userId;

    await deleteTestCaseService(id, userId);

    return res.status(200).json({
      success: true,
      message: "Test case deleted successfully"
    });
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      message: error.message
    });
  }
};


import { prisma } from "../../prisma";
import { CreateTestCaseDTO } from "./testcase.types";

export const createTestCaseService = async (
  data: CreateTestCaseDTO,
  userId: number
) => {
  // Generate readable Test Case ID
  const testCaseId = `TC-${new Date().getFullYear()}-${Math.floor(
    10000 + Math.random() * 90000
  )}`;

  const testCase = await prisma.testCase.create({
    data: {
      testCaseId,
      title: data.title,
      description: data.description,
      module: data.module,

      // Enums (must match Prisma)
      priority: data.priority,
      severity: data.severity,
      type: data.type,
      status: data.status,

      // Strings (as per schema)
      preConditions: data.preConditions,
      testData: data.testData,
      environment: data.environment,

      estimatedDuration: data.estimatedDuration,
      automationStatus: data.automationStatus,
      automationLink: data.automationLink,

      version: 1,
      createdById: userId,

    
      steps: {
        create:
          Array.isArray(data.steps) && data.steps.length > 0
            ? data.steps.map((step) => ({
                stepNumber: step.stepNumber,
                action: step.action,
                testData: step.testData,
                expectedResult: step.expectedResult
              }))
            : []
      }
    },
    include: {
      steps: true
    }
  });

  return testCase;
};


export const updateTestCaseService = async (
  testCaseId: string,
  data: CreateTestCaseDTO,
  userId: number
) => {
  // 1. Fetch existing test case
  const existing = await prisma.testCase.findUnique({
    where: { id: testCaseId },
    include: { steps: true }
  });

  if (!existing || existing.isDeleted) {
    throw new Error("Test case not found");
  }

  // 2. Ownership check
  if (existing.createdById !== userId) {
    throw new Error("You are not allowed to edit this test case");
  }

  // 3. Update test case + increment version
  const updated = await prisma.testCase.update({
    where: { id: testCaseId },
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
      automationStatus: data.automationStatus,
      automationLink: data.automationLink,

      version: existing.version + 1,

     
      steps: {
        deleteMany: {},
        create: data.steps.map((step) => ({
          stepNumber: step.stepNumber,
          action: step.action,
          testData: step.testData,
          expectedResult: step.expectedResult
        }))
      }
    },
    include: {
      steps: true
    }
  });

  return updated;
};


export const cloneTestCaseService = async (
  testCaseId: string,
  userId: number
) => {
  // 1. Fetch original test case
  const original = await prisma.testCase.findUnique({
    where: { id: testCaseId },
    include: { steps: true }
  });

  if (!original || original.isDeleted) {
    throw new Error("Original test case not found");
  }

  // 2. Generate new Test Case ID
  const newTestCaseId = `TC-${new Date().getFullYear()}-${Math.floor(
    10000 + Math.random() * 90000
  )}`;

  // 3. Create cloned test case
  const cloned = await prisma.testCase.create({
    data: {
      testCaseId: newTestCaseId,
      title: original.title,
      description: original.description,
      module: original.module,

      priority: original.priority,
      severity: original.severity,
      type: original.type,

      // 🔑 force DRAFT for clone
      status: "DRAFT",

      preConditions: original.preConditions,
      testData: original.testData,
      environment: original.environment,

      estimatedDuration: original.estimatedDuration,
      automationStatus: original.automationStatus,
      automationLink: original.automationLink,

      version: 1,
      createdById: userId,

      steps: {
        create: original.steps.map((step) => ({
          stepNumber: step.stepNumber,
          action: step.action,
          testData: step.testData,
          expectedResult: step.expectedResult
        }))
      }
    },
    include: {
      steps: true
    }
  });

  return cloned;
};


export const deleteTestCaseService = async (
  testCaseId: string,
  userId: number
) => {
  const existing = await prisma.testCase.findUnique({
    where: { id: testCaseId }
  });

  if (!existing || existing.isDeleted) {
    throw new Error("Test case not found");
  }

  
  if (existing.createdById !== userId) {
    throw new Error("You are not allowed to delete this test case");
  }

  await prisma.testCase.update({
    where: { id: testCaseId },
    data: {
      isDeleted: true
    }
  });

  return true;
};


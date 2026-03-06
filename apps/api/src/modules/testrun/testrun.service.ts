import { prisma } from "../../prisma";

interface CreateTestRunInput {
  name: string;
  description?: string;
  testCaseIds: string[];
  userId: number;
  projectId: string;
  milestoneId?: string;
}

export const createTestRun = async (data: CreateTestRunInput) => {
 
  const uniqueIds = [...new Set(data.testCaseIds)];


  const existingTestCases = await prisma.testCase.findMany({
    where: {
      id: { in: uniqueIds },
      isDeleted: false,
      projectId: data.projectId,
    },
    select: { id: true }
  });

  if (existingTestCases.length !== uniqueIds.length) {
    throw new Error("One or more selected test cases do not exist");
  }

  if (data.milestoneId) {
    const milestone = await prisma.milestone.findFirst({
      where: {
        id: data.milestoneId,
        projectId: data.projectId,
      },
      select: { id: true },
    });

    if (!milestone) {
      throw new Error("Milestone not found for selected project");
    }
  }

 
  const testRun = await prisma.testRun.create({
    data: {
      name: data.name,
      description: data.description,
      createdById: data.userId,
      projectId: data.projectId,
      milestoneId: data.milestoneId,

      testRunItems: {
        create: uniqueIds.map((id) => ({
          testCaseId: id
        }))
      }
    },
    include: {
      testRunItems: true
    }
  });

  return testRun;
};
export const getAllTestRuns = async (projectId: string) => {
  return prisma.testRun.findMany({
    where: {
      projectId,
    },
    orderBy: { createdAt: "desc" },
    include: {
      createdBy: { select: { email: true } },
      milestone: { select: { id: true, name: true, status: true } },
      _count: { select: { testRunItems: true } }
    }
  });
};

export const getTestRunById = async (id: string, projectId: string) => {
  const run = await prisma.testRun.findFirst({
    where: { id, projectId },
    include: {
      createdBy: { select: { email: true } },
      milestone: { select: { id: true, name: true, status: true } },
      _count: { select: { testRunItems: true } },
    },
  });

  if (!run) {
    throw new Error("Test run not found");
  }

  return run;
};
export const getTestRunItems = async (testRunId: string, projectId: string) => {
  return prisma.testRunItem.findMany({
    where: {
      testRunId,
      testRun: {
        projectId,
      },
    },
    include: {
      testCase: {
        select: { title: true }
      },
      assignedTo: {
        select: { email: true }
      }
    }
  });
};

export const startExecution = async (testRunItemId: string) => {
  console.log("Searching for:", testRunItemId);

  
  const testRunItem = await prisma.testRunItem.findUnique({
    where: { id: testRunItemId },
    include: {
      testCase: {
        include: {
          steps: true
        }
      }
    }
  });

  if (!testRunItem) {
    throw new Error("Test run item not found");
  }


  if (testRunItem.status !== "NOT_STARTED") {
    throw new Error("Execution already started or completed");
  }

  const steps = testRunItem.testCase.steps;

  if (!steps.length) {
    throw new Error("Test case has no steps to execute");
  }

  const result = await prisma.$transaction(async (tx) => {

   
   await tx.testRunItem.update({
  where: { id: testRunItemId },
  data: {
    status: "IN_PROGRESS",
    startedAt: new Date(),
    pausedAt: null,
    accumulatedTime: 0
  }
});
    await tx.testExecutionStep.createMany({
      data: steps.map(step => ({
        testRunItemId: testRunItemId,
        stepNumber: step.stepNumber,
        action: step.action,
        expectedResult: step.expectedResult
      }))
    });

    return { success: true };
  });

  return result;
};
export const pauseExecution = async (id: string) => {
  const item = await prisma.testRunItem.findUnique({
    where: { id }
  });

  if (!item || item.status !== "IN_PROGRESS") {
    throw new Error("Execution not in progress");
  }

  const now = new Date();

  const elapsed =
    Math.floor((now.getTime() - item.startedAt!.getTime()) / 1000);

  return prisma.testRunItem.update({
    where: { id },
    data: {
      pausedAt: now,
      accumulatedTime: item.accumulatedTime + elapsed
    }
  });
};
export const resumeExecution = async (id: string) => {
  const item = await prisma.testRunItem.findUnique({
    where: { id }
  });

  if (!item || !item.pausedAt) {
    throw new Error("Execution is not paused");
  }

  return prisma.testRunItem.update({
    where: { id },
    data: {
      startedAt: new Date(),
      pausedAt: null
    }
  });
};

export const completeExecution = async (testRunItemId: string) => {

  const testRunItem = await prisma.testRunItem.findUnique({
    where: { id: testRunItemId }
  });

  if (!testRunItem) {
    throw new Error("Test run item not found");
  }

  if (testRunItem.status !== "IN_PROGRESS") {
    throw new Error("Execution is not in progress");
  }

  const steps = await prisma.testExecutionStep.findMany({
    where: { testRunItemId }
  });

  if (!steps.length) {
    throw new Error("No execution steps found");
  }


  const incomplete = steps.find(step => !step.status);
  if (incomplete) {
    throw new Error("All steps must be executed before completing");
  }


  let finalStatus: any;

  const hasFail = steps.some(step => step.status === "FAIL");
  const hasBlocked = steps.some(step => step.status === "BLOCKED");

  if (hasFail) {
    finalStatus = "FAILED";
  } else if (hasBlocked) {
    finalStatus = "BLOCKED";
  } else {
    finalStatus = "PASSED";
  }

 
  let totalTime = testRunItem.accumulatedTime;

  if (testRunItem.startedAt) {
    const elapsed =
      Math.floor(
        (Date.now() -
          new Date(testRunItem.startedAt).getTime()) / 1000
      );

    totalTime += elapsed;
  }

  const updated = await prisma.testRunItem.update({
    where: { id: testRunItemId },
    data: {
      status: finalStatus,
      totalTimeSeconds: totalTime,
      completedAt: new Date()
    }
  });

  return updated;
};

export const getTestRunItem = async (id: string) => {
  const item = await prisma.testRunItem.findUnique({
    where: { id }
  });

  if (!item) {
    throw new Error("TestRunItem not found");
  }

  return item;
};
export const getExecutionSteps = async (id: string) => {
  return prisma.testExecutionStep.findMany({
    where: { testRunItemId: id },
    orderBy: { stepNumber: "asc" }
  });
};

export const assignTestRunItem = async (
  testRunItemId: string,
  userId: number
) => {

  const testRunItem = await prisma.testRunItem.findUnique({
    where: { id: testRunItemId }
  });

  if (!testRunItem) {
    throw new Error("Test run item not found");
  }

  
  const user = await prisma.user.findUnique({
    where: { id: userId }
  });

  if (!user) {
    throw new Error("User not found");
  }

  
  if (user.role !== "TESTER") {
    throw new Error("Only TESTER role can be assigned to test execution");
  }


  const updated = await prisma.testRunItem.update({
    where: { id: testRunItemId },
    data: {
      assignedToId: userId
    }
  });

  return updated;
};
export const getRunProgress = async (testRunId: string, projectId: string) => {
  const items = await prisma.testRunItem.findMany({
    where: {
      testRunId,
      testRun: {
        projectId,
      },
    },
    select: { status: true }
  });

  if (!items.length) {
    throw new Error("No test run items found");
  }

  const total = items.length;

  const stats = {
    NOT_STARTED: 0,
    IN_PROGRESS: 0,
    PASSED: 0,
    FAILED: 0,
    BLOCKED: 0,
    SKIPPED: 0
  };

  for (const item of items) {
    stats[item.status]++;
  }

  const completed =
    stats.PASSED +
    stats.FAILED +
    stats.BLOCKED +
    stats.SKIPPED;

  return {
    total,
    notStarted: stats.NOT_STARTED,
    inProgress: stats.IN_PROGRESS,
    passed: stats.PASSED,
    failed: stats.FAILED,
    blocked: stats.BLOCKED,
    skipped: stats.SKIPPED,
    completionRate: total ? (completed / total) * 100 : 0,
    passRate: completed ? (stats.PASSED / completed) * 100 : 0
  };
};
export const updateExecutionStepStatus = async (
  stepId: string,
  status: "PASS" | "FAIL" | "BLOCKED"
) => {

  const step = await prisma.testExecutionStep.update({
    where: { id: stepId },
    data: {
      status,
      executedAt: new Date()
    }
  });

  return step;
};

export const createReExecution = async (testRunItemId: string) => {
  const original = await prisma.testRunItem.findUnique({
    where: { id: testRunItemId },
    select: {
      id: true,
      testRunId: true,
      testCaseId: true,
      assignedToId: true,
      status: true,
    },
  });

  if (!original) {
    throw new Error("Test run item not found");
  }

  if (!["PASSED", "FAILED", "BLOCKED"].includes(original.status)) {
    throw new Error("Re-execution is allowed only for completed items");
  }

  const reExecution = await prisma.testRunItem.create({
    data: {
      testRunId: original.testRunId,
      testCaseId: original.testCaseId,
      assignedToId: original.assignedToId,
      status: "NOT_STARTED",
      reExecutionOfId: original.id,
    },
  });

  return reExecution;
};

export const getExecutionComparison = async (testRunItemId: string) => {
  const current = await prisma.testRunItem.findUnique({
    where: { id: testRunItemId },
    select: {
      id: true,
      reExecutionOfId: true,
      status: true,
    },
  });

  if (!current) {
    throw new Error("Test run item not found");
  }

  if (!current.reExecutionOfId) {
    return {
      hasComparison: false,
      reason: "No previous execution linked to this item.",
      summary: {
        improved: 0,
        regressed: 0,
        unchanged: 0,
        newOrMissing: 0,
      },
      steps: [],
    };
  }

  const [previousSteps, currentSteps] = await Promise.all([
    prisma.testExecutionStep.findMany({
      where: { testRunItemId: current.reExecutionOfId },
      orderBy: { stepNumber: "asc" },
      select: {
        stepNumber: true,
        status: true,
        actualResult: true,
      },
    }),
    prisma.testExecutionStep.findMany({
      where: { testRunItemId: current.id },
      orderBy: { stepNumber: "asc" },
      select: {
        stepNumber: true,
        status: true,
        actualResult: true,
      },
    }),
  ]);

  const previousByStep = new Map(previousSteps.map((step) => [step.stepNumber, step]));
  const currentByStep = new Map(currentSteps.map((step) => [step.stepNumber, step]));
  const allStepNumbers = Array.from(new Set([...previousByStep.keys(), ...currentByStep.keys()])).sort(
    (a, b) => a - b
  );

  const rank = (status: string | null) => {
    if (status === "PASS") return 4;
    if (status === "SKIPPED") return 3;
    if (status === "BLOCKED") return 2;
    if (status === "FAIL") return 1;
    return 0;
  };

  let improved = 0;
  let regressed = 0;
  let unchanged = 0;
  let newOrMissing = 0;

  const steps = allStepNumbers.map((stepNumber) => {
    const prev = previousByStep.get(stepNumber);
    const curr = currentByStep.get(stepNumber);

    let change: "IMPROVED" | "REGRESSED" | "UNCHANGED" | "NEW_OR_MISSING" = "UNCHANGED";

    if (!prev || !curr) {
      change = "NEW_OR_MISSING";
      newOrMissing++;
    } else if (prev.status === curr.status) {
      unchanged++;
    } else if (rank(curr.status) > rank(prev.status)) {
      change = "IMPROVED";
      improved++;
    } else {
      change = "REGRESSED";
      regressed++;
    }

    return {
      stepNumber,
      previousStatus: prev?.status ?? null,
      currentStatus: curr?.status ?? null,
      previousActualResult: prev?.actualResult ?? null,
      currentActualResult: curr?.actualResult ?? null,
      change,
    };
  });

  return {
    hasComparison: true,
    summary: {
      improved,
      regressed,
      unchanged,
      newOrMissing,
    },
    previousExecutionId: current.reExecutionOfId,
    currentExecutionId: current.id,
    steps,
  };
};

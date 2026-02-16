import { prisma } from "../../prisma";

interface UpdateStepInput {
  status: "PASS" | "FAIL" | "BLOCKED" | "SKIPPED";
  actualResult: string;
}

export const updateExecutionStep = async (
  stepId: string,
  data: UpdateStepInput
) => {

  const existingStep = await prisma.testExecutionStep.findUnique({
    where: { id: stepId }
  });

  if (!existingStep) {
    throw new Error("Execution step not found");
  }

  if (!existingStep.testRunItemId) {
    throw new Error("Invalid execution step");
  }

  const updatedStep = await prisma.testExecutionStep.update({
    where: { id: stepId },
    data: {
      status: data.status,
      actualResult: data.actualResult,
      executedAt: new Date()
    }
  });

  return updatedStep;
};

import { z } from "zod";

export const updateExecutionStepSchema = z.object({
  status: z.enum(["PASS", "FAIL", "BLOCKED", "SKIPPED"]),
  actualResult: z
    .string()
    .min(1, "Actual result cannot be empty")
});

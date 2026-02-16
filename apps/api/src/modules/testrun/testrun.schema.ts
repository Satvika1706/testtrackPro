import { z } from "zod";

export const createTestRunSchema = z.object({
  name: z
    .string()
    .min(3, "Test run name must be at least 3 characters long")
    .max(100, "Test run name cannot exceed 100 characters"),

  description: z
    .string()
    .max(500, "Description cannot exceed 500 characters")
    .optional(),

  testCaseIds: z
    .array(
      z.string().uuid("Each test case ID must be a valid UUID")
    )
    .min(1, "At least one test case must be selected")
});


export const assignTestRunItemSchema = z.object({
  userId: z.number().int().positive()
});

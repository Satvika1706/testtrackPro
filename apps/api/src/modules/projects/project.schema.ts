import { z } from "zod";

export const createProjectSchema = z.object({
  key: z.string().min(2).max(50).regex(/^[a-z0-9-]+$/),
  name: z.string().min(2).max(120),
  description: z.string().max(500).optional(),
  config: z.record(z.string(), z.any()).optional(),
});

export const updateProjectSchema = z.object({
  name: z.string().min(2).max(120).optional(),
  description: z.string().max(500).nullable().optional(),
  isArchived: z.boolean().optional(),
  config: z.record(z.string(), z.any()).optional(),
});

export const createCustomFieldSchema = z.object({
  entityType: z.enum(["TEST_CASE", "TEST_SUITE", "TEST_RUN", "BUG"]),
  name: z.string().min(1).max(80),
  fieldType: z.enum(["TEXT", "NUMBER", "BOOLEAN", "DATE", "SELECT"]),
  required: z.boolean().optional(),
  options: z.array(z.string()).optional(),
  defaultValue: z.string().max(500).optional(),
}).superRefine((value, ctx) => {
  if (value.fieldType === "SELECT" && (!value.options || value.options.length === 0)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["options"],
      message: "Dropdown field requires options",
    });
  }
});

export const createMilestoneSchema = z.object({
  name: z.string().min(2).max(120),
  description: z.string().max(500).optional(),
  status: z.enum(["PLANNED", "ACTIVE", "COMPLETED"]).optional(),
  startDate: z.string().datetime().optional(),
  targetDate: z.string().datetime().optional(),
  dueDate: z.string().datetime().optional(),
});

export const updateProjectConfigSchema = z.object({
  config: z.record(z.string(), z.any()),
});

export const mapRunMilestoneSchema = z.object({
  milestoneId: z.string().uuid().nullable(),
});

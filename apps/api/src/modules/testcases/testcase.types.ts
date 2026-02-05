import {
  Priority,
  Severity,
  TestType,
  TestStatus,
  AutomationStatus
} from "@prisma/client";

export interface TestStepDTO {
  stepNumber: number;
  action: string;
  testData?: string;
  expectedResult: string;
}

export interface CreateTestCaseDTO {
  title: string;
  description: string;
  module: string;

  // Prisma enums (EXACT MATCH)
  priority: Priority;
  severity: Severity;
  type: TestType;
  status: TestStatus;

  // Prisma expects STRING
  preConditions: string;
  testData: string;
  environment: string;

  estimatedDuration?: number;
  automationStatus: AutomationStatus;
  automationLink?: string;

  steps: TestStepDTO[];
}

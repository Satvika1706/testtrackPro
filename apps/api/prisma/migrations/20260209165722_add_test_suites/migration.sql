-- CreateEnum
CREATE TYPE "Priority" AS ENUM ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW');

-- CreateEnum
CREATE TYPE "Severity" AS ENUM ('BLOCKER', 'CRITICAL', 'MAJOR', 'MINOR', 'TRIVIAL');

-- CreateEnum
CREATE TYPE "TestType" AS ENUM ('FUNCTIONAL', 'REGRESSION', 'SMOKE', 'INTEGRATION', 'UAT', 'PERFORMANCE', 'SECURITY', 'USABILITY');

-- CreateEnum
CREATE TYPE "TestStatus" AS ENUM ('DRAFT', 'READY_FOR_REVIEW', 'APPROVED', 'DEPRECATED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "AutomationStatus" AS ENUM ('NOT_AUTOMATED', 'IN_PROGRESS', 'AUTOMATED', 'CANNOT_AUTOMATE');

-- CreateTable
CREATE TABLE "TestCase" (
    "id" TEXT NOT NULL,
    "testCaseId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "module" TEXT NOT NULL,
    "priority" "Priority" NOT NULL,
    "severity" "Severity" NOT NULL,
    "type" "TestType" NOT NULL,
    "status" "TestStatus" NOT NULL,
    "preConditions" TEXT NOT NULL,
    "testData" TEXT NOT NULL,
    "environment" TEXT NOT NULL,
    "estimatedDuration" INTEGER,
    "automationStatus" "AutomationStatus",
    "automationLink" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" INTEGER NOT NULL,

    CONSTRAINT "TestCase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TestStep" (
    "id" TEXT NOT NULL,
    "stepNumber" INTEGER NOT NULL,
    "action" TEXT NOT NULL,
    "testData" TEXT,
    "expectedResult" TEXT NOT NULL,
    "actualResult" TEXT,
    "status" TEXT,
    "testCaseId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TestStep_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TestCaseHistory" (
    "id" TEXT NOT NULL,
    "testCaseId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "module" TEXT,
    "priority" "Priority" NOT NULL,
    "severity" "Severity" NOT NULL,
    "type" "TestType" NOT NULL,
    "status" "TestStatus" NOT NULL,
    "preConditions" TEXT,
    "testData" TEXT,
    "expectedResult" TEXT,
    "postConditions" TEXT,
    "environment" TEXT,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "changedBy" INTEGER,
    "stepsSnapshot" JSONB,

    CONSTRAINT "TestCaseHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TestCaseTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "priority" "Priority" NOT NULL,
    "severity" "Severity" NOT NULL,
    "type" "TestType" NOT NULL,
    "preConditions" TEXT,
    "testData" TEXT,
    "environment" TEXT,
    "stepsSnapshot" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "TestCaseTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TestSuite" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "module" TEXT,
    "parentSuiteId" TEXT,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TestSuite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TestSuiteTestCase" (
    "id" TEXT NOT NULL,
    "testSuiteId" TEXT NOT NULL,
    "testCaseId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,

    CONSTRAINT "TestSuiteTestCase_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TestCase_status_priority_idx" ON "TestCase"("status", "priority");

-- CreateIndex
CREATE UNIQUE INDEX "TestSuiteTestCase_testSuiteId_testCaseId_key" ON "TestSuiteTestCase"("testSuiteId", "testCaseId");

-- AddForeignKey
ALTER TABLE "TestCase" ADD CONSTRAINT "TestCase_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestStep" ADD CONSTRAINT "TestStep_testCaseId_fkey" FOREIGN KEY ("testCaseId") REFERENCES "TestCase"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestCaseHistory" ADD CONSTRAINT "TestCaseHistory_testCaseId_fkey" FOREIGN KEY ("testCaseId") REFERENCES "TestCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestCaseTemplate" ADD CONSTRAINT "TestCaseTemplate_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestSuite" ADD CONSTRAINT "TestSuite_parentSuiteId_fkey" FOREIGN KEY ("parentSuiteId") REFERENCES "TestSuite"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestSuiteTestCase" ADD CONSTRAINT "TestSuiteTestCase_testSuiteId_fkey" FOREIGN KEY ("testSuiteId") REFERENCES "TestSuite"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestSuiteTestCase" ADD CONSTRAINT "TestSuiteTestCase_testCaseId_fkey" FOREIGN KEY ("testCaseId") REFERENCES "TestCase"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

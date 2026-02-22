import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

// 1. CREATE
export const createTestCaseService = async (data: any, userId: number) => {
  const { steps, ...testCaseData } = data;

  return await prisma.testCase.create({
    data: {
      ...testCaseData,
      
      createdById: userId, 
      
      steps: steps ? {
        create: steps.map((step: any, index: number) => ({
          stepNumber: index + 1,
          action: step.action,
          expectedResult: step.expectedResult
        }))
      } : undefined
    }
  });
};

// 2. GET ALL 
export const getTestCasesService = async () => {
  return await prisma.testCase.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      steps: true 
    }
  });
};

// 3. GET ONE
export const getTestCaseByIdService = async (id: string) => {
  return await prisma.testCase.findUnique({
    where: { id },
    include: {
      steps: {
        orderBy: { stepNumber: 'asc' }
      }
    },
  });
};
// 4. UPDATE 


export const updateTestCaseService = async (
  id: string,
  data: any,
  userId: number
) => {
  
  const existing = await prisma.testCase.findUnique({
    where: { id },
    include: { steps: true },
  });
console.log("UPDATE SERVICE CALLED");
console.log("Incoming steps:", data.steps);

  if (!existing) {
    throw new Error("Test case not found");
  }

  const newVersion = existing.version + 1;

 
  if (data.steps && Array.isArray(data.steps)) {
   
    await prisma.testStep.deleteMany({
      where: { testCaseId: id },
    });

    
    for (let i = 0; i < data.steps.length; i++) {
      const step = data.steps[i];

      await prisma.testStep.create({
        data: {
          testCaseId: id,
          action: step.action,
          expectedResult: step.expectedResult,
          stepNumber: i + 1,
        },
      });
    }
  }

  
  const updated = await prisma.testCase.update({
    where: { id },
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
      version: newVersion,
      updatedAt: new Date(),
    },
    include: { steps: true },
  });


  const stepsSnapshot = updated.steps.map(step => ({
    id: step.id,
    action: step.action,
    expectedResult: step.expectedResult,
    stepNumber: step.stepNumber
  }));

  await prisma.testCaseHistory.create({
    data: {
      testCaseId: id,
      version: newVersion,

      title: updated.title,
      description: updated.description,
      module: updated.module,
      priority: updated.priority,
      severity: updated.severity,
      type: updated.type,
      status: updated.status,
      preConditions: updated.preConditions,
      testData: updated.testData,
      environment: updated.environment,

      stepsSnapshot,
      changedBy: userId,
      changedAt: new Date(),
    },
  });

  return updated;
};
;


export const deleteTestCaseService = async (id: string) => {
  return await prisma.testCase.update({
    where: { id },
    data: { isDeleted: true },
  });
};


// 6. CLONE
export const cloneTestCaseService = async (id: string, userId: number) => {
  const original = await prisma.testCase.findUnique({
    where: { id },
    include: { steps: true }
  });

  if (!original) throw new Error("Not found");

  const { id: _, ...data } = original;

  return await prisma.testCase.create({
    data: {
      ...data,
      title: `${original.title} (Clone)`,
      createdById: userId, 
      steps: {
        create: original.steps.map(s => ({
          stepNumber: s.stepNumber,
          action: s.action,
          expectedResult: s.expectedResult
        }))
      }
    }
  });
};
export const createTestCaseTemplateService = async (
  testCaseId: string,
  templateData: {
    name: string;
    category: string;
    description?: string;
  },
  userId: number
) => {
  
  const testCase = await prisma.testCase.findUnique({
    where: { id: testCaseId },
    include: { steps: true },
  });

  if (!testCase) {
    throw new Error("Test case not found");
  }

  const stepsSnapshot = testCase.steps.map(step => ({
    stepNumber: step.stepNumber,
    action: step.action,
    expectedResult: step.expectedResult,
  }));


  return prisma.testCaseTemplate.create({
    data: {
      name: templateData.name,
      category: templateData.category,
      description: templateData.description,

      title: testCase.title,
      priority: testCase.priority,
      severity: testCase.severity,
      type: testCase.type,

      preConditions: testCase.preConditions,
      testData: testCase.testData,
      environment: testCase.environment,

      stepsSnapshot,

      createdById: userId,
    },
  });
};
export const getTestCaseTemplatesService = async () => {
  return prisma.testCaseTemplate.findMany({
    where: { isActive: true },
    orderBy: { createdAt: "desc" },
  });
};


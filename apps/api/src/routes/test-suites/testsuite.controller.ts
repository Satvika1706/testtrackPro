import { Request, Response } from "express";
import { prisma } from "../../prisma";

export const createTestSuite = async (req: Request, res: Response) => {
  try {
    const { name, description, module, parentSuiteId } = req.body;

    // 1️⃣ Basic validation
    if (!name) {
      return res.status(400).json({ message: "Suite name is required" });
    }

    // 2️⃣ Create suite
    const suite = await prisma.testSuite.create({
      data: {
        name,
        description,
        module,
        parentSuiteId: parentSuiteId || null,
      },
    });

    // 3️⃣ Send response
    return res.status(201).json({
      message: "Test suite created successfully",
      suite,
    });
  } catch (error) {
    console.error("Create suite error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};
export const getTestSuites = async (req: Request, res: Response) => {
  try {
    const suites = await prisma.testSuite.findMany({
      where: {
        isArchived: false,
        parentSuiteId: null, // top-level suites
      },
      include: {
        childSuites: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return res.json(suites);
  } catch (error) {
    console.error("Get suites error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};


export const addTestCaseToSuite = async (req: Request, res: Response) => {
  try {
    const { suiteId } = req.params;
    const { testCaseId, order } = req.body;

    // 1️⃣ Validation
    if (!testCaseId) {
      return res.status(400).json({ message: "testCaseId is required" });
    }

    // 2️⃣ Check suite exists
    const suite = await prisma.testSuite.findUnique({
      where: { id: suiteId },
    });

    if (!suite || suite.isArchived) {
      return res.status(404).json({ message: "Test suite not found" });
    }

    // 3️⃣ Prevent duplicate addition
    const existing = await prisma.testSuiteTestCase.findFirst({
      where: {
        testSuiteId: suiteId,
        testCaseId,
      },
    });

    if (existing) {
      return res
        .status(409)
        .json({ message: "Test case already in suite" });
    }

    // 4️⃣ Decide order
    let finalOrder = order;

    if (!finalOrder) {
      const last = await prisma.testSuiteTestCase.findFirst({
        where: { testSuiteId: suiteId },
        orderBy: { order: "desc" },
      });

      finalOrder = last ? last.order + 1 : 1;
    }
// Check test case exists
const testCase = await prisma.testCase.findUnique({
  where: { id: testCaseId },
});

if (!testCase) {
  return res.status(404).json({ message: "Test case not found" });
}

    // 5️⃣ Create relation
    const relation = await prisma.testSuiteTestCase.create({
      data: {
        testSuiteId: suiteId,
        testCaseId,
        order: finalOrder,
      },
    });

    return res.status(201).json({
      message: "Test case added to suite",
      relation,
    });
  } catch (error) {
    console.error("Add test case to suite error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};
export const getTestSuiteById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const suite = await prisma.testSuite.findUnique({
      where: { id },
      include: {
        testCases: {
          orderBy: { order: "asc" },
          include: {
            testCase: true,
          },
        },
      },
    });

    if (!suite || suite.isArchived) {
      return res.status(404).json({ message: "Test suite not found" });
    }

    return res.json(suite);
  } catch (error) {
    console.error("Get suite details error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};
export const removeTestCaseFromSuite = async (req: Request, res: Response) => {
  try {
    const { suiteId, testCaseId } = req.params;

    // Check relation exists
    const relation = await prisma.testSuiteTestCase.findFirst({
      where: {
        testSuiteId: suiteId,
        testCaseId,
      },
    });

    if (!relation) {
      return res.status(404).json({
        message: "Test case not found in this suite",
      });
    }

    // Delete relation
    await prisma.testSuiteTestCase.delete({
      where: { id: relation.id },
    });

    return res.json({
      message: "Test case removed from suite successfully",
    });
  } catch (error) {
    console.error("Remove test case error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};
export const reorderTestCasesInSuite = async (req: Request, res: Response) => {
  try {
    const { suiteId } = req.params;
    const { testCaseIds } = req.body;

    if (!Array.isArray(testCaseIds) || testCaseIds.length === 0) {
      return res.status(400).json({
        message: "testCaseIds array is required",
      });
    }

    // Check suite exists
    const suite = await prisma.testSuite.findUnique({
      where: { id: suiteId },
    });

    if (!suite || suite.isArchived) {
      return res.status(404).json({ message: "Test suite not found" });
    }

    // Update order sequentially
    for (let i = 0; i < testCaseIds.length; i++) {
      await prisma.testSuiteTestCase.updateMany({
        where: {
          testSuiteId: suiteId,
          testCaseId: testCaseIds[i],
        },
        data: {
          order: i + 1,
        },
      });
    }

    return res.json({
      message: "Test cases reordered successfully",
    });
  } catch (error) {
    console.error("Reorder error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};
export const cloneTestSuite = async (req: Request, res: Response) => {
  try {
    const { suiteId } = req.params;

    // 1️⃣ Check original suite exists
    const originalSuite = await prisma.testSuite.findUnique({
      where: { id: suiteId },
      include: {
        testCases: true,
      },
    });

    if (!originalSuite || originalSuite.isArchived) {
      return res.status(404).json({
        message: "Original suite not found",
      });
    }

    // 2️⃣ Create new suite
    const clonedSuite = await prisma.testSuite.create({
      data: {
        name: `${originalSuite.name} (Copy)`,
        description: originalSuite.description,
        module: originalSuite.module,
        parentSuiteId: originalSuite.parentSuiteId,
      },
    });

    // 3️⃣ Clone all test case relations
    const clonedRelations = originalSuite.testCases.map((relation) => ({
      testSuiteId: clonedSuite.id,
      testCaseId: relation.testCaseId,
      order: relation.order,
    }));

    if (clonedRelations.length > 0) {
      await prisma.testSuiteTestCase.createMany({
        data: clonedRelations,
      });
    }

    return res.status(201).json({
      message: "Test suite cloned successfully",
      suite: clonedSuite,
    });
  } catch (error) {
    console.error("Clone suite error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};
export const archiveTestSuite = async (req: Request, res: Response) => {
  try {
    const { suiteId } = req.params;

    const suite = await prisma.testSuite.findUnique({
      where: { id: suiteId },
    });

    if (!suite) {
      return res.status(404).json({ message: "Test suite not found" });
    }

    if (suite.isArchived) {
      return res.status(400).json({ message: "Suite already archived" });
    }

    await prisma.testSuite.update({
      where: { id: suiteId },
      data: { isArchived: true },
    });

    return res.json({
      message: "Test suite archived successfully",
    });
  } catch (error) {
    console.error("Archive suite error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};
export const restoreTestSuite = async (req: Request, res: Response) => {
  try {
    const { suiteId } = req.params;

    const suite = await prisma.testSuite.findUnique({
      where: { id: suiteId },
    });

    if (!suite) {
      return res.status(404).json({ message: "Test suite not found" });
    }

    if (!suite.isArchived) {
      return res.status(400).json({ message: "Suite is not archived" });
    }

    await prisma.testSuite.update({
      where: { id: suiteId },
      data: { isArchived: false },
    });

    return res.json({
      message: "Test suite restored successfully",
    });
  } catch (error) {
    console.error("Restore suite error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};


import { prisma } from "../../prisma";
import { Prisma } from "@prisma/client";

type ProjectConfig = Prisma.InputJsonValue;

export const ensureDefaultProject = async (createdById?: number) => {
  const project = await prisma.project.upsert({
    where: { key: "default" },
    update: {
      isArchived: false,
    },
    create: {
      key: "default",
      name: "Default Project",
      createdById,
      config: {},
    },
  });

  await prisma.$transaction([
    prisma.testCase.updateMany({
      where: { projectId: null },
      data: { projectId: project.id },
    }),
    prisma.testSuite.updateMany({
      where: { projectId: null },
      data: { projectId: project.id },
    }),
    prisma.testRun.updateMany({
      where: { projectId: null },
      data: { projectId: project.id },
    }),
    prisma.testCaseTemplate.updateMany({
      where: { projectId: null },
      data: { projectId: project.id },
    }),
    prisma.bug.updateMany({
      where: { projectId: null },
      data: { projectId: project.id },
    }),
  ]);

  return project;
};

export const getProjectById = async (projectId: string) => {
  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      isArchived: false,
    },
  });

  if (!project) {
    throw new Error("Project not found");
  }

  return project;
};

export const listProjects = async () => {
  const defaultProject = await ensureDefaultProject();
  let projects = await prisma.project.findMany({
    where: { isArchived: false },
    orderBy: { createdAt: "desc" },
  });

  if (!projects.length) {
    await prisma.project.update({
      where: { id: defaultProject.id },
      data: { isArchived: false },
    });
    projects = await prisma.project.findMany({
      where: { isArchived: false },
      orderBy: { createdAt: "desc" },
    });
  }

  return projects;
};

export const createProject = async (data: {
  key: string;
  name: string;
  description?: string;
  config?: ProjectConfig;
  createdById: number;
}) => {
  const existing = await prisma.project.findUnique({
    where: { key: data.key },
    select: { id: true },
  });
  if (existing) {
    throw new Error("Project key already exists");
  }

  return prisma.project.create({
    data: {
      key: data.key,
      name: data.name,
      description: data.description,
      config: (data.config ?? {}) as Prisma.InputJsonValue,
      createdById: data.createdById,
    },
  });
};

export const updateProject = async (
  projectId: string,
  data: {
    name?: string;
    description?: string | null;
    isArchived?: boolean;
    config?: ProjectConfig;
  }
) => {
  await getProjectById(projectId);

  const updateData: Prisma.ProjectUpdateInput = {
    ...(typeof data.name !== "undefined" ? { name: data.name } : {}),
    ...(typeof data.description !== "undefined" ? { description: data.description } : {}),
    ...(typeof data.isArchived !== "undefined" ? { isArchived: data.isArchived } : {}),
    ...(typeof data.config !== "undefined"
      ? { config: data.config as Prisma.InputJsonValue }
      : {}),
  };

  return prisma.project.update({
    where: { id: projectId },
    data: updateData,
  });
};

export const listCustomFields = async (
  projectId: string,
  entityType?: "TEST_CASE" | "TEST_SUITE" | "TEST_RUN" | "BUG"
) => {
  await getProjectById(projectId);

  return prisma.projectCustomField.findMany({
    where: {
      projectId,
      ...(entityType ? { entityType } : {}),
    },
    orderBy: { createdAt: "asc" },
  });
};

export const createCustomField = async (
  projectId: string,
  data: {
    entityType: "TEST_CASE" | "TEST_SUITE" | "TEST_RUN" | "BUG";
    name: string;
    fieldType: "TEXT" | "NUMBER" | "BOOLEAN" | "DATE" | "SELECT";
    required?: boolean;
    options?: unknown;
    defaultValue?: string;
  }
) => {
  await getProjectById(projectId);

  return prisma.projectCustomField.create({
    data: {
      projectId,
      entityType: data.entityType,
      name: data.name,
      fieldType: data.fieldType,
      required: Boolean(data.required),
      ...(typeof data.options !== "undefined"
        ? { options: data.options as Prisma.InputJsonValue }
        : {}),
      defaultValue: data.defaultValue,
    },
  });
};

export const listMilestones = async (
  projectId: string,
  status?: "PLANNED" | "ACTIVE" | "COMPLETED"
) => {
  await getProjectById(projectId);

  const milestones = await prisma.milestone.findMany({
    where: {
      projectId,
      ...(status ? { status } : {}),
    },
    include: {
      testRuns: {
        select: { id: true },
      },
      _count: {
        select: { testRuns: true },
      },
    },
    orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }],
  });

  const enriched = await Promise.all(
    milestones.map(async (milestone) => {
      const runIds = milestone.testRuns.map((run) => run.id);
      if (!runIds.length) {
        return {
          ...milestone,
          progress: {
            completed: 0,
            total: 0,
            percentage: 0,
          },
        };
      }

      const [total, completed] = await Promise.all([
        prisma.testRunItem.count({
          where: { testRunId: { in: runIds } },
        }),
        prisma.testRunItem.count({
          where: {
            testRunId: { in: runIds },
            status: { in: ["PASSED", "FAILED", "BLOCKED"] },
          },
        }),
      ]);

      return {
        ...milestone,
        progress: {
          completed,
          total,
          percentage: total > 0 ? Number(((completed / total) * 100).toFixed(2)) : 0,
        },
      };
    })
  );

  return enriched;
};

export const createMilestone = async (
  projectId: string,
  data: {
    name: string;
    description?: string;
    status?: "PLANNED" | "ACTIVE" | "COMPLETED";
    startDate?: string;
    targetDate?: string;
    dueDate?: string;
  }
) => {
  await getProjectById(projectId);

  return prisma.milestone.create({
    data: {
      projectId,
      name: data.name,
      description: data.description,
      status: data.status ?? "PLANNED",
      startDate: data.startDate ? new Date(data.startDate) : null,
      dueDate: data.targetDate
        ? new Date(data.targetDate)
        : data.dueDate
          ? new Date(data.dueDate)
          : null,
    },
  });
};

export const getProjectOverview = async (projectId: string) => {
  await getProjectById(projectId);

  const [testCasesCount, bugsCount, testRunsCount, milestonesCount] = await Promise.all([
    prisma.testCase.count({ where: { projectId, isDeleted: false } }),
    prisma.bug.count({ where: { projectId, status: { notIn: ["SOFT_DELETED", "REJECTED"] } } }),
    prisma.testRun.count({ where: { projectId } }),
    prisma.milestone.count({ where: { projectId } }),
  ]);

  return {
    testCasesCount,
    bugsCount,
    testRunsCount,
    milestonesCount,
  };
};

export const updateProjectConfig = async (
  projectId: string,
  config: Prisma.InputJsonValue
) => {
  await getProjectById(projectId);
  return prisma.project.update({
    where: { id: projectId },
    data: {
      config,
    },
  });
};

export const mapRunToMilestone = async (
  runId: string,
  milestoneId: string | null,
  projectId: string
) => {
  const run = await prisma.testRun.findUnique({
    where: { id: runId },
    select: { id: true, projectId: true },
  });

  if (!run) {
    throw new Error("Test run not found");
  }

  if (run.projectId !== projectId) {
    throw new Error("Test run does not belong to selected project");
  }

  if (!milestoneId) {
    return prisma.testRun.update({
      where: { id: runId },
      data: { milestoneId: null },
    });
  }

  const milestone = await prisma.milestone.findUnique({
    where: { id: milestoneId },
    select: { id: true, projectId: true },
  });

  if (!milestone) {
    throw new Error("Milestone not found");
  }

  if (milestone.projectId !== projectId) {
    throw new Error("Milestone does not belong to selected project");
  }

  return prisma.testRun.update({
    where: { id: runId },
    data: { milestoneId: milestone.id },
  });
};

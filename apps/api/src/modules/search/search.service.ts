import { BugStatus, Role } from "@prisma/client";
import { prisma } from "../../prisma";

type SearchResultItem = {
  entity: "BUG" | "TEST_CASE" | "TEST_RUN" | "TEST_SUITE";
  id: string;
  code?: string;
  title: string;
  subtitle?: string;
  route: string;
  updatedAt?: Date | string;
};

const sanitizeQuery = (q: string) => q.trim();

export const globalSearchService = async (
  q: string,
  userId: number,
  role: string,
  limit = 8
) => {
  const query = sanitizeQuery(q);
  if (!query) {
    return { total: 0, results: [] as SearchResultItem[] };
  }

  const safeLimit = Math.min(Math.max(limit, 1), 25);
  const canViewAllBugs = role === Role.ADMIN || role === Role.TRIAGE || role === Role.TESTER;
  const canViewTestCases = role === Role.TESTER;

  const bugWhere = canViewAllBugs
    ? {
        status: { notIn: [BugStatus.REJECTED, BugStatus.SOFT_DELETED] },
        OR: [
          { title: { contains: query, mode: "insensitive" as const } },
          { description: { contains: query, mode: "insensitive" as const } },
          { bugId: { contains: query, mode: "insensitive" as const } },
        ],
      }
    : {
        status: { notIn: [BugStatus.REJECTED, BugStatus.SOFT_DELETED] },
        OR: [{ assignedToId: userId }, { createdById: userId }],
        AND: [
          {
            OR: [
              { title: { contains: query, mode: "insensitive" as const } },
              { description: { contains: query, mode: "insensitive" as const } },
              { bugId: { contains: query, mode: "insensitive" as const } },
            ],
          },
        ],
      };

  const [bugs, testCases, testRuns, testSuites] = await Promise.all([
    prisma.bug.findMany({
      where: bugWhere,
      take: safeLimit,
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        bugId: true,
        title: true,
        status: true,
        updatedAt: true,
      },
    }),
    canViewTestCases
      ? prisma.testCase.findMany({
          where: {
            isDeleted: false,
            OR: [
              { title: { contains: query, mode: "insensitive" } },
              { description: { contains: query, mode: "insensitive" } },
              { module: { contains: query, mode: "insensitive" } },
            ],
          },
          take: safeLimit,
          orderBy: { updatedAt: "desc" },
          select: {
            id: true,
            title: true,
            module: true,
            updatedAt: true,
          },
        })
      : Promise.resolve([]),
    canViewTestCases
      ? prisma.testRun.findMany({
          where: {
            OR: [
              { name: { contains: query, mode: "insensitive" } },
              { description: { contains: query, mode: "insensitive" } },
            ],
          },
          take: safeLimit,
          orderBy: { updatedAt: "desc" },
          select: {
            id: true,
            name: true,
            status: true,
            updatedAt: true,
          },
        })
      : Promise.resolve([]),
    canViewTestCases
      ? prisma.testSuite.findMany({
          where: {
            OR: [
              { name: { contains: query, mode: "insensitive" } },
              { description: { contains: query, mode: "insensitive" } },
              { module: { contains: query, mode: "insensitive" } },
            ],
          },
          take: safeLimit,
          orderBy: { updatedAt: "desc" },
          select: {
            id: true,
            name: true,
            module: true,
            updatedAt: true,
          },
        })
      : Promise.resolve([]),
  ]);

  const results: SearchResultItem[] = [
    ...bugs.map((bug) => ({
      entity: "BUG" as const,
      id: bug.id,
      code: bug.bugId,
      title: bug.title,
      subtitle: bug.status,
      route: `/bugs/${bug.id}`,
      updatedAt: bug.updatedAt,
    })),
    ...testCases.map((tc) => ({
      entity: "TEST_CASE" as const,
      id: tc.id,
      title: tc.title,
      subtitle: tc.module,
      route: `/test-case/edit/${tc.id}`,
      updatedAt: tc.updatedAt,
    })),
    ...testRuns.map((run) => ({
      entity: "TEST_RUN" as const,
      id: run.id,
      title: run.name,
      subtitle: run.status,
      route: `/test-runs/${run.id}`,
      updatedAt: run.updatedAt,
    })),
    ...testSuites.map((suite) => ({
      entity: "TEST_SUITE" as const,
      id: suite.id,
      title: suite.name,
      subtitle: suite.module || "General",
      route: `/test-suites/${suite.id}`,
      updatedAt: suite.updatedAt,
    })),
  ].sort((a, b) => {
    const aTime = new Date(a.updatedAt || 0).getTime();
    const bTime = new Date(b.updatedAt || 0).getTime();
    return bTime - aTime;
  });

  return {
    total: results.length,
    results: results.slice(0, safeLimit * 3),
  };
};

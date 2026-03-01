import { Router } from "express";
import bcrypt from "bcrypt";
import { Role } from "@prisma/client";
import { prisma } from "../../prisma";
import { requireAuth } from "../../middleware/auth.middleware";
import { authorizeRoles } from "../../middleware/role.middleware";

const router = Router();

const ADMIN_ONLY = [Role.ADMIN];
const DEACTIVATED_LOCK_YEAR = 2999;

router.use(requireAuth, authorizeRoles(ADMIN_ONLY));

const roleValues = Object.values(Role);

const toPublicUser = (user: {
  id: number;
  email: string;
  role: Role;
  createdAt: Date;
  updatedAt: Date;
  isEmailVerified: boolean;
  failedLoginAttempts: number;
  lockUntil: Date | null;
}) => ({
  id: user.id,
  email: user.email,
  role: user.role,
  isEmailVerified: user.isEmailVerified,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
  isDeactivated: Boolean(user.lockUntil && user.lockUntil.getFullYear() >= DEACTIVATED_LOCK_YEAR),
});

router.get("/users", async (req, res) => {
  try {
    const search = typeof req.query.search === "string" ? req.query.search.trim() : "";
    const role = typeof req.query.role === "string" ? req.query.role : "";
    const isDeactivated = typeof req.query.isDeactivated === "string" ? req.query.isDeactivated : "";

    const users = await prisma.user.findMany({
      where: {
        ...(search
          ? {
              email: {
                contains: search,
                mode: "insensitive",
              },
            }
          : {}),
        ...(role && roleValues.includes(role as Role) ? { role: role as Role } : {}),
      },
      select: {
        id: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true,
        isEmailVerified: true,
        failedLoginAttempts: true,
        lockUntil: true,
      },
      orderBy: { createdAt: "desc" },
    });

    const mapped = users.map(toPublicUser).filter((user) => {
      if (isDeactivated === "true") return user.isDeactivated;
      if (isDeactivated === "false") return !user.isDeactivated;
      return true;
    });

    return res.json(mapped);
  } catch (error: any) {
    return res.status(500).json({ message: error?.message ?? "Failed to fetch users" });
  }
});

router.post("/users", async (req, res) => {
  try {
    const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
    const password = typeof req.body?.password === "string" ? req.body.password : "";
    const role = typeof req.body?.role === "string" ? req.body.role : Role.TESTER;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    if (!roleValues.includes(role as Role)) {
      return res.status(400).json({ message: "Invalid role" });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(409).json({ message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const created = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        role: role as Role,
        isEmailVerified: true,
      },
      select: {
        id: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true,
        isEmailVerified: true,
        failedLoginAttempts: true,
        lockUntil: true,
      },
    });

    return res.status(201).json(toPublicUser(created));
  } catch (error: any) {
    return res.status(500).json({ message: error?.message ?? "Failed to create user" });
  }
});

router.patch("/users/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      return res.status(400).json({ message: "Invalid user id" });
    }

    const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : undefined;
    const role = typeof req.body?.role === "string" ? req.body.role : undefined;
    const isEmailVerified =
      typeof req.body?.isEmailVerified === "boolean" ? req.body.isEmailVerified : undefined;
    const isDeactivated =
      typeof req.body?.isDeactivated === "boolean" ? req.body.isDeactivated : undefined;

    if (role && !roleValues.includes(role as Role)) {
      return res.status(400).json({ message: "Invalid role" });
    }

    const data: any = {};
    if (email) data.email = email;
    if (role) data.role = role as Role;
    if (typeof isEmailVerified === "boolean") data.isEmailVerified = isEmailVerified;
    if (typeof isDeactivated === "boolean") {
      if (isDeactivated) {
        data.lockUntil = new Date(`${DEACTIVATED_LOCK_YEAR}-01-01T00:00:00.000Z`);
        data.failedLoginAttempts = 5;
      } else {
        data.lockUntil = null;
        data.failedLoginAttempts = 0;
      }
    }

    const updated = await prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true,
        isEmailVerified: true,
        failedLoginAttempts: true,
        lockUntil: true,
      },
    });

    return res.json(toPublicUser(updated));
  } catch (error: any) {
    return res.status(500).json({ message: error?.message ?? "Failed to update user" });
  }
});

router.patch("/users/:id/role", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const role = typeof req.body?.role === "string" ? req.body.role : "";

    if (!Number.isFinite(id) || !roleValues.includes(role as Role)) {
      return res.status(400).json({ message: "Invalid payload" });
    }

    const updated = await prisma.user.update({
      where: { id },
      data: { role: role as Role },
      select: {
        id: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true,
        isEmailVerified: true,
        failedLoginAttempts: true,
        lockUntil: true,
      },
    });

    return res.json(toPublicUser(updated));
  } catch (error: any) {
    return res.status(500).json({ message: error?.message ?? "Failed to update role" });
  }
});

router.patch("/users/:id/deactivation", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const isDeactivated =
      typeof req.body?.isDeactivated === "boolean" ? req.body.isDeactivated : null;

    if (!Number.isFinite(id) || isDeactivated === null) {
      return res.status(400).json({ message: "Invalid payload" });
    }

    const updated = await prisma.user.update({
      where: { id },
      data: isDeactivated
        ? {
            lockUntil: new Date(`${DEACTIVATED_LOCK_YEAR}-01-01T00:00:00.000Z`),
            failedLoginAttempts: 5,
          }
        : {
            lockUntil: null,
            failedLoginAttempts: 0,
          },
      select: {
        id: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true,
        isEmailVerified: true,
        failedLoginAttempts: true,
        lockUntil: true,
      },
    });

    return res.json(toPublicUser(updated));
  } catch (error: any) {
    return res.status(500).json({ message: error?.message ?? "Failed to change activation state" });
  }
});

router.get("/roles", async (_req, res) => {
  try {
    const counts = await prisma.user.groupBy({
      by: ["role"],
      _count: { _all: true },
    });

    const countMap = new Map(counts.map((item) => [item.role, item._count._all]));
    const roles = roleValues.map((role) => ({
      role,
      userCount: countMap.get(role) ?? 0,
      description:
        role === Role.ADMIN
          ? "Full administrative access."
          : role === Role.TESTER
          ? "Owns test creation, runs, and execution."
          : role === Role.DEVELOPER
          ? "Fixes and updates bugs."
          : "Handles bug triage and prioritization.",
    }));

    return res.json({ roles });
  } catch (error: any) {
    return res.status(500).json({ message: error?.message ?? "Failed to fetch roles" });
  }
});

export default router;

import { Router } from "express";
import bcrypt from "bcrypt";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import { prisma } from "../prisma";
import { sendVerificationEmail } from "./sendEmail";
import { AuthRequest, requireAuth } from "../middleware/auth.middleware";

const router = Router();

const SELF_REGISTRATION_ROLES = ["TESTER", "DEVELOPER", "TRIAGE"] as const;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ACCESS_TOKEN_TTL_SECONDS = 15 * 60;
const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function isStrongPassword(password: string): boolean {
  const strongRegex =
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
  return strongRegex.test(password);
}

function isValidEmail(email: string): boolean {
  return EMAIL_REGEX.test(email);
}

function shouldExposeDevTokens(): boolean {
  return process.env.NODE_ENV !== "production";
}

function buildFrontendVerifyUrl(token: string): string {
  const frontendUrl = process.env.FRONTEND_URL ?? "http://localhost:5173";
  return `${frontendUrl}/verify-email?token=${encodeURIComponent(token)}`;
}

function assertJwtSecret() {
  if (!process.env.JWT_SECRET) {
    throw new Error("Missing JWT_SECRET in environment");
  }
  return process.env.JWT_SECRET;
}

function signAccessToken(user: {
  id: number;
  email: string;
  role: string;
}) {
  const secret = assertJwtSecret();
  return jwt.sign(
    {
      userId: user.id,
      email: user.email,
      role: user.role,
    },
    secret,
    { expiresIn: ACCESS_TOKEN_TTL_SECONDS }
  );
}

async function createRefreshTokenSession(userId: number) {
  const refreshToken = crypto.randomBytes(48).toString("hex");
  await prisma.refreshToken.create({
    data: {
      token: refreshToken,
      userId,
      revoked: false,
    },
  });
  return refreshToken;
}

function isRefreshTokenExpired(createdAt: Date) {
  return Date.now() - createdAt.getTime() > REFRESH_TOKEN_TTL_MS;
}

router.post("/register", async (req, res) => {
  try {
    const rawUsername = typeof req.body?.username === "string" ? req.body.username : "";
    const username = rawUsername.trim();
    const rawEmail = typeof req.body?.email === "string" ? req.body.email : "";
    const email = rawEmail.trim().toLowerCase();
    const password = typeof req.body?.password === "string" ? req.body.password : "";
    const role = typeof req.body?.role === "string" ? req.body.role : "TESTER";

    if (!username || !email || !password) {
      return res.status(400).json({ message: "Username, email and password are required" });
    }

    if (username.length < 3) {
      return res.status(400).json({ message: "Username must be at least 3 characters" });
    }

    if (!isValidEmail(email)) {
      return res.status(400).json({ message: "Please provide a valid email address" });
    }

    if (!isStrongPassword(password)) {
      return res.status(400).json({
        message:
          "Password must be 8+ characters with uppercase, lowercase, number and special character",
      });
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(409).json({ message: "User already exists" });
    }

    const existingUsername = await prisma.user.findFirst({ where: { username } });
    if (existingUsername) {
      return res.status(409).json({ message: "Username is already taken" });
    }

    const selectedRole = SELF_REGISTRATION_ROLES.includes(
      role as (typeof SELF_REGISTRATION_ROLES)[number]
    )
      ? (role as (typeof SELF_REGISTRATION_ROLES)[number])
      : "TESTER";
    const hashedPassword = await bcrypt.hash(password, 10);
    const verificationToken = crypto.randomBytes(32).toString("hex");

    const user = await prisma.user.create({
      data: {
        username,
        email,
        password: hashedPassword,
        role: selectedRole,
        verificationToken,
        isEmailVerified: false,
        failedLoginAttempts: 0,
      },
    });

    let emailDispatch: "sent" | "failed" = "sent";
    let emailDispatchError: string | null = null;

    try {
      await sendVerificationEmail(user.email, verificationToken);
    } catch (error) {
      emailDispatch = "failed";
      emailDispatchError = "Verification email could not be sent at this time";
      console.error("Verification email dispatch error:", error);
    }

    const response: Record<string, unknown> = {
      message:
        emailDispatch === "sent"
          ? "User registered successfully. Please verify your email before logging in."
          : "User registered successfully. Verification email is temporarily unavailable.",
      emailDispatch,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
      },
    };

    if (emailDispatchError) {
      response.emailDispatchError = emailDispatchError;
    }

    if (shouldExposeDevTokens()) {
      response.verificationToken = verificationToken;
      response.verificationUrl = buildFrontendVerifyUrl(verificationToken);
    }

    return res.status(201).json(response);
  } catch (error) {
    console.error("Register error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

router.get("/verify-email", async (req, res) => {
  try {
    const token = typeof req.query.token === "string" ? req.query.token.trim() : "";
    if (!token) {
      return res.status(400).json({ message: "Invalid token" });
    }

    const user = await prisma.user.findFirst({ where: { verificationToken: token } });
    if (!user) {
      return res.json({ message: "Email already verified or verification link expired" });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        isEmailVerified: true,
        verificationToken: null,
      },
    });

    return res.json({ message: "Email verified successfully" });
  } catch (error) {
    console.error("Verify email error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

router.post("/login", async (req, res) => {
  try {
    const rawEmail = typeof req.body?.email === "string" ? req.body.email : "";
    const email = rawEmail.trim().toLowerCase();
    const password = typeof req.body?.password === "string" ? req.body.password : "";

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password required" });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    if (user.lockUntil && user.lockUntil > new Date()) {
      return res.status(403).json({
        message: "Account locked. Try again after 15 minutes.",
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      const attempts = user.failedLoginAttempts + 1;

      if (attempts >= 5) {
        await prisma.user.update({
          where: { id: user.id },
          data: {
            failedLoginAttempts: attempts,
            lockUntil: new Date(Date.now() + 15 * 60 * 1000),
          },
        });

        return res.status(403).json({
          message:
            "Account locked due to multiple failed attempts. Try again after 15 minutes.",
        });
      }

      await prisma.user.update({
        where: { id: user.id },
        data: { failedLoginAttempts: attempts },
      });

      return res.status(401).json({ message: "Invalid credentials" });
    }

    if (!user.isEmailVerified) {
      return res.status(403).json({
        message: "Please verify your email before logging in",
      });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginAttempts: 0,
        lockUntil: null,
      },
    });

    const token = signAccessToken(user);
    const refreshToken = await createRefreshTokenSession(user.id);

    return res.json({
      message: "Login successful",
      token,
      accessToken: token,
      refreshToken,
      accessTokenExpiresIn: ACCESS_TOKEN_TTL_SECONDS,
      refreshTokenExpiresIn: Math.floor(REFRESH_TOKEN_TTL_MS / 1000),
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

router.post("/refresh", async (req, res) => {
  try {
    const refreshToken = typeof req.body?.refreshToken === "string" ? req.body.refreshToken.trim() : "";
    if (!refreshToken) {
      return res.status(400).json({ message: "refreshToken is required" });
    }

    const session = await prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: { user: true },
    });

    if (!session || session.revoked || isRefreshTokenExpired(session.createdAt)) {
      if (session && !session.revoked) {
        await prisma.refreshToken.update({
          where: { id: session.id },
          data: { revoked: true },
        });
      }
      return res.status(401).json({ message: "Invalid or expired refresh token" });
    }

    if (!session.user.isEmailVerified) {
      return res.status(403).json({ message: "Email is not verified" });
    }

    const nextRefreshToken = crypto.randomBytes(48).toString("hex");
    await prisma.$transaction([
      prisma.refreshToken.update({
        where: { id: session.id },
        data: { revoked: true },
      }),
      prisma.refreshToken.create({
        data: {
          token: nextRefreshToken,
          userId: session.userId,
          revoked: false,
        },
      }),
    ]);

    const nextAccessToken = signAccessToken(session.user);
    return res.json({
      message: "Token refreshed",
      token: nextAccessToken,
      accessToken: nextAccessToken,
      refreshToken: nextRefreshToken,
      accessTokenExpiresIn: ACCESS_TOKEN_TTL_SECONDS,
      refreshTokenExpiresIn: Math.floor(REFRESH_TOKEN_TTL_MS / 1000),
    });
  } catch (error) {
    console.error("Refresh token error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

router.post("/logout", async (req, res) => {
  try {
    const refreshToken = typeof req.body?.refreshToken === "string" ? req.body.refreshToken.trim() : "";
    if (!refreshToken) {
      return res.status(400).json({ message: "refreshToken is required" });
    }

    await prisma.refreshToken.updateMany({
      where: {
        token: refreshToken,
        revoked: false,
      },
      data: {
        revoked: true,
      },
    });

    return res.json({ message: "Logged out successfully" });
  } catch (error) {
    console.error("Logout error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

router.post("/logout-all", requireAuth, async (req: AuthRequest, res) => {
  try {
    await prisma.refreshToken.updateMany({
      where: {
        userId: req.user!.userId,
        revoked: false,
      },
      data: {
        revoked: true,
      },
    });
    return res.json({ message: "Logged out from all devices" });
  } catch (error) {
    console.error("Logout-all error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

router.post("/forgot-password", async (req, res) => {
  try {
    const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.json({
        message: "If the email exists, a reset link has been sent.",
      });
    }

    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetExpiry = new Date(Date.now() + 60 * 60 * 1000);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordResetToken: resetToken,
        passwordResetExpiry: resetExpiry,
      },
    });

    const response: Record<string, unknown> = {
      message: "If the email exists, a reset link has been sent.",
    };

    if (shouldExposeDevTokens()) {
      response.resetToken = resetToken;
    }

    return res.json(response);
  } catch (error) {
    console.error("Forgot password error:", error);
    return res.status(500).json({ message: "Server error" });
  }
});

router.post("/reset-password", async (req, res) => {
  try {
    const token = typeof req.body?.token === "string" ? req.body.token.trim() : "";
    const newPassword = typeof req.body?.newPassword === "string" ? req.body.newPassword : "";

    if (!token || !newPassword) {
      return res.status(400).json({ message: "Token and new password required" });
    }

    const user = await prisma.user.findFirst({
      where: {
        passwordResetToken: token,
        passwordResetExpiry: { gt: new Date() },
      },
    });

    if (!user) {
      return res.status(400).json({ message: "Invalid or expired reset token" });
    }

    if (!isStrongPassword(newPassword)) {
      return res.status(400).json({
        message:
          "Password must be 8+ characters with uppercase, lowercase, number and special character",
      });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: {
          password: hashedPassword,
          passwordResetToken: null,
          passwordResetExpiry: null,
        },
      }),
      prisma.refreshToken.updateMany({
        where: {
          userId: user.id,
          revoked: false,
        },
        data: { revoked: true },
      }),
    ]);

    return res.json({ message: "Password reset successful" });
  } catch (error) {
    console.error("Reset password error:", error);
    return res.status(500).json({ message: "Server error" });
  }
});

export default router;

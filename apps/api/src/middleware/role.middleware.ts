import { Response, NextFunction } from "express";
import { AuthRequest } from "./auth.middleware";

export const authorizeRoles = (roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        message: "Access denied",
        error: {
          code: "FORBIDDEN",
          message: "Access denied",
          requiredRoles: roles,
          userRole: req.user.role,
        },
      });
    }

    next();
  };
};

export const requireRole = authorizeRoles;

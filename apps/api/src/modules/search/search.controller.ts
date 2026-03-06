import { Response } from "express";
import { AuthRequest } from "../../middleware/auth.middleware";
import { globalSearchService } from "./search.service";

export const globalSearch = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const q = typeof req.query.q === "string" ? req.query.q : "";
    const limitParam = Number(req.query.limit ?? 10);

    const result = await globalSearchService(q, req.user.userId, req.user.role, limitParam);
    return res.status(200).json(result);
  } catch (error: any) {
    return res.status(400).json({
      message: error.message || "Global search failed",
    });
  }
};

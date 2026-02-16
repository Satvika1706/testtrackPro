import { Response } from "express";
import { AuthRequest } from "../../middleware/auth.middleware";
import { updateExecutionStepSchema } from "./execution.schema";
import * as executionService from "./execution.service";

export const updateExecutionStep = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const stepId = req.params.id;

    const parsedData = updateExecutionStepSchema.parse(req.body);

    const updatedStep = await executionService.updateExecutionStep(
      stepId,
      parsedData
    );

    return res.status(200).json({
      message: "Step updated successfully",
      data: updatedStep
    });

  } catch (error: any) {
    return res.status(400).json({
      message: error.message
    });
  }
};

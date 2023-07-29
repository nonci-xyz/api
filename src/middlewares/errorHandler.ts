import type { Request, Response } from "express";
import logger from "./logger";

export const errorHandler = (
  err: Error,
  _req: Request,
  res: Response,
): void => {
  logger.error(err.message);
  res.status(500).json({ message: err.message.toString() });
};

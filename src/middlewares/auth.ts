import type { NextFunction, Request, Response } from "express";
import config from "config";

export const authHandler = (
  req: Request,
  _res: Response,
  next: NextFunction,
) => {
  if (req.headers.authorization?.split(" ")[1] === config.secret) {
    return next();
  } else {
    return new Error("Unauthorized to use the route");
  }
};

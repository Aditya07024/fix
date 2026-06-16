import { Request, Response, NextFunction } from "express";
import { AppError, handleError } from "../utils/errors.js";
import { ApiResponse } from "../types.js";

export const errorHandler = (
  error: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const { statusCode, message } = handleError(error);

  const response: ApiResponse<null> = {
    success: false,
    error: message,
  };

  res.status(statusCode).json(response);
};

export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

export const notFoundHandler = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  res.redirect("/");
};

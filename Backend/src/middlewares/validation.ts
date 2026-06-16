import { Request, Response, NextFunction } from "express";
import { ZodSchema } from "zod";
import { ValidationError } from "../utils/errors.js";

export const validateRequest = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = schema.parse(req.body);
      req.body = validated;
      next();
    } catch (error: any) {
      const errorMessage = error.errors?.[0]?.message || "Validation failed";
      const firstError = error.errors?.[0];

      console.error("Request validation error:", {
        path: req.path,
        method: req.method,
        body: req.body,
        error: errorMessage,
        field: firstError?.path?.join(".") || "unknown",
        details: error.errors,
      });

      // Include the field path in the error message for better debugging
      const fieldPath = firstError?.path?.join(".") || "";
      const fullMessage = fieldPath
        ? `${fieldPath}: ${errorMessage}`
        : errorMessage;
      next(new ValidationError(fullMessage));
    }
  };
};

export const validateQuery = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = schema.parse(req.query);
      req.query = validated as any;
      next();
    } catch (error: any) {
      next(
        new ValidationError(
          error.errors[0]?.message || "Query validation failed",
        ),
      );
    }
  };
};

export const validateParams = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = schema.parse(req.params);
      req.params = validated as any;
      next();
    } catch (error: any) {
      next(
        new ValidationError(
          error.errors[0]?.message || "Params validation failed",
        ),
      );
    }
  };
};

/**
 * Node modules
 */
import { ZodTypeAny } from "zod";
import { NextFunction, Request, Response } from "express";

export const validate =
  (schema: ZodTypeAny) =>
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = schema.parse({
        body: req.body,
        query: req.query,
        params: req.params,
      });

      // Attach the validated and transformed data to our custom 'validated' property on the request object.
      req.validated = result as {
        body?: any;
        query?: any;
        params?: any;
      };

      next();
    } catch (error) {
      next(error);
    }
  };

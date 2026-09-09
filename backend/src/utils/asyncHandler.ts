import { NextFunction, Request, RequestHandler, Response } from "express";

type AsyncHandler<T extends Request> = (
  req: T,
  res: Response,
  next: NextFunction
) => Promise<void>;

export function asyncHandler<T extends Request = Request>(
  handler: AsyncHandler<T>
): RequestHandler {
  return (req, res, next) => {
    handler(req as T, res, next).catch(next);
  };
}
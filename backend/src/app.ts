import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { ErrorRequestHandler } from "express";
import multer from "multer";
import { ZodError } from "zod";
import { AppError } from "./utils/AppError";
import { env } from "./config/env";
import apiRoutes from "./routes";

const app = express();

app.use(
  cors({
    origin: env.frontendUrl,
    credentials: true,
  })
);

app.use(express.json());
app.use(cookieParser());

app.use(apiRoutes);

app.use("/", (_req, res) => {
  res.json({ name: "MailSender API", status: "running" });
});

const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof ZodError) {
    res.status(400).json({ message: "Invalid input", errors: err.flatten() });
    return;
  }

  if (err instanceof multer.MulterError) {
    const message =
      err.code === "LIMIT_FILE_SIZE" ? "File is too large (max 5 MB)" : err.message;
    res.status(400).json({ message });
    return;
  }

  if (err instanceof Error && err.message === "Only CSV files are allowed") {
    res.status(400).json({ message: err.message });
    return;
  }

  if (err instanceof AppError) {
    res.status(err.statusCode).json({ message: err.message });
    return;
  }

  console.error(err);
  res.status(500).json({ message: "Internal server error" });
};

app.use(errorHandler);

export default app;
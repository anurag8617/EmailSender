import multer from "multer";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

export const csvUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (_req, file, cb) => {
    const allowedMime = file.mimetype === "text/csv" || file.mimetype === "application/csv";
    const allowedExt = /\.(csv|tsv)$/i.test(file.originalname);
    if (allowedMime || allowedExt) {
      cb(null, true);
    } else {
      cb(new Error("Only CSV files are allowed"));
    }
  },
});
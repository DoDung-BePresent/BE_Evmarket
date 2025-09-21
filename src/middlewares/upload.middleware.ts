/**
 * Node modules
 */
import multer from "multer";
import { Request } from "express";

/**
 * Libs
 */
import { BadRequestError } from "@/libs/error";

const storage = multer.memoryStorage();

const fileFilter = (
  req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback,
) => {
  if (file.mimetype.startsWith("image/")) {
    cb(null, true);
  } else {
    cb(new BadRequestError("Only image files are allowed!"));
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 1024 * 1024 * 5, // 5 MB limit per file
  },
});

export const uploadImages = upload.array("images", 5);

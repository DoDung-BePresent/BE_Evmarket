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

/**
 * Upload image for vehicle and battery
 */
export const uploadImages = multer({
  storage: storage,
  fileFilter: (
    req: Request,
    file: Express.Multer.File,
    cb: multer.FileFilterCallback,
  ) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new BadRequestError("Only image files are allowed!"));
    }
  },
  limits: {
    fileSize: 1024 * 1024 * 5, // 5 MB limit per file
  },
}).array("images", 5); //TODO: array khac gi limits:5

/**
 * Upload images and medias for review
 */
export const uploadReviewMedia = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (file.fieldname === "images" && file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else if (
      file.fieldname === "video" &&
      file.mimetype.startsWith("video/")
    ) {
      cb(null, true);
    } else {
      cb(new BadRequestError("Invalid file type for review media"));
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB for images
    files: 6, // 5 images + 1 video
  },
}).fields([
  { name: "images", maxCount: 5 },
  { name: "video", maxCount: 1 },
]);

/**
 * Upload images for dispute
 */
export const uploadDisputeImages = multer({
  storage: storage,
  fileFilter: (
    req: Request,
    file: Express.Multer.File,
    cb: multer.FileFilterCallback,
  ) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new BadRequestError("Only image files are allowed for disputes!"));
    }
  },
  limits: {
    fileSize: 1024 * 1024 * 5, // 5 MB limit per file
  },
}).array("images", 5);

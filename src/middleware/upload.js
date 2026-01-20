import multer from "multer";

export const upload = multer({
  storage: multer.memoryStorage(), // REQUIRED for Cloudinary
  limits: {
    fileSize: 2 * 1024 * 1024 * 1024 // 2 GB
  }
});



// fileSize: 2 * 1024 * 1024 * 1024 // 2 GB
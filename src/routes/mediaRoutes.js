import express from "express";
import { upload } from "../middleware/upload.js";
import {
  authenticate,
  requireUploader,
  requireAdmin
} from "../middleware/auth.js";

import {
  uploadMedia,
  getMedia,
  downloadMedia,
  approveMedia,
  deleteMedia
} from "../controllers/mediaController.js";

const router = express.Router();

/* ===============================
   GET APPROVED MEDIA (PUBLIC)
================================ */
router.get("/", getMedia);

/* ===============================
   UPLOAD MEDIA (RESEARCHER + ADMIN)
================================ */
router.post(
  "/upload",
  authenticate,
  requireUploader,
  upload.single("file"),
  uploadMedia
);

/* Download (force attachment) */
router.get("/:id/download", downloadMedia);

/* ===============================
   APPROVE MEDIA (ADMIN ONLY)
================================ */
router.post(
  "/:id/approve",
  authenticate,
  requireAdmin,
  approveMedia
);

/* ===============================
   DELETE MEDIA (ADMIN ONLY)
================================ */
router.delete(
  "/:id",
  authenticate,
  requireAdmin,
  deleteMedia
);

export default router;

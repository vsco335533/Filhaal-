import express from "express";
import { authenticate, requireAdmin } from "../middleware/auth.js";
import { submitContact, getContacts } from "../controllers/contactController.js";

const router = express.Router();

// Public: submit contact form
router.post("/", submitContact);

// Admin: list submissions
router.get("/", authenticate, requireAdmin, getContacts);

export default router;

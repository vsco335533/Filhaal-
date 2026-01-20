import express from 'express';
import { body } from 'express-validator';
import {
  getAllCategories,
  createCategory,
  getAllTags,
  createTag
} from '../controllers/categoryController.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import { validate } from '../middleware/validation.js';

const router = express.Router();

router.get('/categories', getAllCategories);
router.post(
  '/categories',
  authenticate,
  requireAdmin,
  [body('name').trim().notEmpty(), validate],
  createCategory
);

router.get('/tags', getAllTags);
router.post(
  '/tags',
  authenticate,
  [body('name').trim().notEmpty(), validate],
  createTag
);

export default router;

import express from 'express';
import { body } from 'express-validator';
import { getAllImageCategories, createImageCategory } from '../controllers/imageCategoryController.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import { validate } from '../middleware/validation.js';

const router = express.Router();

router.get('/image-categories', getAllImageCategories);
router.post('/image-categories', authenticate, requireAdmin, [body('name').trim().notEmpty(), validate], createImageCategory);

export default router;

import express from 'express';
import { body } from 'express-validator';
import {
  getAllPosts,
  getPostBySlug,
  createPost,
  updatePost,
  deletePost,
  approvePost,
  rejectPost
} from '../controllers/postController.js';
import { authenticate, requireResearcher, requireAdmin } from '../middleware/auth.js';
import { validate } from '../middleware/validation.js';

const router = express.Router();

router.get('/', getAllPosts);
router.get('/:slug', getPostBySlug);

router.post(
  '/',
  authenticate,
  requireResearcher,
  [
    body('title').trim().notEmpty(),
    body('content').trim().notEmpty(),
    body('type').isIn(['research', 'field_study', 'opinion']),
    validate
  ],
  createPost
);

router.put('/:id', authenticate, requireResearcher, updatePost);
router.delete('/:id', authenticate, requireResearcher, deletePost);
// router.put("/:id/remove-pdf", authenticate, removePostPdf);

router.post('/:id/approve', authenticate, requireAdmin, approvePost);
router.post('/:id/reject', authenticate, requireAdmin, rejectPost);

export default router;

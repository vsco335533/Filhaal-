import express from 'express';
import { body } from 'express-validator';
import { register, login, getProfile, getMe } from '../controllers/authController.js';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validation.js';

const router = express.Router();

router.post(
  '/register',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 6 }),
    body('full_name').trim().notEmpty(),
    validate,
  ],
  register
);

router.post(
  '/login',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').notEmpty(),
    validate,
  ],
  login
);

// used by frontend on reload to keep session
router.get('/me', authenticate, getMe);

// optional, richer profile
router.get('/profile', authenticate, getProfile);

export default router;

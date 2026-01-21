import express from 'express';
import multer from 'multer';
import { authenticate } from '../middleware/auth.js';
import {
  uploadIssue,
  getIssuesByYearMonth,
  getIssueById,
  getYearsWithIssues,
  updateIssueMeta,
  deleteIssue,
  getPdfFile,
  getPdfFileById
} from '../controllers/issueController.js';

const router = express.Router();

// Configure multer for file upload
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'), false);
    }
  }
});

// Get all years that have issues (public)
router.get('/years', getYearsWithIssues);

// Get issues by year and/or month (public)
router.get('/content', getIssuesByYearMonth);

// Get PDF file (public) - More specific route
router.get('/pdf/:publicId', getPdfFile);

// Get PDF file by issue ID (for iframe display)
router.get('/pdf-proxy/:issueId', getPdfFileById);

// Upload new issue (admin only)
router.post('/upload', authenticate, upload.single('pdf'), uploadIssue);

// Get single issue (public)
// router.get('/:id', getIssueById);
router.get('/:id([0-9a-fA-F-]{36})', getIssueById);

// Update issue metadata (admin only)
router.put('/:id', authenticate, updateIssueMeta);

// Delete issue (admin only)
router.delete('/:id', authenticate, deleteIssue);

export default router;

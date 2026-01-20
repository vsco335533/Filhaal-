-- Fix the PDF records: restore .pdf extension and correct URLs
-- The issue_2026_1_1768805134005.pdf is stored in Cloudinary at:
-- URL: https://res.cloudinary.com/dn2kulcr4/raw/upload/v1768805133/issues/issue_2026_1_1768805134005.pdf

UPDATE issues
SET 
  pdf_public_id = 'issues/issue_2026_1_1768805134005.pdf',
  pdf_url = 'https://res.cloudinary.com/dn2kulcr4/raw/upload/v1768805133/issues/issue_2026_1_1768805134005.pdf'
WHERE pdf_public_id = 'issues/issue_2026_1_1768805134005';


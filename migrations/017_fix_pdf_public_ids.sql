-- Fix pdf_public_id by removing .pdf extension from existing records
UPDATE issues
SET pdf_public_id = REPLACE(pdf_public_id, '.pdf', '')
WHERE pdf_public_id LIKE '%.pdf';

SELECT 'Fixed ' || count(*) || ' issue records with .pdf extension removed' as result FROM issues WHERE pdf_public_id NOT LIKE '%.pdf';

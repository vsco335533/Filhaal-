-- Migration: set media.type = 'document' where the URL suggests a PDF
UPDATE media
SET type = 'document'
WHERE (url ILIKE '%.pdf' OR url ILIKE '%/pdf%')
  AND type <> 'document';

-- Also update thumbnail_url to null for documents where thumbnail is same as url
UPDATE media
SET thumbnail_url = NULL
WHERE type = 'document' AND thumbnail_url = url;

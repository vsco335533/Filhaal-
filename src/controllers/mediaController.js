import cloudinary from "../config/cloudinary.js";
import { query } from "../config/database.js";
import { pipeline } from "stream/promises";

/* =====================================================
   UPLOAD MEDIA (IMAGE / PDF)
   POST /api/media/upload
===================================================== */
export const uploadMedia = async (req, res) => {
  try {
      const { title, post_id = null, youtube_url, description = null, image_category_id = null } = req.body;

      // Keep both possible category fields separate:
      const category_id = req.body.category_id ?? null; // legacy post category
      const img_category_id = image_category_id ?? null; // image category (image_categories.id)

      // DEBUG: surface helpful request info to server logs for diagnosing upload failures
      try {
        console.debug('Upload request:', {
          user: req.user && { id: req.user.id, role: req.user.role },
          body: { title, post_id, youtube_url, description, image_category_id },
          hasFile: !!req.file,
        });
      } catch (e) {
        console.debug('Upload request: (failed to stringify request info)', e?.message || e);
      }

    // If a YouTube URL is provided, create a video record without file upload
    if (youtube_url) {
      // extract video id from common YouTube URL formats
      const match = youtube_url.match(/(?:v=|\/)([0-9A-Za-z_-]{11})/);
      const videoId = match ? match[1] : null;

      if (!videoId) {
        return res.status(400).json({ error: "Invalid YouTube URL" });
      }

      const embedUrl = `https://www.youtube.com/embed/${videoId}`;
      const thumbnail = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;

      const result = await query(
        `
        INSERT INTO media
          (title, type, url, thumbnail_url, file_size, uploaded_by, post_id, status, public_id, description, image_category_id)
        VALUES
          ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *
        `,
        [
          title || `YouTube Video ${videoId}`,
          'video',
          embedUrl,
          thumbnail,
          null,
          req.user.id,
          post_id,
          req.user.role === "super_admin" ? "approved" : "pending",
          null,
          description,
          img_category_id,
        ]
      );

      return res.status(201).json(result.rows[0]);
    }

    if (!req.file) {
      return res.status(400).json({ error: "File missing" });
    }

    /* ---------- Upload to Cloudinary ---------- */
    // Detect PDFs by MIME or filename and upload them as raw resources so
    // Cloudinary serves correct content-type and URL paths for PDFs.
    const isPdf = (req.file.mimetype || "").toLowerCase() === "application/pdf" ||
      (req.file.originalname || "").toLowerCase().endsWith(".pdf");

    const uploadResult = await new Promise((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        {
          folder: "pi-labs-media",
          resource_type: isPdf ? "raw" : "auto",
          access_mode: "public",
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      ).end(req.file.buffer);
    });

    const resource = uploadResult.resource_type; // 'image' | 'video' | 'raw'

    // Detect PDFs more reliably: Cloudinary sometimes returns 'image' resource_type
    // for uploaded PDFs depending on input. Check format, original_filename and URL.
    const url = (uploadResult.secure_url || "").toString();
    const origName = (uploadResult.original_filename || "").toString();
    const format = (uploadResult.format || "").toString().toLowerCase();

    let mediaType;
    if (format === "pdf" || url.toLowerCase().endsWith(".pdf") || origName.toLowerCase().endsWith(".pdf")) {
      mediaType = "document";
    } else if (resource === "video") {
      mediaType = "video";
    } else if (resource === "raw") {
      mediaType = "document";
    } else {
      mediaType = "image";
    }

    /* ---------- Save metadata in PostgreSQL ---------- */
    // Prefer the original uploaded filename from the request when available
    const titleToSave = title || (req.file && req.file.originalname) || uploadResult.original_filename || uploadResult.public_id || "file";

    const result = await query(
      `
      INSERT INTO media
        (title, description, type, url, thumbnail_url, file_size, uploaded_by, post_id, status, public_id, image_category_id)
      VALUES
        ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
      `,
      [
        titleToSave,
        description,
        mediaType,
        uploadResult.secure_url,
        mediaType === "image" ? uploadResult.secure_url : null,
        uploadResult.bytes,
        req.user.id,
        post_id,
        req.user.role === "super_admin" ? "approved" : "pending",
        uploadResult.public_id || null,
        img_category_id,
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("Media upload error:", err);
    // In development it's useful to return the underlying error message so the frontend
    // can show a clearer reason. This should be safe for local development.
    res.status(500).json({ error: err?.message || "Media upload failed" });
  }
};

/* =====================================================
   GET APPROVED MEDIA
   GET /api/media
===================================================== */
export const getMedia = async (req, res) => {
  try {
    const { type, unattached, admin_uploads } = req.query;

    // Build SQL dynamically to optionally filter by type and whether media is attached to a post
    let sql = `SELECT * FROM media WHERE status = 'approved'`;
    const params = [];
    let i = 1;

    if (type) {
      sql += ` AND type = $${i}`;
      params.push(type);
      i++;
    }

    if (unattached === '1' || unattached === 'true') {
      sql += ` AND post_id IS NULL`;
    }

    if (admin_uploads === '1' || admin_uploads === 'true') {
      // only include media uploaded by profiles with role = 'super_admin'
      sql += ` AND uploaded_by IN (SELECT id FROM profiles WHERE role = 'super_admin')`;
    }

    sql += ` ORDER BY created_at DESC`;

    const rs = await query(sql, params);

    res.json(rs.rows);
  } catch (err) {
    console.error("Fetch media error:", err);
    res.status(500).json({ error: "Failed to fetch media" });
  }
};

/* =====================================================
   DOWNLOAD MEDIA (FORCE ATTACHMENT)
   GET /api/media/:id/download
   - Redirects to a Cloudinary URL that forces download (fl_attachment)
   - Falls back to redirecting to the stored URL
===================================================== */
export const downloadMedia = async (req, res) => {
  try {
    const rs = await query(`SELECT * FROM media WHERE id = $1`, [req.params.id]);
    if (!rs.rows.length) return res.status(404).json({ error: "Media not found" });

    const media = rs.rows[0];

    // Try to stream the remote file and force a download with proper headers.
    if (media.url) {
      try {
        const remoteUrl = media.url;

        // Prefer the stored title; fallback to the last segment of the URL
        let filename = (media.title || "").toString().trim();
        if (!filename) {
          try {
            const parts = remoteUrl.split("/");
            filename = parts[parts.length - 1] || "file";
          } catch (e) {
            filename = "file";
          }
        }

        // Sanitize filename
        filename = filename.replace(/\"/g, "'").replace(/\\|\//g, "_");

        // Fetch the remote resource
        const resp = await fetch(remoteUrl);
        if (!resp.ok) throw new Error(`Remote responded ${resp.status}`);

        // Determine content-type from remote if possible
        const contentType = resp.headers.get("content-type") || "application/octet-stream";

        // Ensure filename has an extension when content-type indicates PDF
        if (!filename.includes(".") && contentType.includes("pdf")) {
          filename = `${filename}.pdf`;
        }

        // Set headers to force download
        res.setHeader("Content-Type", contentType);
        res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
        const contentLength = resp.headers.get("content-length");
        if (contentLength) res.setHeader("Content-Length", contentLength);

        // Stream remote body to client
        await pipeline(resp.body, res);
        return;
      } catch (e) {
        console.warn("Proxy download failed, falling back to redirect:", e.message);
      }
    }

    // Fallback: if streaming failed, attempt Cloudinary download URL if available
    if (media.public_id && media.url && media.url.includes("res.cloudinary.com")) {
      try {
        const resourceType = media.type === 'document' ? 'raw' : media.type;
        const downloadUrl = cloudinary.url(media.public_id, {
          resource_type: resourceType,
          secure: true,
          transformation: [{ flags: 'attachment' }],
        });

        return res.redirect(downloadUrl);
      } catch (e) {
        console.warn('Failed to build Cloudinary download URL:', e.message);
      }
    }

    res.status(400).json({ error: 'No URL available for this media' });
  } catch (err) {
    console.error('Download media error:', err);
    res.status(500).json({ error: 'Failed to download media' });
  }
};

/* =====================================================
   APPROVE MEDIA (ADMIN)
   POST /api/media/:id/approve
===================================================== */
export const approveMedia = async (req, res) => {
  try {
    if (req.user.role !== "super_admin") {
      return res.status(403).json({ error: "Not allowed" });
    }

    await query(
      `
      UPDATE media
      SET status = 'approved',
          approved_by = $1
      WHERE id = $2
      `,
      [req.user.id, req.params.id]
    );

    res.json({ message: "Media approved" });
  } catch (err) {
    console.error("Approve media error:", err);
    res.status(500).json({ error: "Approval failed" });
  }
};

/* =====================================================
   DELETE MEDIA (ADMIN)
   DELETE /api/media/:id
===================================================== */
export const deleteMedia = async (req, res) => {
  try {
    if (req.user.role !== "super_admin") {
      return res.status(403).json({ error: "Not allowed" });
    }

    const rs = await query(
      `SELECT * FROM media WHERE id = $1`,
      [req.params.id]
    );

    if (!rs.rows.length) {
      return res.status(404).json({ error: "Media not found" });
    }

    const media = rs.rows[0];

    /* ---------- Delete from Cloudinary (only if Cloudinary URL) ---------- */
    if (media.url && media.url.includes('res.cloudinary.com')) {
      try {
        // Prefer stored public_id when available
        const publicId = media.public_id || (() => {
          const parts = media.url.split('/');
          const last = parts[parts.length - 1] || '';
          return last.split('.').slice(0, -1).join('.') || last;
        })();

        const resourceType = media.type === 'document' ? 'raw' : media.type === 'video' ? 'video' : 'image';

        if (publicId) {
          await cloudinary.uploader.destroy(`pi-labs-media/${publicId}`, { resource_type: resourceType });
        }
      } catch (e) {
        console.warn('Cloudinary delete skipped or failed:', e.message);
      }
    }

    /* ---------- Delete DB record ---------- */
    await query(`DELETE FROM media WHERE id = $1`, [req.params.id]);

    res.json({ message: "Media deleted successfully" });
  } catch (err) {
    console.error("Delete media error:", err);
    res.status(500).json({ error: "Delete failed" });
  }
};

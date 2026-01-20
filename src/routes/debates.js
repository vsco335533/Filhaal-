import express from 'express';
import { load } from 'cheerio';
import { upload } from '../middleware/upload.js';
import cloudinary from '../config/cloudinary.js';
import { query } from '../config/database.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import { PassThrough } from 'stream';

const router = express.Router();

// GET /api/debates
// Fetch the external debates listing page and extract debate links (id + title)
router.get('/debates', async (req, res, next) => {
  try {
    const url = 'https://filhaal.vercel.app/debates';
    const resp = await globalThis.fetch(url, { headers: { 'User-Agent': 'filhaal-proxy/1.0' } });
    if (!resp.ok) return res.status(502).json({ error: 'Failed to fetch source debates page' });

    const html = await resp.text();
    const $ = load(html);

    const items = [];
    // Find anchors that link to /debates/<id> and collect title + id
    $('a[href*="/debates/"]').each((i, el) => {
      const href = $(el).attr('href') || '';
      try {
        const u = new URL(href, url);
        if (!u.pathname.startsWith('/debates/')) return;
        const id = u.pathname.replace('/debates/', '').replace(/\/$/, '');
        const title = $(el).text().trim() || $(el).attr('title') || id;
        // avoid duplicates
        if (!items.find((it) => it.id === id)) {
          items.push({ id, title, sourceUrl: u.href });
        }
      } catch (e) {
        // ignore invalid urls
      }
    });

    // Append locally uploaded debates from DB (most recent first)
    try {
      const localRes = await query('SELECT id, name, description, pdf_url FROM debates ORDER BY created_at DESC');
      for (const r of localRes.rows) {
        // use a distinct id prefix so detail route can detect local items
        const localId = `local-${r.id}`;
        // avoid duplicates
        if (!items.find((it) => it.id === localId)) {
          items.unshift({ id: localId, title: r.name || `Debate ${r.id}`, pdfUrl: r.pdf_url, sourceUrl: null });
        }
      }
    } catch (e) {
      // If DB read fails, don't block external list
      console.error('Failed to load local debates:', e.message || e);
    }

    return res.json({ items });
  } catch (err) {
    next(err);
  }
});

// POST /api/debates/upload
// Protected: Admins only. Accepts multipart/form-data with field `pdf`.
router.post('/debates/upload', authenticate, requireAdmin, upload.single('pdf'), async (req, res, next) => {
  try {
    const { name, description } = req.body;

    if (!req.file) return res.status(400).json({ error: 'PDF file is required' });

    const isPdf = (req.file.mimetype === 'application/pdf') || (req.file.originalname || '').toLowerCase().endsWith('.pdf');
    if (!isPdf) return res.status(400).json({ error: 'Only PDF files are allowed' });

    // Upload to Cloudinary as raw resource
    const uploadStream = cloudinary.uploader.upload_stream({ resource_type: 'raw', folder: 'debates' }, async (err, result) => {
      if (err) return next(err);

      try {
        const insert = await query(
          `INSERT INTO debates (name, description, pdf_url, cloudinary_id, created_by)
           VALUES ($1, $2, $3, $4, $5) RETURNING *`,
          [name || null, description || null, result.secure_url, result.public_id, req.user.id]
        );

        return res.json({ debate: insert.rows[0] });
      } catch (e) {
        return next(e);
      }
    });

    const s = new PassThrough();
    s.end(req.file.buffer);
    s.pipe(uploadStream);
  } catch (err) {
    next(err);
  }
});

// GET /api/debates/proxy?url=<url>&filename=<optional>
// Public proxy to stream PDFs (normalizes headers so browser can inline render)
router.get('/debates/proxy', async (req, res, next) => {
  try {
    const url = req.query.url;
    const filename = req.query.filename || 'document.pdf';
    
    console.log('[DEBUG] /debates/proxy called', { url, filename });
    
    if (!url) {
      console.error('[ERROR] Missing url parameter in proxy');
      return res.status(400).json({ error: 'Missing url parameter' });
    }

    const allowedHost = (u) => {
      try {
        const parsed = new URL(u);
        // Allow Cloudinary and same origin (add more hosts if needed)
        const allowed = parsed.hostname.endsWith('cloudinary.com') || parsed.hostname === req.hostname || parsed.hostname === 'localhost';
        console.log('[DEBUG] allowedHost check:', { hostname: parsed.hostname, allowed });
        return allowed;
      } catch (e) {
        console.error('[ERROR] URL parsing failed:', e.message);
        return false;
      }
    };

    if (!allowedHost(url)) {
      console.error('[ERROR] Host not allowed:', url);
      return res.status(403).json({ error: 'Proxying this host is not allowed' });
    }

    console.log('[DEBUG] Fetching PDF from:', url);
    const resp = await globalThis.fetch(url.toString());
    console.log('[DEBUG] Fetch response status:', resp.status, resp.statusText);
    
    if (!resp.ok) {
      console.error('[ERROR] Remote fetch failed:', resp.status, resp.statusText);
      return res.status(502).json({ error: 'Failed to fetch remote PDF' });
    }

    // Force application/pdf to ensure inline rendering (Cloudinary may return octet-stream)
    const contentType = 'application/pdf';
    console.log('[DEBUG] Setting Content-Type:', contentType);
    
    // Set CORS headers to allow iframe to access the response
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    res.setHeader('Content-Type', contentType);
    // Force inline rendering (NOT attachment) to display in iframe instead of triggering download
    res.setHeader('Content-Disposition', `inline; filename="${String(filename).replace(/\"/g, '')}"`);
    // Prevent caching issues
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    // Stream the body
    const arrayBuffer = await resp.arrayBuffer();
    console.log('[DEBUG] Sending PDF buffer, size:', arrayBuffer.byteLength, 'bytes');
    res.send(Buffer.from(arrayBuffer));
  } catch (err) {
    console.error('[ERROR] Proxy error:', err);
    next(err);
  }
});

// GET /api/debate?id=<id>
// Fetch a debate detail page and try to extract an embeddable PDF URL + title
router.get('/debate', async (req, res, next) => {
  try {
    const id = req.query.id;
    if (!id) return res.status(400).json({ error: 'Missing id parameter' });

    // If id corresponds to a locally uploaded debate (prefixed with local-), serve from DB
    if (typeof id === 'string' && id.startsWith('local-')) {
      const localId = parseInt(id.split('-')[1], 10);
      if (Number.isNaN(localId)) return res.status(400).json({ error: 'Invalid local id' });

      const result = await query('SELECT id, name, description, pdf_url FROM debates WHERE id = $1', [localId]);
      if (result.rows.length === 0) return res.status(404).json({ error: 'Debate not found' });

      const row = result.rows[0];
      return res.json({ id: `local-${row.id}`, pdfUrl: row.pdf_url, title: row.name || null, sourceUrl: null, description: row.description || null });
    }

    const url = `https://filhaal.vercel.app/debates/${encodeURIComponent(id)}`;
    const resp = await globalThis.fetch(url, { headers: { 'User-Agent': 'filhaal-proxy/1.0' } });
    if (!resp.ok) return res.status(502).json({ error: 'Failed to fetch source page' });

    const html = await resp.text();
    const $ = load(html);

    let pdfUrl = '';
    const iframe = $('iframe[src]').first();
    if (iframe && iframe.attr('src')) pdfUrl = iframe.attr('src');

    if (!pdfUrl) {
      const anchor = $('a[href$=".pdf"]').first();
      if (anchor && anchor.attr('href')) pdfUrl = anchor.attr('href');
    }

    if (!pdfUrl) {
      const anyPdf = $('[src*=".pdf"], a[href*=".pdf"]').first();
      if (anyPdf && (anyPdf.attr('src') || anyPdf.attr('href'))) pdfUrl = anyPdf.attr('src') || anyPdf.attr('href');
    }

    if (pdfUrl && pdfUrl.startsWith('/')) {
      const origin = new URL(url).origin;
      pdfUrl = origin + pdfUrl;
    }

    const title = $('h1, h2, h3').first().text().trim() || $('title').text().trim() || '';

    return res.json({ id, pdfUrl: pdfUrl || null, title, sourceUrl: url });
  } catch (err) {
    next(err);
  }
});

export default router;

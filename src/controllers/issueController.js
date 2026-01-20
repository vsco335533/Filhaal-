import { v2 as cloudinary } from 'cloudinary';
import db from '../config/database.js';

// Helper function to transform issues with proxy URLs or direct Cloudinary URLs
const transformIssuePdfUrl = (issue) => {
  if (issue.pdf_url) {
    // If we have the secure_url from Cloudinary (which includes the version), use it directly
    // Otherwise fall back to proxy
    return {
      ...issue,
      // Use the stored pdf_url directly (it's the Cloudinary secure_url with version)
    };
  }
  return issue;
};

// Upload Issue PDF
export const uploadIssue = async (req, res) => {
  try {
    const { year, month, title, description } = req.body;
    const userId = req.user.id;

    // Validate admin role
    if (req.user.role !== 'super_admin') {
      return res.status(403).json({ message: 'Only admins can upload issues' });
    }

    // Validate required fields
    if (!year || !month || !title || !req.file) {
      return res.status(400).json({ 
        message: 'Year, month, title, and PDF file are required' 
      });
    }

    // Validate month
    if (month < 1 || month > 12) {
      return res.status(400).json({ message: 'Month must be between 1 and 12' });
    }

    // Validate file type
    if (req.file.mimetype !== 'application/pdf') {
      return res.status(400).json({ message: 'Only PDF files are allowed' });
    }

    // Check if issue already exists for this year-month combo
    const existingIssue = await db.query(
      'SELECT id FROM issues WHERE year = $1 AND month = $2',
      [year, month]
    );

    if (existingIssue.rows.length > 0) {
      // Delete old PDF from Cloudinary before updating
      if (existingIssue.rows[0].pdf_public_id) {
        try {
          await cloudinary.api.delete_resources([existingIssue.rows[0].pdf_public_id], {
            resource_type: 'raw'
          });
        } catch (error) {
          console.error('Error deleting old PDF from Cloudinary:', error);
        }
      }

      // Update existing issue
      const buffer = req.file.buffer;
      console.log(`📤 Uploading replacement PDF to Cloudinary:`, {
        fileSize: buffer.length,
        mimetype: req.file.mimetype,
        originalname: req.file.originalname,
        uploadConfig: {
          resource_type: 'raw',
          folder: 'issues',
          public_id: `issue_${year}_${month}_${Date.now()}`,
          attachment: false,
          tags: ['issue', `${year}_${month}`]
        }
      });
      const uploadResult = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          {
            resource_type: 'raw',
            folder: 'issues',
            public_id: `issue_${year}_${month}_${Date.now()}`,
            format: 'pdf',
            attachment: false,
            tags: ['issue', `${year}_${month}`]
          },
          (error, result) => {
            if (error) {
              console.error(`❌ Update upload failed:`, error);
              reject(error);
            } else {
              console.log(`✅ Update upload successful:`, result);
              resolve(result);
            }
          }
        );
        stream.end(buffer);
      });

      const cloudinaryUrl = uploadResult.secure_url;
      console.log(`📤 Upload Result:`, {
        public_id: uploadResult.public_id,
        secure_url: uploadResult.secure_url,
        resource_type: uploadResult.resource_type
      });

      // Ensure pdf_public_id ends with .pdf
      const pdfPublicId = uploadResult.public_id.endsWith('.pdf') ? uploadResult.public_id : `${uploadResult.public_id}.pdf`;
      
      const result = await db.query(
        'UPDATE issues SET title = $1, description = $2, pdf_url = $3, pdf_public_id = $4, updated_at = NOW() WHERE year = $5 AND month = $6 RETURNING *',
        [title, description || null, cloudinaryUrl, pdfPublicId, year, month]
      );

      return res.status(200).json({
        message: 'Issue updated successfully',
        issue: result.rows[0]
      });
    } else {
      // Create new issue
      const buffer = req.file.buffer;
      console.log(`📤 Uploading PDF to Cloudinary:`, {
        fileSize: buffer.length,
        mimetype: req.file.mimetype,
        originalname: req.file.originalname,
        uploadConfig: {
          resource_type: 'raw',
          folder: 'issues',
          public_id: `issue_${year}_${month}_${Date.now()}`,
          attachment: false,
          tags: ['issue', `${year}_${month}`]
        }
      });
      const uploadResult = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          {
            resource_type: 'raw',
            folder: 'issues',
            public_id: `issue_${year}_${month}_${Date.now()}`,
            format: 'pdf',
            attachment: false,
            tags: ['issue', `${year}_${month}`]
          },
          (error, result) => {
            if (error) {
              console.error(`❌ Upload failed:`, error);
              reject(error);
            } else {
              console.log(`✅ Upload successful:`, result);
              resolve(result);
            }
          }
        );
        stream.end(buffer);
      });

      const cloudinaryUrl = uploadResult.secure_url;
      console.log(`📤 Upload Result:`, {
        public_id: uploadResult.public_id,
        secure_url: uploadResult.secure_url,
        resource_type: uploadResult.resource_type
      });

      // Ensure pdf_public_id ends with .pdf
      const pdfPublicId = uploadResult.public_id.endsWith('.pdf') ? uploadResult.public_id : `${uploadResult.public_id}.pdf`;
      
      const result = await db.query(
        'INSERT INTO issues (year, month, title, description, pdf_url, pdf_public_id, created_by) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
        [year, month, title, description || null, cloudinaryUrl, pdfPublicId, userId]
      );

      return res.status(201).json({
        message: 'Issue uploaded successfully',
        issue: result.rows[0]
      });
    }
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ message: 'Error uploading issue', error: error.message });
  }
};

// Get Issues by Year and Month
export const getIssuesByYearMonth = async (req, res) => {
  try {
    const { year, month } = req.query;

    let query = 'SELECT * FROM issues WHERE 1=1';
    const params = [];

    if (year) {
      params.push(year);
      query += ` AND year = $${params.length}`;
    }

    if (month) {
      params.push(month);
      query += ` AND month = $${params.length}`;
    }

    query += ' ORDER BY year DESC, month DESC';

    const result = await db.query(query, params);
    
    const transformedIssues = result.rows.map(transformIssuePdfUrl);
    console.log('Transformed issues:', transformedIssues.map(i => ({title: i.title, pdf_url: i.pdf_url, pdf_public_id: i.pdf_public_id})));

    res.status(200).json({
      message: 'Issues retrieved successfully',
      issues: transformedIssues
    });
  } catch (error) {
    console.error('Fetch error:', error);
    res.status(500).json({ message: 'Error fetching issues', error: error.message });
  }
};

// Get Single Issue
export const getIssueById = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await db.query('SELECT * FROM issues WHERE id = $1', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Issue not found' });
    }

    res.status(200).json({
      message: 'Issue retrieved successfully',
      issue: transformIssuePdfUrl(result.rows[0])
    });
  } catch (error) {
    console.error('Fetch error:', error);
    res.status(500).json({ message: 'Error fetching issue', error: error.message });
  }
};

// Get PDF File (Proxy from Cloudinary with server-side auth)
export const getPdfFile = async (req, res) => {
  try {
    let { publicId } = req.params;
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    
    // Decode the publicId (it comes URL-encoded from the route)
    publicId = decodeURIComponent(publicId);
    
    console.log(`📄 PDF Request: publicId=${publicId}, cloudName=${cloudName}`);
    
    // Build Cloudinary URL - publicId includes the version-based path
    // BUT if publicId is just "issues/issue_...", we need to get the version from somewhere
    // For now, we'll try to get it from the database or use a generic approach
    
    // Try fetching with the public_id as-is (no version in URL)
    let pdfUrl = `https://res.cloudinary.com/${cloudName}/raw/upload/${publicId}`;
    console.log(`🔗 Attempting fetch from: ${pdfUrl}`);
    
    let response = await fetch(pdfUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0'
      }
    });
    
    console.log(`✅ Response status: ${response.status}`);
    
    if (!response.ok) {
      console.error(`❌ Cloudinary error: ${response.status} ${response.statusText}`);
      return res.status(404).json({ message: 'PDF not found', status: response.status, publicId, url: pdfUrl });
    }
    
    const buffer = await response.arrayBuffer();
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline; filename="document.pdf"');
    res.setHeader('Cache-Control', 'public, max-age=31536000');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.send(Buffer.from(buffer));
    console.log(`✅ PDF sent to client, size: ${buffer.byteLength} bytes`);
  } catch (error) {
    console.error('❌ PDF proxy error:', error);
    res.status(500).json({ message: 'Error fetching PDF', error: error.message });
  }
};

// Proxy endpoint to fetch PDF by issue ID (for iframe loading)
export const getPdfFileById = async (req, res) => {
  try {
    const { issueId } = req.params;
    
    console.log(`📄 PDF Request by Issue ID: ${issueId}`);
    
    // Get the issue from database to get the pdf_url
    const result = await db.query(
      'SELECT pdf_url FROM issues WHERE id = $1',
      [issueId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Issue not found' });
    }
    
    const pdfUrl = result.rows[0].pdf_url;
    console.log(`🔗 Fetching PDF from Cloudinary: ${pdfUrl}`);
    
    // Fetch PDF from Cloudinary
    const response = await fetch(pdfUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0'
      }
    });
    
    console.log(`✅ Cloudinary response: ${response.status}`);
    
    if (!response.ok) {
      return res.status(response.status).json({ message: 'PDF not found on Cloudinary' });
    }
    
    const buffer = await response.arrayBuffer();
    
    // Return PDF with proper headers for inline display
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline; filename="document.pdf"');
    res.setHeader('Cache-Control', 'public, max-age=31536000');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.send(Buffer.from(buffer));
    console.log(`✅ PDF sent to client, size: ${buffer.byteLength} bytes`);
  } catch (error) {
    console.error('❌ Error fetching PDF by ID:', error);
    res.status(500).json({ message: 'Error fetching PDF', error: error.message });
  }
};

// Get All Years with Issues
export const getYearsWithIssues = async (req, res) => {
  try {
    const result = await db.query(
      'SELECT DISTINCT year FROM issues ORDER BY year DESC'
    );

    res.status(200).json({
      message: 'Years retrieved successfully',
      years: result.rows.map(row => row.year)
    });
  } catch (error) {
    console.error('Fetch error:', error);
    res.status(500).json({ message: 'Error fetching years', error: error.message });
  }
};

// Update Issue Metadata (Title & Description only)
export const updateIssueMeta = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description } = req.body;
    const userId = req.user.id;

    // Validate admin role
    if (req.user.role !== 'super_admin') {
      return res.status(403).json({ message: 'Only admins can update issues' });
    }

    if (!title) {
      return res.status(400).json({ message: 'Title is required' });
    }

    const result = await db.query(
      'UPDATE issues SET title = $1, description = $2, updated_at = NOW() WHERE id = $3 RETURNING *',
      [title, description || null, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Issue not found' });
    }

    res.status(200).json({
      message: 'Issue updated successfully',
      issue: result.rows[0]
    });
  } catch (error) {
    console.error('Update error:', error);
    res.status(500).json({ message: 'Error updating issue', error: error.message });
  }
};

// Delete Issue
export const deleteIssue = async (req, res) => {
  try {
    const { id } = req.params;

    // Validate admin role
    if (req.user.role !== 'super_admin') {
      return res.status(403).json({ message: 'Only admins can delete issues' });
    }

    // Get issue to retrieve PDF public ID
    const issueResult = await db.query('SELECT * FROM issues WHERE id = $1', [id]);

    if (issueResult.rows.length === 0) {
      return res.status(404).json({ message: 'Issue not found' });
    }

    const issue = issueResult.rows[0];

    // Delete PDF from Cloudinary
    if (issue.pdf_public_id) {
      try {
        await cloudinary.api.delete_resources([issue.pdf_public_id], {
          resource_type: 'raw'
        });
      } catch (error) {
        console.error('Error deleting PDF from Cloudinary:', error);
      }
    }

    // Delete from database
    await db.query('DELETE FROM issues WHERE id = $1', [id]);

    res.status(200).json({ message: 'Issue deleted successfully' });
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({ message: 'Error deleting issue', error: error.message });
  }
};

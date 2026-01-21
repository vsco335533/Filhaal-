import { query } from '../config/database.js';

export const getAllImageCategories = async (req, res) => {
  try {
    const rs = await query('SELECT * FROM image_categories ORDER BY name ASC');
    res.json(rs.rows);
  } catch (err) {
    console.error('Get image categories error:', err);
    res.status(500).json({ error: 'Failed to fetch image categories' });
  }
};

export const createImageCategory = async (req, res) => {
  try {
    const { name, description } = req.body;
    
    if (!name || name.trim() === '') {
      return res.status(400).json({ error: 'Category name is required' });
    }

    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    
    // Check if category already exists
    const existing = await query(
      'SELECT * FROM image_categories WHERE slug = $1',
      [slug]
    );

    if (existing.rows.length > 0) {
      return res.status(409).json({ 
        error: 'Image category already exists',
        category: existing.rows[0]
      });
    }

    const result = await query(
      'INSERT INTO image_categories (name, slug, description) VALUES ($1, $2, $3) RETURNING *',
      [name, slug, description]
    );

    res.status(201).json({ message: 'Image category created', category: result.rows[0] });
  } catch (err) {
    console.error('Create image category error:', err);
    
    // Handle duplicate key constraint errors
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Image category with this name already exists' });
    }
    
    res.status(500).json({ error: 'Failed to create image category' });
  }
};

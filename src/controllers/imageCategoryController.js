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
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const result = await query(
      'INSERT INTO image_categories (name, slug, description) VALUES ($1, $2, $3) RETURNING *',
      [name, slug, description]
    );

    res.status(201).json({ message: 'Image category created', category: result.rows[0] });
  } catch (err) {
    console.error('Create image category error:', err);
    res.status(500).json({ error: 'Failed to create image category' });
  }
};

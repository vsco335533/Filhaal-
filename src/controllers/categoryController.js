import { query } from '../config/database.js';

export const getAllCategories = async (req, res) => {
  try {
    const result = await query(
      'SELECT * FROM categories ORDER BY name ASC'
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
};

export const createCategory = async (req, res) => {
  try {
    const { name, description } = req.body;
    
    if (!name || name.trim() === '') {
      return res.status(400).json({ error: 'Category name is required' });
    }

    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

    // Check if category already exists
    const existing = await query(
      'SELECT * FROM categories WHERE slug = $1',
      [slug]
    );

    if (existing.rows.length > 0) {
      return res.status(409).json({ 
        error: 'Category already exists',
        category: existing.rows[0]
      });
    }

    const result = await query(
      'INSERT INTO categories (name, slug, description) VALUES ($1, $2, $3) RETURNING *',
      [name, slug, description]
    );

    res.status(201).json({
      message: 'Category created successfully',
      category: result.rows[0]
    });
  } catch (error) {
    console.error('Create category error:', error);
    
    // Handle duplicate key constraint errors
    if (error.code === '23505') {
      return res.status(409).json({ error: 'Category with this name already exists' });
    }
    
    res.status(500).json({ error: 'Failed to create category' });
  }
};

export const getAllTags = async (req, res) => {
  try {
    const result = await query(
      'SELECT * FROM tags ORDER BY name ASC'
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Get tags error:', error);
    res.status(500).json({ error: 'Failed to fetch tags' });
  }
};

export const createTag = async (req, res) => {
  try {
    const { name } = req.body;
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

    const result = await query(
      'INSERT INTO tags (name, slug) VALUES ($1, $2) RETURNING *',
      [name, slug]
    );

    res.status(201).json({
      message: 'Tag created successfully',
      tag: result.rows[0]
    });
  } catch (error) {
    console.error('Create tag error:', error);
    res.status(500).json({ error: 'Failed to create tag' });
  }
};

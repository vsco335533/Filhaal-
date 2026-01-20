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
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

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

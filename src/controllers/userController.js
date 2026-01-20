import { query } from '../config/database.js';

export const getAllUsers = async (req, res) => {
  try {
    const result = await query(
      `SELECT p.id, p.full_name, p.role, p.bio, p.avatar_url, p.created_at,
              u.email
       FROM profiles p
       JOIN users u ON p.id = u.id
       ORDER BY p.created_at DESC`
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
};

export const getUserById = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query(
      `SELECT p.*, u.email,
              (SELECT COUNT(*) FROM posts WHERE author_id = p.id) as total_posts,
              (SELECT COUNT(*) FROM posts WHERE author_id = p.id AND status = 'published') as published_posts
       FROM profiles p
       JOIN users u ON p.id = u.id
       WHERE p.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
};

export const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { full_name, bio, avatar_url, role } = req.body;

    if (req.user.id !== id && req.user.role !== 'super_admin') {
      return res.status(403).json({ error: 'Not authorized to update this user' });
    }

    const updates = [];
    const values = [];
    let paramIndex = 1;

    if (full_name !== undefined) {
      updates.push(`full_name = $${paramIndex}`);
      values.push(full_name);
      paramIndex++;
    }

    if (bio !== undefined) {
      updates.push(`bio = $${paramIndex}`);
      values.push(bio);
      paramIndex++;
    }

    if (avatar_url !== undefined) {
      updates.push(`avatar_url = $${paramIndex}`);
      values.push(avatar_url);
      paramIndex++;
    }

    if (role !== undefined && req.user.role === 'super_admin') {
      updates.push(`role = $${paramIndex}`);
      values.push(role);
      paramIndex++;
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    updates.push(`updated_at = NOW()`);
    values.push(id);

    const result = await query(
      `UPDATE profiles SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );

    res.json({
      message: 'User updated successfully',
      user: result.rows[0]
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
};

export const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    if (req.user.id === id) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }

    await query('DELETE FROM users WHERE id = $1', [id]);

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
};

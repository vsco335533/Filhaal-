import { query } from "../config/database.js";

export const submitContact = async (req, res) => {
  try {
    const { name, email, subject, message, category } = req.body;
    if (!name || !email || !message) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const result = await query(
      `INSERT INTO contacts (name, email, subject, category, message) VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [name, email, subject || null, category || 'general', message]
    );

    res.status(201).json({ message: "Submitted", contact: result.rows[0] });
  } catch (err) {
    console.error("Contact submit error:", err);
    res.status(500).json({ error: "Failed to submit contact" });
  }
};

export const getContacts = async (req, res) => {
  try {
    const rs = await query(`SELECT * FROM contacts ORDER BY created_at DESC`);
    res.json(rs.rows);
  } catch (err) {
    console.error("Get contacts error:", err);
    res.status(500).json({ error: "Failed to fetch contacts" });
  }
};

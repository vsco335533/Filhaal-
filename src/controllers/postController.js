// import { query } from '../config/database.js';

// export const getAllPosts = async (req, res) => {
//   try {
//     const { status, type, category_id, search, limit = 50, offset = 0 } = req.query;

//     let queryText = `
//       SELECT p.*,
//              json_build_object('full_name', pr.full_name, 'avatar_url', pr.avatar_url) as profiles,
//              json_build_object('name', c.name, 'slug', c.slug) as categories
//       FROM posts p
//       LEFT JOIN profiles pr ON p.author_id = pr.id
//       LEFT JOIN categories c ON p.category_id = c.id
//       WHERE 1=1
//     `;

//     const queryParams = [];
//     let paramIndex = 1;

//     // if (status) {
//     //   queryText += ` AND p.status = $${paramIndex}`;
//     //   queryParams.push(status);
//     //   paramIndex++;
//     // }

//     if (status) {
//       const statuses = status.split(",");
//       queryText += ` AND p.status = ANY($${paramIndex})`;
//       queryParams.push(statuses);
//       paramIndex++;
//     }

//     if (type) {
//       queryText += ` AND p.type = $${paramIndex}`;
//       queryParams.push(type);
//       paramIndex++;
//     }

//     if (category_id) {
//       queryText += ` AND p.category_id = $${paramIndex}`;
//       queryParams.push(category_id);
//       paramIndex++;
//     }

//     if (search) {
//       queryText += ` AND (p.title ILIKE $${paramIndex} OR p.content ILIKE $${paramIndex})`;
//       queryParams.push(`%${search}%`);
//       paramIndex++;
//     }

//     queryText += ` ORDER BY p.published_at DESC NULLS LAST, p.created_at DESC`;
//     queryText += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
//     queryParams.push(limit, offset);

//     const result = await query(queryText, queryParams);
//     res.json(result.rows);
//   } catch (error) {
//     console.error('Get posts error:', error);
//     res.status(500).json({ error: 'Failed to fetch posts' });
//   }
// };

// export const getPostBySlug = async (req, res) => {
//   try {
//     const { slug } = req.params;

//       const ip =
//       req.headers['x-forwarded-for'] ||
//       req.socket.remoteAddress;

//     const result = await query(
//       `SELECT p.*,
//               json_build_object('full_name', pr.full_name, 'avatar_url', pr.avatar_url) as profiles,
//               json_build_object('name', c.name, 'slug', c.slug) as categories,
//               COALESCE(
//                 (SELECT json_agg(json_build_object('tags', json_build_object('name', t.name, 'slug', t.slug)))
//                  FROM post_tags pt
//                  JOIN tags t ON pt.tag_id = t.id
//                  WHERE pt.post_id = p.id),
//                 '[]'
//               ) as post_tags,
//               COALESCE(
//                 (SELECT json_agg(m.*) FROM media m WHERE m.post_id = p.id),
//                 '[]'
//               ) as media
//        FROM posts p
//        LEFT JOIN profiles pr ON p.author_id = pr.id
//        LEFT JOIN categories c ON p.category_id = c.id
//        WHERE p.slug = $1`,
//       [slug]
//     );

//     if (result.rows.length === 0) {
//       return res.status(404).json({ error: 'Post not found' });
//     }

//     const postId = result.rows[0].id;

//     // ✅ Check if this IP already viewed
//      const viewCheck = await query(
//       `SELECT 1 FROM post_views WHERE post_id = $1 AND ip_address = $2`,
//       [postId, ip]
//     );

//     if (viewCheck.rows.length === 0) {
//       // First time view → increase count
//       await query(
//         `INSERT INTO post_views (post_id, ip_address)
//          VALUES ($1, $2)`,
//         [postId, ip]
//       );

//       await query(
//         `UPDATE posts
//          SET view_count = view_count + 1
//          WHERE id = $1`,
//         [postId]
//       );
//     }


//     res.json(result.rows[0]);
//   } catch (error) {
//     console.error('Get post error:', error);
//     res.status(500).json({ error: 'Failed to fetch post' });
//   }
// };

// export const createPost = async (req, res) => {
//   try {
//     const {
//       title,
//       content,
//       excerpt,
//       type,
//       category_id,
//       featured_image_url,
//       document_url,
//       status = 'draft'
//     } = req.body;

//     const slug = title
//       .toLowerCase()
//       .replace(/[^a-z0-9]+/g, '-')
//       .replace(/(^-|-$)/g, '');

//     const result = await query(
//       `INSERT INTO posts (title, slug, content, excerpt, type, status, author_id, category_id, featured_image_url, document_url)
//        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
//        RETURNING *`,
//       [title, slug, content, excerpt, type, status, req.user.id, category_id, featured_image_url, document_url]
//     );

//     res.status(201).json({
//       message: 'Post created successfully',
//       post: result.rows[0]
//     });
//   } catch (error) {
//     console.error('Create post error:', error);
//     res.status(500).json({ error: 'Failed to create post' });
//   }
// };

// export const updatePost = async (req, res) => {
//   try {
//     const { id } = req.params;
//     const {
//       title,
//       content,
//       excerpt,
//       type,
//       category_id,
//       featured_image_url,
//       document_url,
//       status
//     } = req.body;

//     const existingPost = await query(
//       'SELECT * FROM posts WHERE id = $1',
//       [id]
//     );

//     if (existingPost.rows.length === 0) {
//       return res.status(404).json({ error: 'Post not found' });
//     }

//     if (existingPost.rows[0].author_id !== req.user.id && req.user.role !== 'super_admin') {
//       return res.status(403).json({ error: 'Not authorized to update this post' });
//     }

//     const slug = title
//       ? title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
//       : existingPost.rows[0].slug;

//     const result = await query(
//       `UPDATE posts
//        SET title = COALESCE($1, title),
//            slug = $2,
//            content = COALESCE($3, content),
//            excerpt = COALESCE($4, excerpt),
//            type = COALESCE($5, type),
//            category_id = COALESCE($6, category_id),
//            featured_image_url = COALESCE($7, featured_image_url),
//            document_url = COALESCE($8, document_url),
//            status = COALESCE($9, status),
//            updated_at = NOW()
//        WHERE id = $10
//        RETURNING *`,
//       [title, slug, content, excerpt, type, category_id, featured_image_url, document_url, status, id]
//     );

//     res.json({
//       message: 'Post updated successfully',
//       post: result.rows[0]
//     });
//   } catch (error) {
//     console.error('Update post error:', error);
//     res.status(500).json({ error: 'Failed to update post' });
//   }
// };

// export const deletePost = async (req, res) => {
//   try {
//     const { id } = req.params;

//     const existingPost = await query(
//       'SELECT * FROM posts WHERE id = $1',
//       [id]
//     );

//     if (existingPost.rows.length === 0) {
//       return res.status(404).json({ error: 'Post not found' });
//     }

//     if (existingPost.rows[0].author_id !== req.user.id && req.user.role !== 'super_admin') {
//       return res.status(403).json({ error: 'Not authorized to delete this post' });
//     }

//     await query('DELETE FROM posts WHERE id = $1', [id]);

//     res.json({ message: 'Post deleted successfully' });
//   } catch (error) {
//     console.error('Delete post error:', error);
//     res.status(500).json({ error: 'Failed to delete post' });
//   }
// };

// export const approvePost = async (req, res) => {
//   try {
//     const { id } = req.params;

//     const result = await query(
//       `UPDATE posts
//        SET status = 'published',
//            published_at = NOW(),
//            updated_at = NOW()
//        WHERE id = $1
//        RETURNING *`,
//       [id]
//     );

//     if (result.rows.length === 0) {
//       return res.status(404).json({ error: 'Post not found' });
//     }

//     await query(
//       `INSERT INTO moderation_log (post_id, moderator_id, action, feedback)
//        VALUES ($1, $2, 'approved', NULL)`,
//       [id, req.user.id]
//     );

//     res.json({
//       message: 'Post approved successfully',
//       post: result.rows[0]
//     });
//   } catch (error) {
//     console.error('Approve post error:', error);
//     res.status(500).json({ error: 'Failed to approve post' });
//   }
// };

// export const rejectPost = async (req, res) => {
//   try {
//     const { id } = req.params;
//     const { feedback } = req.body;

//     const result = await query(
//       `UPDATE posts
//        SET status = 'rejected',
//            updated_at = NOW()
//        WHERE id = $1
//        RETURNING *`,
//       [id]
//     );

//     if (result.rows.length === 0) {
//       return res.status(404).json({ error: 'Post not found' });
//     }

//     await query(
//       `INSERT INTO moderation_log (post_id, moderator_id, action, feedback)
//        VALUES ($1, $2, 'rejected', $3)`,
//       [id, req.user.id, feedback]
//     );

//     res.json({
//       message: 'Post rejected',
//       post: result.rows[0]
//     });
//   } catch (error) {
//     console.error('Reject post error:', error);
//     res.status(500).json({ error: 'Failed to reject post' });
//   }
// };

import { query } from "../config/database.js";

/* =====================================================
   GET ALL POSTS (FILTERS + SEARCH + PAGINATION)
===================================================== */
export const getAllPosts = async (req, res) => {
  try {
    const {
      status,
      type,
      category_id,
      search,
      limit = 50,
      offset = 0
    } = req.query;

    let sql = `
      SELECT p.*,
        json_build_object(
          'full_name', pr.full_name,
          'avatar_url', pr.avatar_url
        ) AS profiles,
        json_build_object(
          'name', c.name,
          'slug', c.slug
        ) AS categories
      FROM posts p
      LEFT JOIN profiles pr ON p.author_id = pr.id
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE 1=1
    `;

    const params = [];
    let i = 1;

    if (status) {
      sql += ` AND p.status = ANY($${i})`;
      params.push(status.split(","));
      i++;
    }

    if (type) {
      sql += ` AND p.type = $${i}`;
      params.push(type);
      i++;
    }

    if (category_id) {
      sql += ` AND p.category_id = $${i}`;
      params.push(category_id);
      i++;
    }

    if (search) {
      sql += ` AND (p.title ILIKE $${i} OR p.content ILIKE $${i})`;
      params.push(`%${search}%`);
      i++;
    }

    sql += `
      ORDER BY p.published_at DESC NULLS LAST, p.created_at DESC
      LIMIT $${i} OFFSET $${i + 1}
    `;

    params.push(limit, offset);

    const result = await query(sql, params);
    res.json(result.rows);
  } catch (err) {
    console.error("Get posts error:", err);
    res.status(500).json({ error: "Failed to fetch posts" });
  }
};

/* =====================================================
   GET SINGLE POST BY SLUG + IP VIEW COUNT
===================================================== */
export const getPostBySlug = async (req, res) => {
  try {
    const { slug } = req.params;

    const ip =
      req.headers["x-forwarded-for"]?.split(",")[0] ||
      req.socket.remoteAddress;

    // const result = await query(
    //   `
    //   SELECT p.*,
    //     json_build_object(
    //       'full_name', pr.full_name,
    //       'avatar_url', pr.avatar_url
    //     ) AS profiles,
    //     json_build_object(
    //       'name', c.name,
    //       'slug', c.slug
    //     ) AS categories,
    //     COALESCE(
    //       (SELECT json_agg(
    //         json_build_object(
    //           'name', t.name,
    //           'slug', t.slug
    //         )
    //       )
    //       FROM post_tags pt
    //       JOIN tags t ON pt.tag_id = t.id
    //       WHERE pt.post_id = p.id),
    //       '[]'
    //     ) AS tags,
    //     COALESCE(
    //       (SELECT json_agg(m.*)
    //        FROM media m
    //        WHERE m.post_id = p.id),
    //       '[]'
    //     ) AS media
    //   FROM posts p
    //   LEFT JOIN profiles pr ON p.author_id = pr.id
    //   LEFT JOIN categories c ON p.category_id = c.id
    //   WHERE p.slug = $1
    //   `,
    //   [slug]
    // );
      
     const result = await query(`
  SELECT 
    p.*,
    json_build_object(
      'id', pr.id,
      'full_name', pr.full_name
    ) AS profiles,
    c.id AS category_id,
    c.name AS category_name,
    COALESCE(
      json_agg(
        json_build_object(
          'id', m.id,
          'type', m.type,
          'url', m.url,
          'title', m.title
        )
      ) FILTER (WHERE m.id IS NOT NULL),
      '[]'
    ) AS media
  FROM posts p
  LEFT JOIN profiles pr ON pr.id = p.author_id
  LEFT JOIN categories c ON c.id = p.category_id
  LEFT JOIN media m ON m.post_id = p.id
  WHERE p.slug = $1
  GROUP BY p.id, pr.id, c.id
`, [slug]);


    if (!result.rows.length) {
      return res.status(404).json({ error: "Post not found" });
    }

    const post = result.rows[0];

    // ✅ IP-based view count (NO double count)
    const viewCheck = await query(
      `SELECT 1 FROM post_views WHERE post_id = $1 AND ip_address = $2`,
      [post.id, ip]
    );

    if (!viewCheck.rows.length) {
      await query(
        `INSERT INTO post_views (post_id, ip_address) VALUES ($1, $2)`,
        [post.id, ip]
      );

      await query(
        `UPDATE posts SET view_count = view_count + 1 WHERE id = $1`,
        [post.id]
      );
    }

    // Ensure `media` is a parsed JSON array (pg may return JSON as string)
    if (post.media && typeof post.media === 'string') {
      try {
        post.media = JSON.parse(post.media);
      } catch (e) {
        post.media = [];
      }
    }
    if (!Array.isArray(post.media)) post.media = [];

    res.json(post);
  } catch (err) {
    console.error("Get post error:", err);
    res.status(500).json({ error: "Failed to fetch post" });
  }
};

/* =====================================================
   CREATE POST (MULTI PDF + YOUTUBE)
===================================================== */
export const createPost = async (req, res) => {
  try {
    const {
      title,
      content,
      excerpt,
      type,
      category_id,
      featured_image_url,
      author_name,
      status = "draft",
    } = req.body;

    if (!title || !content || !type) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // 1️⃣ Create base slug
    const baseSlug = title
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

    let slug = baseSlug;
    let counter = 1;

    // 2️⃣ Ensure slug uniqueness
    while (true) {
      const check = await query(
        `SELECT 1 FROM posts WHERE slug = $1 LIMIT 1`,
        [slug]
      );

      if (check.rowCount === 0) break;
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    // 3️⃣ Insert post
    const result = await query(
      `
      INSERT INTO posts (
        title,
        slug,
        content,
        excerpt,
        type,
        status,
        author_id,
        author_name,
        category_id,
        featured_image_url
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
      RETURNING *
      `,
      [
        title,
        slug,
        content,
        excerpt,
        type,
        status,
        req.user.id,
        author_name || null,
        category_id,
        featured_image_url,
      ]
    );

    res.status(201).json({ post: result.rows[0] });
  } catch (err) {
    console.error("Create post error:", err);
    res.status(500).json({ error: "Failed to create post" });
  }
};
 

/* =====================================================
   UPDATE POST
===================================================== */
export const updatePost = async (req, res) => {
  try {
    const { id } = req.params;

    const {
      title,
      content,
      excerpt,
      type,
      author_name,
      category_id,
      featured_image_url,
      document_urls,
      youtube_url,
      status
    } = req.body;

    const existing = await query(
      `SELECT * FROM posts WHERE id = $1`,
      [id]
    );

    if (!existing.rows.length) {
      return res.status(404).json({ error: "Post not found" });
    }

      const isOwner = existing.rows[0].author_id === req.user.id;
    const isAdmin = req.user.role === "super_admin";

    // allow if admin OR owner OR old post without author
    if (!isAdmin && !isOwner && existing.rows[0].author_id !== null) {
      return res.status(403).json({ error: "Not authorized" });
    }

    const slug = existing.rows[0].slug;

    const result = await query(
      `
      UPDATE posts SET
        title = COALESCE($1, title),
        slug = $2,
        content = COALESCE($3, content),
        excerpt = COALESCE($4, excerpt),
        type = COALESCE($5, type),
        category_id = COALESCE($6, category_id),
        featured_image_url = COALESCE($7, featured_image_url),
        author_name = COALESCE($8, author_name),
        document_urls = COALESCE($9, document_urls),
        youtube_url = COALESCE($10, youtube_url),
        status = COALESCE($11, status),
        updated_at = NOW()
      WHERE id = $12
      RETURNING *
      `,
      [
        title,
        slug,
        content,
        excerpt,
        type,
        category_id,
        featured_image_url,
        author_name,
        document_urls,
        youtube_url,
        status,
        id
      ]
    );

    res.json({ post: result.rows[0] });
  } catch (err) {
    console.error("Update post error:", err);
    res.status(500).json({ error: "Failed to update post" });
  }
};

/* =====================================================
   REMOVE SINGLE PDF
===================================================== */
export const removePostPdf = async (req, res) => {
  try {
    const { id } = req.params;
    const { pdfUrl } = req.body;

    await query(
      `UPDATE posts
       SET document_urls = array_remove(document_urls, $1)
       WHERE id = $2`,
      [pdfUrl, id]
    );

    res.json({ message: "PDF removed successfully" });
  } catch (err) {
    console.error("Remove PDF error:", err);
    res.status(500).json({ error: "Failed to remove PDF" });
  }
};

/* =====================================================
   DELETE POST
===================================================== */
export const deletePost = async (req, res) => {
  try {
    const { id } = req.params;

    const existing = await query(
      `SELECT * FROM posts WHERE id = $1`,
      [id]
    );

    if (!existing.rows.length) {
      return res.status(404).json({ error: "Post not found" });
    }

    const isOwner = existing.rows[0].author_id === req.user.id;
    const isAdmin = req.user.role === "super_admin";

    if (!isAdmin && !isOwner && existing.rows[0].author_id !== null) {
      return res.status(403).json({ error: "Not authorized" });
    }

    await query(`DELETE FROM posts WHERE id = $1`, [id]);

    res.json({ message: "Post deleted successfully" });
  } catch (err) {
    console.error("Delete post error:", err);
    res.status(500).json({ error: "Failed to delete post" });
  }
};

/* =====================================================
   ADMIN APPROVE POST
===================================================== */
export const approvePost = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query(
      `
      UPDATE posts
      SET status = 'published',
          published_at = NOW(),
          updated_at = NOW()
      WHERE id = $1
      RETURNING *
      `,
      [id]
    );

    await query(
      `
      INSERT INTO moderation_log (post_id, moderator_id, action)
      VALUES ($1, $2, 'approved')
      `,
      [id, req.user.id]
    );

    res.json({ post: result.rows[0] });
  } catch (err) {
    console.error("Approve post error:", err);
    res.status(500).json({ error: "Failed to approve post" });
  }
};
/* =====================================================
   ADMIN REJECT POST
===================================================== */
export const rejectPost = async (req, res) => {
  try {
    const { id } = req.params;
    const { feedback } = req.body;

    const result = await query(
      `
      UPDATE posts
      SET status = 'rejected',
          updated_at = NOW()
      WHERE id = $1
      RETURNING *
      `,
      [id]
    );

    await query(
      `
      INSERT INTO moderation_log (post_id, moderator_id, action, feedback)
      VALUES ($1, $2, 'rejected', $3)
      `,
      [id, req.user.id, feedback || null]
    );

    res.json({ post: result.rows[0] });
  } catch (err) {
    console.error("Reject post error:", err);
    res.status(500).json({ error: "Failed to reject post" });
  }
};



CREATE TABLE IF NOT EXISTS post_views (
  id SERIAL PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  ip_address TEXT NOT NULL,
  viewed_at TIMESTAMP DEFAULT NOW(),
  UNIQUE (post_id, ip_address)
);

CREATE INDEX IF NOT EXISTS idx_post_views_post_id ON post_views(post_id);
CREATE INDEX IF NOT EXISTS idx_post_views_ip ON post_views(ip_address);
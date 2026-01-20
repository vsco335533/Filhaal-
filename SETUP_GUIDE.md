# Backend Setup Guide

## Prerequisites

1. **Node.js** (v18 or higher)
2. **PostgreSQL** (v12 or higher) installed locally
3. **npm** package manager

## Step 1: Install PostgreSQL

### macOS
```bash
brew install postgresql@15
brew services start postgresql@15
```

### Ubuntu/Debian
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
```

### Windows
Download and install from: https://www.postgresql.org/download/windows/

## Step 2: Create Database

```bash
# Login to PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE research_platform;

# Exit psql
\q
```

Or use this one-liner:
```bash
createdb -U postgres research_platform
```

## Step 3: Configure Environment Variables

Update `backend/.env` with your PostgreSQL credentials:

```env
# Server Configuration
PORT=5000
NODE_ENV=development

# Database Configuration (Local PostgreSQL)
PG_HOST=localhost
PG_PORT=5432
PG_DATABASE=research_platform
PG_USER=postgres
PG_PASSWORD=Welcome@01

# JWT Configuration
JWT_SECRET=research-platform-super-secret-jwt-key-2024
JWT_EXPIRES_IN=7d

# CORS Configuration
FRONTEND_URL=http://localhost:5173
```

**Important:** Change `PG_PASSWORD` to your PostgreSQL password!

## Step 4: Install Dependencies

```bash
cd backend
npm install
```

## Step 5: Run the Backend

```bash
npm run dev
```

The backend will:
1. Connect to PostgreSQL
2. **Automatically run all migrations**
3. Create tables and seed demo data
4. Start the API server on `http://localhost:5000`

## What Happens on Startup

When you run `npm run dev`, the server automatically:

✅ Creates all database tables
✅ Sets up indexes and constraints
✅ Creates demo users (admin & researcher)
✅ Seeds sample research posts
✅ Inserts default categories and tags

### Demo Accounts Created

**Admin Account**
- Email: `admin@example.com`
- Password: `password`
- Role: Super Admin

**Researcher Account**
- Email: `researcher@example.com`
- Password: `password`
- Role: Researcher

## Verify Installation

### Check API Health
```bash
curl http://localhost:5000/api/health
```

Expected response:
```json
{
  "status": "ok",
  "message": "Research Platform API is running",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### Test Login
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "password"
  }'
```

## Migration System

### How Migrations Work

Migrations are SQL files in `backend/migrations/` directory:
- `001_initial_schema.sql` - Creates all tables
- `002_seed_demo_data.sql` - Inserts demo data

On server startup, the system:
1. Creates `schema_migrations` table (tracks executed migrations)
2. Checks which migrations have been run
3. Executes pending migrations in order
4. Marks them as completed

### Migration Files Structure

```
backend/
├── migrations/
│   ├── 001_initial_schema.sql      # Database structure
│   └── 002_seed_demo_data.sql      # Sample data
└── src/
    └── utils/
        └── migrationRunner.js       # Migration engine
```

### Add New Migration

Create a new file: `backend/migrations/003_your_migration.sql`

```sql
-- Add your SQL here
ALTER TABLE posts ADD COLUMN new_field text;
```

Restart the server - it will automatically run the new migration!

### Reset Database

If you need to start fresh:

```bash
# Drop and recreate database
psql -U postgres -c "DROP DATABASE research_platform;"
psql -U postgres -c "CREATE DATABASE research_platform;"

# Restart backend - migrations will run automatically
npm run dev
```

## Database Schema

### Tables Created

1. **users** - Authentication (email, password)
2. **profiles** - User profiles (name, role, bio)
3. **categories** - Content categories
4. **tags** - Content tags
5. **posts** - Research articles, field studies, opinions
6. **post_tags** - Many-to-many relationship
7. **media** - Videos, images, documents
8. **moderation_log** - Content approval history
9. **schema_migrations** - Migration tracking

### Custom Types (ENUMs)

- `user_role`: super_admin, researcher
- `post_type`: research, field_study, opinion
- `post_status`: draft, submitted, under_review, published, rejected
- `media_type`: video, image, document
- `moderation_action`: submitted, approved, rejected, revision_requested

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login
- `GET /api/auth/profile` - Get profile (requires token)

### Posts
- `GET /api/posts` - List all posts
- `GET /api/posts/:slug` - Get single post
- `POST /api/posts` - Create post (researcher+)
- `PUT /api/posts/:id` - Update post
- `DELETE /api/posts/:id` - Delete post
- `POST /api/posts/:id/approve` - Approve (admin only)
- `POST /api/posts/:id/reject` - Reject (admin only)

### Categories & Tags
- `GET /api/categories` - List categories
- `POST /api/categories` - Create category (admin)
- `GET /api/tags` - List tags
- `POST /api/tags` - Create tag

### Media
- `GET /api/media` - List media
- `POST /api/media` - Upload media (researcher+)
- `DELETE /api/media/:id` - Delete media

### Users
- `GET /api/users` - List users (admin)
- `GET /api/users/:id` - Get user
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user (admin)

## Troubleshooting

### Database Connection Failed

**Error:** `connection refused` or `authentication failed`

**Solution:**
1. Verify PostgreSQL is running:
   ```bash
   pg_isready
   ```
2. Check credentials in `.env`
3. Test connection:
   ```bash
   psql -U postgres -d research_platform
   ```

### Port Already in Use

**Error:** `EADDRINUSE: address already in use`

**Solution:**
```bash
# Kill process on port 5000
lsof -ti:5000 | xargs kill

# Or change port in .env
PORT=5001
```

### Migration Failed

**Error:** Migration execution failed

**Solution:**
1. Check PostgreSQL logs
2. Verify database exists
3. Manually rollback:
   ```sql
   DELETE FROM schema_migrations WHERE filename = 'problematic_migration.sql';
   ```
4. Fix migration file and restart

### Cannot Login

**Error:** `Invalid credentials`

**Solution:**
1. Verify demo data was seeded:
   ```bash
   psql -U postgres -d research_platform -c "SELECT email FROM users;"
   ```
2. If empty, restart server to run migrations again

## Development Workflow

1. **Start Backend:**
   ```bash
   cd backend
   npm run dev
   ```

2. **Start Frontend (separate terminal):**
   ```bash
   cd ..
   npm run dev
   ```

3. **Test API:** Use Postman, curl, or frontend

4. **Make Changes:** Edit controllers, routes, etc.

5. **Restart Server:** nodemon auto-restarts on file changes

## Security Notes

⚠️ **Important for Production:**

1. Change `JWT_SECRET` to a strong random string
2. Update demo user passwords
3. Set `NODE_ENV=production`
4. Use environment variables (never commit `.env`)
5. Enable SSL for PostgreSQL connection
6. Set up proper firewall rules

## Next Steps

- Customize API endpoints in `src/routes/`
- Add business logic in `src/controllers/`
- Create new migrations for schema changes
- Add more seed data in `migrations/002_seed_demo_data.sql`
- Deploy to production (Heroku, Railway, AWS)

## Support

For issues:
1. Check server logs
2. Review PostgreSQL logs: `tail -f /var/log/postgresql/postgresql-*.log`
3. Enable debug mode: `NODE_ENV=development`

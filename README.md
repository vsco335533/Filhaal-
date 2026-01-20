# Research Platform Backend API

Express.js REST API for the Research & Media Publishing Platform.

## Features

- JWT-based authentication
- Role-based access control (Admin, Researcher)
- CRUD operations for posts, media, users
- Content moderation workflow
- PostgreSQL database with Supabase
- Input validation and sanitization
- Rate limiting and security headers
- Error handling and logging

## Tech Stack

- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **PostgreSQL** - Database (via Supabase)
- **JWT** - Authentication
- **bcryptjs** - Password hashing
- **express-validator** - Input validation
- **Helmet** - Security headers
- **CORS** - Cross-origin resource sharing

## Installation

```bash
cd backend
npm install
```

## Configuration

1. Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

2. Update `.env` with your configuration:
```env
PORT=5000
DATABASE_URL=your_postgresql_connection_string
JWT_SECRET=your_secret_key
FRONTEND_URL=http://localhost:5173
```

## Running the Server

### Development Mode (with auto-reload)
```bash
npm run dev
```

### Production Mode
```bash
npm start
```

The server will start at `http://localhost:5000`

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/profile` - Get current user profile (requires auth)

### Posts
- `GET /api/posts` - Get all posts (with filters)
- `GET /api/posts/:slug` - Get single post by slug
- `POST /api/posts` - Create post (requires researcher role)
- `PUT /api/posts/:id` - Update post (requires auth)
- `DELETE /api/posts/:id` - Delete post (requires auth)
- `POST /api/posts/:id/approve` - Approve post (requires admin)
- `POST /api/posts/:id/reject` - Reject post (requires admin)

### Categories & Tags
- `GET /api/categories` - Get all categories
- `POST /api/categories` - Create category (requires admin)
- `GET /api/tags` - Get all tags
- `POST /api/tags` - Create tag (requires auth)

### Media
- `GET /api/media` - Get all media (with filters)
- `POST /api/media` - Upload media (requires researcher role)
- `DELETE /api/media/:id` - Delete media (requires auth)

### Users
- `GET /api/users` - Get all users (requires admin)
- `GET /api/users/:id` - Get user by ID (requires auth)
- `PUT /api/users/:id` - Update user (requires auth)
- `DELETE /api/users/:id` - Delete user (requires admin)

## API Usage Examples

### Register User
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123",
    "full_name": "John Doe",
    "role": "researcher"
  }'
```

### Login
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123"
  }'
```

### Create Post (with JWT token)
```bash
curl -X POST http://localhost:5000/api/posts \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "title": "My Research Article",
    "content": "Article content here...",
    "type": "research",
    "status": "draft"
  }'
```

### Get All Published Posts
```bash
curl http://localhost:5000/api/posts?status=published
```

## Authentication

Protected endpoints require JWT token in the Authorization header:

```
Authorization: Bearer YOUR_JWT_TOKEN
```

Get token from `/api/auth/login` response.

## Role-Based Access

- **Public** - Can view published posts, media, categories
- **Researcher** - Can create/edit own posts, upload media
- **Admin** - Full access, can moderate content, manage users

## Database Connection

The backend connects to your Supabase PostgreSQL database. Ensure:

1. Database is running and accessible
2. Connection string is correct in `.env`
3. All migrations have been applied
4. RLS policies are configured

## Error Handling

API returns JSON error responses:

```json
{
  "error": "Error message here",
  "details": []
}
```

Common status codes:
- `200` - Success
- `201` - Created
- `400` - Bad request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not found
- `500` - Server error

## Security Features

- Helmet.js for security headers
- CORS configuration
- Rate limiting (100 requests per 15 minutes)
- Input validation and sanitization
- Password hashing with bcrypt
- JWT token expiration
- SQL injection prevention

## Development Tips

### Test API Health
```bash
curl http://localhost:5000/api/health
```

### View Request Logs
Morgan middleware logs all requests in development mode.

### Database Queries
All database queries use parameterized statements to prevent SQL injection.

## Connecting Frontend

Update frontend to use backend API:

```typescript
// In frontend src/lib/api.ts
const API_URL = 'http://localhost:5000/api';

export const api = {
  login: async (email, password) => {
    const response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    return response.json();
  },
  // ... other methods
};
```

## Deployment

### Environment Variables
Set these in production:
- `NODE_ENV=production`
- `DATABASE_URL` - PostgreSQL connection
- `JWT_SECRET` - Strong secret key
- `FRONTEND_URL` - Production frontend URL

### Deployment Platforms
- **Heroku** - `git push heroku main`
- **Railway** - Connect GitHub repo
- **AWS EC2** - PM2 process manager
- **DigitalOcean** - App Platform

## Troubleshooting

### Port Already in Use
```bash
lsof -ti:5000 | xargs kill
```

### Database Connection Failed
- Check `DATABASE_URL` in `.env`
- Verify Supabase project is active
- Check firewall/network settings

### JWT Token Invalid
- Verify `JWT_SECRET` matches across restarts
- Check token expiration time
- Ensure token is in correct format

## License

MIT

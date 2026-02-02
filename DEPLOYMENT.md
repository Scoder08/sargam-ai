# Sargam AI - Deployment Guide (v1)

This guide covers deploying Sargam AI to production.

## Architecture Overview

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Frontend      │────▶│    Backend      │────▶│   Database      │
│   (Vercel)      │     │   (Railway)     │     │  (PostgreSQL)   │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                               │
                               ▼
                        ┌─────────────────┐
                        │  External APIs  │
                        │ (Claude, AudD)  │
                        └─────────────────┘
```

## Prerequisites

- Node.js 18+
- Python 3.11+
- PostgreSQL (for production)
- Accounts: Vercel, Railway (or similar)

## Environment Variables

### Backend (.env)

```bash
# Flask
FLASK_ENV=production
SECRET_KEY=your-super-secret-key-change-this

# Database (PostgreSQL recommended for production)
DATABASE_URL=postgresql://user:password@host:5432/sargam

# JWT
JWT_SECRET_KEY=your-jwt-secret-key

# CORS (your frontend URL)
CORS_ORIGINS=https://your-app.vercel.app,https://yourdomain.com

# External APIs (optional but recommended)
ANTHROPIC_API_KEY=sk-ant-...  # For AI-powered tutorial parsing
OPENAI_API_KEY=sk-...         # Alternative to Anthropic
AUDD_API_KEY=...              # For audio recognition
```

### Frontend (.env.production)

```bash
VITE_API_URL=https://your-backend.railway.app/api/v1
```

## Deployment Steps

### 1. Deploy Backend (Railway)

#### Option A: Railway CLI

```bash
# Install Railway CLI
npm i -g @railway/cli

# Login
railway login

# Initialize project
cd apps/backend
railway init

# Add PostgreSQL
railway add postgresql

# Set environment variables
railway variables set FLASK_ENV=production
railway variables set SECRET_KEY=your-secret-key
railway variables set JWT_SECRET_KEY=your-jwt-secret
railway variables set CORS_ORIGINS=https://your-frontend.vercel.app

# Deploy
railway up
```

#### Option B: Railway Dashboard

1. Go to [railway.app](https://railway.app)
2. Create new project
3. Add PostgreSQL database
4. Connect GitHub repo
5. Set root directory to `apps/backend`
6. Add environment variables
7. Deploy

#### Backend Start Command

```bash
# Procfile or railway.toml start command
gunicorn -w 4 -k eventlet "app:create_app()"
```

### 2. Deploy Frontend (Vercel)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
cd apps/web
vercel

# Set environment variables in Vercel dashboard
# VITE_API_URL=https://your-backend.railway.app/api/v1
```

Or via Vercel Dashboard:
1. Import GitHub repo
2. Set root directory to `apps/web`
3. Framework: Vite
4. Add environment variables
5. Deploy

### 3. Initialize Database

After deploying the backend:

```bash
# Via Railway shell
railway run flask init-db
railway run flask seed-db
```

### 4. Create Admin User

```bash
# First, login to the app to create your user account
# Then make yourself admin via CLI

railway run flask make-admin <your-user-id>
```

## Admin Portal Access

Once deployed and admin status granted:

1. Go to `https://your-app.vercel.app/admin`
2. Login with your admin account
3. You can now:
   - Add tutorials (with AI-powered note parsing)
   - Manage users (add gems, grant premium)
   - View dashboard stats

## Tutorial Input Formats

The admin portal accepts multiple input formats:

### Sargam Notation
```
Sa Re Ga Ma Pa Dha Ni Sa'
```

### Western Notation
```
C4 D4 E4 F4 G4 A4 B4 C5
```

### Numbered Notation
```
1 2 3 4 5 6 7 1'
```

### MIDI Notes (Direct)
```
60, 62, 64, 65, 67, 69, 71, 72
```

### Free Text (AI Parsed)
```
G A B A G E G A B A G E D E G G (Pehle Bhi Main hook)
```

## Post-Deployment Checklist

- [ ] Backend deployed and healthy (`/health` endpoint returns 200)
- [ ] Frontend deployed and loading
- [ ] Database initialized (`flask init-db`)
- [ ] Sample data seeded (`flask seed-db`)
- [ ] Admin user created (`flask make-admin`)
- [ ] CORS configured correctly
- [ ] SSL/HTTPS enabled on both frontend and backend
- [ ] Environment variables secured
- [ ] Test login/signup flow
- [ ] Test admin portal access

## Monitoring

### Health Check
```
GET https://your-backend.railway.app/health
```

### Admin Stats
```
GET https://your-backend.railway.app/api/v1/admin/stats
Authorization: Bearer <admin-token>
```

## Troubleshooting

### CORS Errors
- Ensure `CORS_ORIGINS` includes your frontend URL
- Check for trailing slashes

### Database Connection
- Verify `DATABASE_URL` is correct
- Check if PostgreSQL addon is provisioned

### Admin Access Denied
- Verify user has `is_admin=True` in database
- Check JWT token is valid

### AI Parsing Not Working
- Verify `ANTHROPIC_API_KEY` or `OPENAI_API_KEY` is set
- Check API key has sufficient credits

## Scaling Considerations

For higher traffic:

1. **Backend**: Increase worker count in gunicorn
2. **Database**: Upgrade PostgreSQL plan
3. **Redis**: Add Redis for session storage and caching
4. **CDN**: Use Vercel's edge network (automatic)

## Security Checklist

- [ ] Change all default secrets
- [ ] Use HTTPS everywhere
- [ ] Rate limit API endpoints
- [ ] Validate all user input
- [ ] Keep dependencies updated
- [ ] Enable database backups

## CLI Commands Reference

```bash
# Database
flask init-db          # Create tables
flask seed-db          # Seed sample data

# User Management
flask make-admin <id>     # Grant admin access
flask revoke-admin <id>   # Revoke admin access
flask list-admins         # List all admins
flask add-gems <id> <amt> # Add gems to user
```

## Support

For issues:
1. Check logs in Railway dashboard
2. Check browser console for frontend errors
3. Review environment variables
4. Check database connectivity

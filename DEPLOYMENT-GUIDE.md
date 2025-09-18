# Aurum POS Web Hosting - Deployment Guide

Complete deployment guide for hosting the Aurum POS system on popular web hosting platforms.

## 🚀 Quick Start

1. **Clone this repository**
2. **Set up environment variables** (copy `.env.example` to `.env`)
3. **Configure your PostgreSQL database**
4. **Deploy to your chosen platform**

---

## 📋 Prerequisites

- **Node.js 18+** (most hosting platforms support this)
- **PostgreSQL database** (local or cloud-hosted)
- **Domain name** (optional but recommended)
- **SSL certificate** (handled automatically by most platforms)

---

## 🔧 Environment Setup

### 1. Copy Environment File
```bash
cp .env.example .env
```

### 2. Configure Required Variables
Edit your `.env` file with the following **REQUIRED** settings:

```env
# CRITICAL: Set to production for live deployment
NODE_ENV=production

# CRITICAL: Generate a secure 32+ character secret
SESSION_SECRET=your-super-secure-session-secret-at-least-32-characters

# CRITICAL: Your PostgreSQL database connection string
DATABASE_URL=postgresql://username:password@host:port/database_name

# RECOMMENDED: Limit CORS to your domain(s)
CORS_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
```

### 3. Generate a Secure Session Secret
```bash
# Option 1: Using OpenSSL
openssl rand -hex 32

# Option 2: Using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Option 3: Online generator
# Visit: https://generate-secret.vercel.app/32
```

---

## 🗄️ Database Setup

### PostgreSQL Database Options

#### Option 1: Cloud Database Services (Recommended)
- **Neon** (https://neon.tech) - Free tier available
- **DigitalOcean Managed Databases** - $15/month
- **AWS RDS PostgreSQL** - Variable pricing
- **Railway PostgreSQL** - $5/month
- **Supabase** - Free tier available

#### Option 2: VPS Self-Hosted PostgreSQL
If you're using a VPS (DigitalOcean Droplet, etc.), install PostgreSQL:

```bash
# Ubuntu/Debian
sudo apt update
sudo apt install postgresql postgresql-contrib

# Create database and user
sudo -u postgres psql
CREATE DATABASE aurum_pos;
CREATE USER aurum_user WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE aurum_pos TO aurum_user;
\q
```

### Database Connection Examples

```env
# Neon (recommended for beginners)
DATABASE_URL=postgresql://username:password@ep-hostname.neon.tech/aurum_pos?sslmode=require

# DigitalOcean Managed Database
DATABASE_URL=postgresql://username:password@db-hostname.db.ondigitalocean.com:25061/aurum_pos?sslmode=require

# Railway
DATABASE_URL=postgresql://username:password@hostname.railway.internal:5432/aurum_pos

# AWS RDS
DATABASE_URL=postgresql://username:password@instance.region.rds.amazonaws.com:5432/aurum_pos

# Self-hosted VPS
DATABASE_URL=postgresql://aurum_user:password@localhost:5432/aurum_pos
```

---

## 🌐 Hosting Platform Deployment

### 🔷 Railway.app (Recommended - Easiest)

1. **Connect your GitHub repo** to Railway
2. **Add PostgreSQL database** in Railway dashboard
3. **Set environment variables**:
   - `SESSION_SECRET` (generate a secure string)
   - `CORS_ORIGINS` (your domain)
   - `NODE_ENV=production`
4. **Deploy automatically** - Railway handles the rest!

**Pros:** Automatic deployments, built-in PostgreSQL, free tier
**Cost:** Free tier → $5/month when needed

---

### 🔷 DigitalOcean App Platform

1. **Create new app** from GitHub
2. **Configure build settings**:
   - Build Command: `npm run build`
   - Run Command: `npm run start`
3. **Add environment variables** in app settings
4. **Set up Managed Database** (PostgreSQL)
5. **Configure domains** in app settings

**Pros:** Full-featured, great performance, managed database
**Cost:** $12/month + database ($15/month)

---

### 🔷 Vercel (Serverless)

> **Note:** Requires serverless-compatible modifications

1. **Add `vercel.json`**:
```json
{
  "version": 2,
  "builds": [
    {
      "src": "server/index.ts",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "/server/index.ts"
    }
  ]
}
```

2. **Connect external PostgreSQL** (Neon, Supabase)
3. **Set environment variables** in Vercel dashboard
4. **Deploy from GitHub**

**Pros:** Free hosting, excellent performance, auto-scaling
**Cons:** Serverless limitations, requires external database

---

### 🔷 Heroku

1. **Install Heroku CLI**
2. **Create Heroku app**:
```bash
heroku create your-app-name
```

3. **Add PostgreSQL addon**:
```bash
heroku addons:create heroku-postgresql:mini
```

4. **Set environment variables**:
```bash
heroku config:set SESSION_SECRET=your-secret
heroku config:set CORS_ORIGINS=https://your-app.herokuapp.com
heroku config:set NODE_ENV=production
```

5. **Deploy**:
```bash
git push heroku main
```

**Pros:** Simple deployment, integrated database
**Cons:** More expensive, requires Heroku CLI

---

### 🔷 VPS Deployment (DigitalOcean Droplet, AWS EC2, etc.)

#### 1. Server Setup
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2 for process management
sudo npm install -g pm2

# Install PostgreSQL (if not using external database)
sudo apt install postgresql postgresql-contrib
```

#### 2. Application Deployment
```bash
# Clone your repository
git clone https://github.com/yourusername/aurum-pos-web-hosting.git
cd aurum-pos-web-hosting

# Install dependencies
npm install

# Create production environment file
cp .env.example .env
# Edit .env with your settings

# Build the application
npm run build

# Start with PM2
pm2 start dist/index.js --name aurum-pos

# Save PM2 configuration
pm2 save
pm2 startup
```

#### 3. Nginx Configuration (optional)
```nginx
server {
    listen 80;
    server_name yourdomain.com;
    
    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

**Pros:** Full control, cost-effective for high traffic
**Cons:** Requires server management skills

---

### 🔷 Shared Hosting (GoDaddy, cPanel, etc.)

> **Note:** Most shared hosting doesn't support Node.js. Check with your provider.

For shared hosting providers that support Node.js:

1. **Upload files** via FTP/File Manager
2. **Install dependencies** via SSH (if available):
```bash
npm install --production
```

3. **Create .env file** with your settings
4. **Configure subdomain** to point to your app directory
5. **Start application** (method varies by provider)

**Pros:** Familiar interface, often cheaper
**Cons:** Limited Node.js support, less control

---

## 🔒 Security Checklist

### Before Going Live:

- [ ] **Strong SESSION_SECRET** (32+ characters)
- [ ] **HTTPS enabled** (handled by most platforms)
- [ ] **CORS configured** (not set to `*` in production)
- [ ] **Database secured** (strong password, SSL if possible)
- [ ] **Environment variables secure** (not in code)
- [ ] **Admin password changed** (default: admin/aurum1705)

### Additional Security (VPS only):
```bash
# Enable firewall
sudo ufw enable
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS

# Set up automatic security updates
sudo apt install unattended-upgrades
```

---

## 📊 Database Migration

The application will automatically create database tables on first run. To manually run migrations:

```bash
# Generate migration files (if needed)
npm run db:generate

# Push schema to database
npm run db:push
```

---

## 🔄 Updates and Maintenance

### Updating Your Application

1. **Pull latest changes**:
```bash
git pull origin main
```

2. **Install new dependencies**:
```bash
npm install
```

3. **Rebuild application**:
```bash
npm run build
```

4. **Restart application** (method depends on platform):
```bash
# PM2 (VPS)
pm2 restart aurum-pos

# Railway/DigitalOcean - automatic on git push
# Heroku - automatic on git push
```

### Database Backups

```bash
# PostgreSQL backup
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d_%H%M%S).sql

# Restore from backup
psql $DATABASE_URL < backup_file.sql
```

---

## 🐛 Troubleshooting

### Common Issues:

**"Cannot connect to database"**
- Check DATABASE_URL format
- Verify database server is running
- Check network connectivity

**"Session secret error"**
- Ensure SESSION_SECRET is at least 32 characters
- Check environment variables are loaded

**"Build failed"**
- Run `npm run check` to verify TypeScript
- Check Node.js version (18+ required)

**"404 errors for static files"**
- Ensure `npm run build` completed successfully
- Check build output in `dist/public`

### Getting Help:

- Check application logs for error details
- Verify environment variables are set correctly
- Test database connection separately
- Contact your hosting provider for platform-specific issues

---

## 📈 Performance Optimization

### Production Optimizations:

1. **Enable gzip compression** (handled by most platforms)
2. **Use CDN for static assets** (optional)
3. **Set up database connection pooling** (for high traffic)
4. **Monitor application performance**
5. **Set up health checks**

### Monitoring:
```javascript
// Health check endpoint (already included)
GET /api/health
```

---

## 💰 Estimated Monthly Costs

| Platform | Hosting | Database | Total |
|----------|---------|----------|-------|
| Railway | Free-$5 | Free-$5 | $0-10 |
| DigitalOcean | $12 | $15 | $27 |
| Vercel + Neon | Free | Free | $0 |
| Heroku | $7 | $9 | $16 |
| VPS + Self-hosted | $6 | $0 | $6 |

---

## 🎯 Go-Live Checklist

- [ ] Domain name purchased and configured
- [ ] SSL certificate active (HTTPS)
- [ ] Database created and accessible
- [ ] Environment variables configured
- [ ] Application built and deployed
- [ ] Admin user password changed
- [ ] CORS configured for your domain
- [ ] Backup strategy in place
- [ ] Monitoring set up

---

## 📞 Support

For deployment issues or questions:
- Check the troubleshooting section above
- Review your hosting platform's documentation  
- Contact your hosting provider's support team
- Verify all environment variables are correctly set

---

**🎉 Congratulations!** Your Aurum POS system should now be live and ready for production use.

Remember to change the default admin credentials (username: `admin`, password: `aurum1705`) after your first login!
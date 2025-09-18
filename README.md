# 🚗💎 Aurum POS - Web Hosting Version

Complete Point of Sale system for car wash businesses, optimized for web hosting platforms.

[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-13+-blue.svg)](https://www.postgresql.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## ✨ Features

- 🏪 **Complete POS Interface** - Full point of sale system for car wash services
- 👥 **Customer Management** - Customer profiles, vehicle tracking, service history
- 🔧 **Service Management** - Service catalog, pricing, combos, and packages
- 📋 **Work Orders** - Track jobs from reception to completion
- 📊 **Reports & Analytics** - Sales reports, performance metrics, business insights
- 💼 **Inventory Management** - Stock tracking, alerts, and reorder management
- 🇵🇾 **Tax Compliance** - Paraguayan timbrado system integration
- 🔐 **User Management** - Role-based access control (admin, user, readonly)
- 🌐 **Web-Ready** - Optimized for hosting on any Node.js platform

---

## 🚀 Quick Start

### 1. Deploy to Railway (Recommended)
[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/template/postgres)

1. Click the Railway button above
2. Set your environment variables
3. Deploy automatically!

### 2. Manual Setup

```bash
# 1. Clone the repository
git clone https://github.com/nayibkorfan0-jpg/aurum-pos-web-hosting.git
cd aurum-pos-web-hosting

# 2. Install dependencies
npm install

# 3. Set up environment variables
cp .env.example .env
# Edit .env with your PostgreSQL database and settings

# 4. Build the application
npm run build

# 5. Start in production
npm run start
```

---

## 🛠️ Tech Stack

### Frontend
- **React 18** with TypeScript
- **Tailwind CSS** for styling
- **Shadcn/ui** components
- **Vite** for building
- **TanStack Query** for data fetching

### Backend
- **Express.js** with TypeScript
- **Drizzle ORM** with PostgreSQL
- **Passport.js** for authentication
- **Express Session** for session management
- **Zod** for validation

### Database
- **PostgreSQL 13+** (production)
- **JSON File Storage** (fallback/development)

---

## 📋 System Requirements

- **Node.js 18+**
- **PostgreSQL 13+** database
- **2GB RAM minimum**
- **1GB disk space**
- **SSL Certificate** (handled by hosting platforms)

---

## 🌐 Supported Hosting Platforms

- ✅ **Railway** (recommended - easiest setup)
- ✅ **DigitalOcean App Platform**
- ✅ **Vercel** (with external database)
- ✅ **Heroku**
- ✅ **AWS** (EC2, Elastic Beanstalk)
- ✅ **VPS** (DigitalOcean, Linode, etc.)
- ✅ **Google Cloud Platform**

---

## 🔧 Environment Variables

Copy `.env.example` to `.env` and configure:

```env
# Required
DATABASE_URL=postgresql://user:pass@host:port/db
SESSION_SECRET=your-super-secure-32-char-secret
NODE_ENV=production

# Optional
CORS_ORIGINS=https://yourdomain.com
PORT=5000
```

---

## 📚 Documentation

- **[🚀 Deployment Guide](DEPLOYMENT-GUIDE.md)** - Complete hosting setup instructions
- **[⚙️ Environment Setup](.env.example)** - Environment variable configuration
- **[🗄️ Database Schema](shared/schema.ts)** - Database structure and relationships

---

## 🔐 Default Credentials

**⚠️ IMPORTANT: Change these immediately after deployment!**

- **Username:** `admin`
- **Password:** `aurum1705`

---

## 📊 Database Management

```bash
# Push schema changes to database
npm run db:push

# Generate migration files
npm run db:generate

# Run migrations
npm run db:migrate
```

---

## 🔄 Development vs Production

### Development Features
- Hot reload with Vite
- In-memory storage option
- Debug logging
- CORS set to `*`

### Production Features
- Optimized build
- PostgreSQL database required
- Secure session management
- Restricted CORS
- Security headers

---

## 📱 Responsive Design

The application is fully responsive and works on:
- 💻 **Desktop** - Full POS interface
- 📱 **Tablet** - Touch-optimized for point of sale
- 📱 **Mobile** - Management and reports on the go

---

## 🔒 Security Features

- ✅ Password hashing with bcrypt
- ✅ Session-based authentication
- ✅ CORS protection
- ✅ SQL injection prevention
- ✅ XSS protection
- ✅ Rate limiting ready
- ✅ Environment variable security

---

## 🌍 Localization

- 🇪🇸 **Spanish** - Primary language (Paraguay)
- 🇵🇾 **Paraguayan Tax System** - Full timbrado compliance
- 💱 **Currency** - Paraguayan Guaraní (GS)

---

## 📈 Performance

- ⚡ **Fast Loading** - Optimized build with Vite
- 🗄️ **Efficient Database** - Drizzle ORM with connection pooling
- 🎯 **Smart Caching** - TanStack Query for client-side caching
- 📦 **Small Bundle** - Code splitting and tree shaking

---

## 🛡️ License

This project is licensed under the MIT License - see the [LICENSE](LICENSE.txt) file for details.

---

## 🤝 Support

For deployment help or questions:

1. **Check the [Deployment Guide](DEPLOYMENT-GUIDE.md)**
2. **Review the environment variables**
3. **Verify your database connection**
4. **Contact your hosting provider's support**

---

## 🎯 Deployment Checklist

- [ ] PostgreSQL database created
- [ ] Environment variables configured
- [ ] Domain name set up (optional)
- [ ] Application deployed
- [ ] Admin credentials changed
- [ ] Database tables created (automatic)
- [ ] SSL certificate active
- [ ] CORS configured for your domain

---

## 🚀 Deploy Now

Choose your preferred hosting platform:

| Platform | Complexity | Cost | Setup Time |
|----------|------------|------|------------|
| [Railway](https://railway.app) | ⭐ Easy | $0-10/mo | 5 minutes |
| [DigitalOcean](https://digitalocean.com) | ⭐⭐ Medium | $27/mo | 15 minutes |
| [Vercel](https://vercel.com) | ⭐⭐ Medium | Free | 10 minutes |
| VPS | ⭐⭐⭐ Hard | $6+/mo | 30+ minutes |

**🎉 Ready to launch your car wash POS system!**

---

*Made with ❤️ for car wash businesses. Deploy once, serve customers everywhere!*
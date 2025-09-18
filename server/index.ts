import express, { type Request, Response, NextFunction } from "express";
import session from "express-session";
import { registerRoutes } from "./routes";
import { log, serveStatic as serveStaticProd } from "./static";

// Import memory session store
import MemoryStore from 'memorystore';
const MemStore = MemoryStore(session);

const app = express();

// Enable trust proxy for HTTPS environments (reverse proxies)
app.set("trust proxy", 1);

// Configure CORS for production environments
app.use((req, res, next) => {
  const origin = req.headers.origin;
  const allowedOrigins = process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',') : ['*'];
  
  // Check if origin is allowed
  if (allowedOrigins.includes('*') || (origin && allowedOrigins.includes(origin))) {
    res.header('Access-Control-Allow-Origin', origin || '*');
  }
  
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, Cookie');
  res.header('Access-Control-Allow-Credentials', 'true');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  
  next();
});

// Validate required environment variables
if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 32) {
  console.error('CRITICAL SECURITY ERROR: SESSION_SECRET environment variable is required and must be at least 32 characters long');
  process.exit(1);
}

// Session configuration - optimized for production hosting environments
app.use(session({
  secret: process.env.SESSION_SECRET, // No fallback - required for security
  store: new MemStore({
    checkPeriod: 86400000 // Prune expired entries every 24h
  }),
  resave: false,
  saveUninitialized: false,
  proxy: true, // Required for trust proxy
  cookie: {
    secure: process.env.NODE_ENV === 'production', // HTTPS only in production
    httpOnly: true, // Prevent XSS attacks
    path: "/", // Explicit path
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days for stability
    sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax'
  },
  name: 'aurum-pos-session',
  rolling: true, // Reset expiration on each request
}));

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    const { setupVite } = await import("./vite");
    await setupVite(app, server);
  } else {
    serveStaticProd(app);
  }

  // Serve the app on the port specified in the environment variable PORT
  // Default to 5000 if not specified - compatible with most hosting providers
  const port = parseInt(process.env.PORT || '5000', 10);
  
  // Prevent double-binding on reloads
  if ((globalThis as any).__httpServer) {
    log(`Server already running on port ${port}`);
    return;
  }
  
  // Store server reference for graceful shutdown
  let httpServer: any = null;
  
  httpServer = server.listen({
    port,
    host: "0.0.0.0", // Allow external connections for hosting providers
  }, () => {
    log(`🚀 Aurum POS Server running on port ${port}`);
    log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
    (globalThis as any).__httpServer = httpServer;
  });
  
  // Graceful shutdown to free port on restart
  const shutdown = () => {
    try {
      if (httpServer) {
        httpServer.close(() => process.exit(0));
      } else {
        process.exit(0);
      }
    } catch {
      process.exit(0);
    }
  };
  
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
})();

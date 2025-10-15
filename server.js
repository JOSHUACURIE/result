// server.js
const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const morgan = require("morgan");
const helmet = require("helmet");
const compression = require("compression");

// Load environment variables
dotenv.config();

// Import database connection and models
const { connectDB, sequelize } = require("./config/db");

// Import routes
const teacherRoutes = require('./routes/teacherRoutes');
const userRoutes = require("./routes/userRoutes");
const classRoutes = require("./routes/classRoutes");
const streamRoutes = require("./routes/streamRoutes");
const studentRoutes = require("./routes/studentRoutes");
const subjectRoutes = require("./routes/subjectRoutes");
const scoreRoutes = require("./routes/scoreRoutes");
const commentRoutes = require("./routes/commentRoutes");
const termRoutes = require("./routes/termRoutes");
const resultRoutes = require("./routes/resultRoutes");
const smsRoutes = require("./routes/smsRoutes");
const assignmentRoutes = require("./routes/assignmentRoutes");

// Middleware
const errorHandler = require("./middleware/errorMiddleware");
const requestLogger = require("./middleware/requestLogger");

const app = express();

// ✅ Enhanced CORS Configuration
const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:3000",
  "https://resultmanagement.vercel.app",
  "https://resultmanagement-*.vercel.app",
  "https://resultmanagement-git-*.vercel.app"
];

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, curl, postman, server-to-server calls)
    if (!origin) return callback(null, true);
    
    // Check exact match in allowed origins
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    
    // Check for Vercel preview deployments pattern
    const vercelPattern = /https:\/\/resultmanagement(-git-[a-zA-Z0-9-]+)?(-[a-zA-Z0-9-]+)?\.vercel\.app/;
    if (vercelPattern.test(origin)) {
      return callback(null, true);
    }
    
    // Check for local development variations
    if (origin.startsWith("http://localhost:") || origin.startsWith("https://localhost:")) {
      return callback(null, true);
    }
    
    console.log(`❌ CORS blocked: ${origin}`);
    console.log(`📋 Allowed origins:`, allowedOrigins);
    return callback(new Error(`CORS policy: Origin ${origin} not allowed`), false);
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS", "HEAD"],
  allowedHeaders: [
    "Content-Type", 
    "Authorization", 
    "Accept", 
    "X-Requested-With",
    "X-API-Key",
    "Origin",
    "Access-Control-Request-Method",
    "Access-Control-Request-Headers"
  ],
  exposedHeaders: [
    "Content-Range",
    "X-Content-Range",
    "Content-Disposition"
  ],
  preflightContinue: false,
  optionsSuccessStatus: 204
}));

// Handle preflight requests
app.options('*', cors());

// Security & performance
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: false // Disable if causing issues with external resources
}));
app.use(compression());
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// Body parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(requestLogger);

// Enhanced test route with CORS headers
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "✅ Backend is running successfully",
    environment: process.env.NODE_ENV || "development",
    timestamp: new Date().toISOString(),
    cors: {
      allowedOrigins: allowedOrigins,
      currentOrigin: req.headers.origin || 'none'
    }
  });
});

// Enhanced health check
app.get("/health", async (req, res) => {
  const healthCheck = {
    success: true,
    status: "healthy",
    environment: process.env.NODE_ENV || "development",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    cors: {
      origin: req.headers.origin || 'none',
      allowed: true
    }
  };

  try {
    await sequelize.authenticate();
    healthCheck.database = "connected";
    res.json(healthCheck);
  } catch (error) {
    healthCheck.success = false;
    healthCheck.status = "unhealthy";
    healthCheck.database = "disconnected";
    healthCheck.error = error.message;
    res.status(503).json(healthCheck);
  }
});

// API routes
app.use("/api/teachers", teacherRoutes);
app.use("/api/users", userRoutes);
app.use("/api/classes", classRoutes);
app.use("/api/streams", streamRoutes);
app.use("/api/students", studentRoutes);
app.use("/api/subjects", subjectRoutes);
app.use("/api/scores", scoreRoutes);
app.use("/api/comments", commentRoutes);
app.use("/api/terms", termRoutes);
app.use("/api/results", resultRoutes);
app.use("/api/sms", smsRoutes);
app.use("/api/assignments", assignmentRoutes);

// Enhanced 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
    path: req.originalUrl,
    method: req.method,
    timestamp: new Date().toISOString(),
    availableRoutes: [
      "/api/teachers",
      "/api/users",
      "/api/students",
      "/api/subjects",
      "/api/health"
    ]
  });
});

// Error handler
app.use(errorHandler);

// Start server
const startServer = async () => {
  try {
    const env = process.env.NODE_ENV || "development";
    console.log(`🚀 Starting server in ${env} mode...`);
    console.log(`🌍 CORS Allowed Origins:`, allowedOrigins);
    
    await connectDB();
    console.log("✅ Database connected successfully");

    const PORT = process.env.PORT || 5000;
    const server = app.listen(PORT, '0.0.0.0', () => {
      console.log(`🌐 Server running on port ${PORT}`);
      console.log(`📍 Health check: http://0.0.0.0:${PORT}/health`);
      console.log(`📍 API Base: http://0.0.0.0:${PORT}/api`);
      console.log(`🔧 Environment: ${env}`);
    });

    // Enhanced server error handling
    server.on('error', (error) => {
      if (error.code === 'EADDRINUSE') {
        console.error(`❌ Port ${PORT} is already in use`);
      } else {
        console.error('❌ Server error:', error);
      }
      process.exit(1);
    });

  } catch (error) {
    console.error("💥 Failed to start server:", error.message);
    process.exit(1);
  }
};

startServer();

// Graceful shutdown
const shutdown = async (signal) => {
  console.log(`\n${signal} received. Shutting down gracefully...`);
  try {
    await sequelize.close();
    console.log("✅ Database connections closed");
    process.exit(0);
  } catch (err) {
    console.error("❌ Error during shutdown:", err.message);
    process.exit(1);
  }
};

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("unhandledRejection", (reason, promise) => {
  console.error("💥 UNHANDLED REJECTION at:", promise, "reason:", reason);
});
process.on("uncaughtException", (error) => {
  console.error("💥 UNCAUGHT EXCEPTION:", error);
  process.exit(1);
});

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

// ✅ Allowed origins for CORS
const allowedOrigins = [
  "http://localhost:5173",                  // Dev frontend
  "https://resultmanagement.vercel.app"    // Production frontend
];

app.use(cors({
  origin: function(origin, callback) {
    if (!origin) return callback(null, true); // allow server-to-server or curl
    if (allowedOrigins.indexOf(origin) === -1) {
      const msg = `❌ CORS error: ${origin} not allowed`;
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
  credentials: true,
  methods: ["GET","POST","PUT","PATCH","DELETE","OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "Accept"]
}));

// Security & performance
app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use(compression());
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// Body parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(requestLogger);

// Test route
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "✅ Backend is running",
    environment: process.env.NODE_ENV || "development",
    timestamp: new Date().toISOString()
  });
});

// Health check
app.get("/health", async (req, res) => {
  const healthCheck = {
    success: true,
    status: "healthy",
    environment: process.env.NODE_ENV || "development",
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
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

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
    path: req.originalUrl,
    method: req.method,
    timestamp: new Date().toISOString(),
  });
});

// Error handler
app.use(errorHandler);

// Start server
const startServer = async () => {
  try {
    const env = process.env.NODE_ENV || "development";
    console.log(`🚀 Starting server in ${env} mode...`);
    
    await connectDB(); // Connect to Supabase/Postgres
    console.log("✅ Database connected");

    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
      console.log(`🌐 Server running on port ${PORT}`);
      console.log(`📍 Health check: /health`);
    });
  } catch (error) {
    console.error("💥 Failed to start server:", error.message);
    process.exit(1);
  }
};

startServer();

// Graceful shutdown
const shutdown = async (signal) => {
  console.log(`\n${signal} received. Shutting down...`);
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
process.on("unhandledRejection", (reason) => {
  console.error("💥 UNHANDLED REJECTION:", reason);
});
process.on("uncaughtException", (error) => {
  console.error("💥 UNCAUGHT EXCEPTION:", error);
});

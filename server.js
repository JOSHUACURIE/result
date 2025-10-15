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

// Routes
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

// ✅ FIXED: Simple CORS configuration
app.use(cors({
  origin: [
    "http://localhost:5173",
    "http://localhost:3000", 
    "https://resultmanagement.vercel.app",
    "https://resultmanagement-*.vercel.app"
  ],
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "Accept"]
}));

// ✅ FIXED: Remove problematic wildcard options handler
// Express automatically handles OPTIONS requests with cors()

// Security & performance middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));
app.use(compression());

app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// Body Parsing Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(requestLogger);

// Test route
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "✅ School Management System Backend is Running",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
    database: "Supabase PostgreSQL with Sequelize ORM",
    cors: {
      allowedOrigin: "Multiple origins including Vercel",
      status: "enabled"
    },
    features: [
      "Teacher Management",
      "Student Management", 
      "Subject Management",
      "Class & Stream Management",
      "Score Tracking",
      "Result Generation",
      "Assignment Management",
      "Term Management",
      "SMS Integration",
      "Comment System"
    ]
  });
});

// Health check route
app.get("/health", async (req, res) => {
  const healthCheck = {
    success: true,
    status: "healthy",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    database: "connected"
  };

  try {
    await sequelize.authenticate();
    res.json(healthCheck);
  } catch (error) {
    healthCheck.success = false;
    healthCheck.status = "unhealthy";
    healthCheck.database = "disconnected";
    healthCheck.error = error.message;
    
    res.status(503).json(healthCheck);
  }
});

// API Routes
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

// ✅ FIXED: 404 handler without wildcard
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
      "/api/classes",
      "/api/streams",
      "/api/students",
      "/api/subjects",
      "/api/scores",
      "/api/comments",
      "/api/terms",
      "/api/results",
      "/api/sms",
      "/api/assignments",
      "/health"
    ]
  });
});

// Error handler
app.use(errorHandler);

const startServer = async () => {
  try {
    const env = process.env.NODE_ENV || "development";
    // ✅ FIXED: Proper template literals
    console.log(`🚀 Starting School Management System Server...`);
    console.log(`🌍 Environment: ${env}`);
    
    // Step 1: Connect to database
    console.log(`🔄 Connecting to ${env} database...`);
    await connectDB();
    
    // Step 3: Start the server
    const PORT = process.env.PORT || 5000;
    const server = app.listen(PORT, '0.0.0.0', () => {
      console.log(`✅ Server successfully started!`);
      console.log(`📍 Port: ${PORT}`);
      console.log(`🔗 API Base URL: http://0.0.0.0:${PORT}/api`);
      console.log(`❤️  Health check: http://0.0.0.0:${PORT}/health`);
      console.log(`🗄️  Database: Supabase PostgreSQL (${env})`);
      console.log(`⏰ Started at: ${new Date().toISOString()}`);
      console.log(`📊 Available models: User, Teacher, Student, Subject, Class, Stream, Score, Term, Assignment`);
      console.log(`🌐 CORS: Enabled for multiple origins including Vercel`);
      console.log(`🔐 Security: Enhanced CORS configuration`);
      console.log(`\n📋 Available API Endpoints:`);
      console.log(`   👨‍🏫  Teachers:    /api/teachers`);
      console.log(`   👥  Users:       /api/users`);
      console.log(`   🏫  Classes:     /api/classes`);
      console.log(`   📚  Streams:     /api/streams`);
      console.log(`   🎓  Students:    /api/students`);
      console.log(`   📖  Subjects:    /api/subjects`);
      console.log(`   📊  Scores:      /api/scores`);
      console.log(`   💬  Comments:    /api/comments`);
      console.log(`   📅  Terms:       /api/terms`);
      console.log(`   📈  Results:     /api/results`);
      console.log(`   📱  SMS:         /api/sms`);
      console.log(`   🔗  Assignments: /api/assignments`);
    });

    return server;
  } catch (error) {
    console.error("💥 CRITICAL: Failed to start server");
    console.error("Error:", error.message);
    
    if (error.name === 'SequelizeConnectionError') {
      console.error("🔌 Database Connection Issue:");
      console.error("   - Check your database credentials");
      console.error("   - Verify Supabase connection settings");
      console.error("   - Ensure database server is running");
    }
    
    console.error("Full error details:", error);
    process.exit(1);
  }
};

const gracefulShutdown = async (signal) => {
  console.log(`\n${signal} signal received: starting graceful shutdown...`);
  
  try {
    console.log('📦 Closing database connections...');
    await sequelize.close();
    console.log('✅ Database connections closed');
    
    console.log('👋 Server shutdown completed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during shutdown:', error.message);
    process.exit(1);
  }
};

// Handle graceful shutdown
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('💥 UNCAUGHT EXCEPTION! Shutting down...');
  console.error('Error:', error);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 UNHANDLED REJECTION! Shutting down...');
  console.error('Promise:', promise);
  console.error('Reason:', reason);
  process.exit(1);
});

// Handle process warnings
process.on('warning', (warning) => {
  console.warn('⚠️  Process Warning:', warning.name);
  console.warn('Message:', warning.message);
  console.warn('Stack:', warning.stack);
});

// Start the server
startServer();

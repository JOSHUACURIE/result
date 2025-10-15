// config/db.js
const { Sequelize } = require("sequelize");
require("dotenv").config();

const env = process.env.NODE_ENV || "development";

// Common base configuration
const baseConfig = {
  dialect: "postgres",
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false, // Needed for Supabase + Render
    },
  },
  logging: env === "development" ? console.log : false,
  pool: {
    max: 10,
    min: 0,
    acquire: 60000,
    idle: 10000,
  },
  retry: {
    max: 3,
  },
};

// Environment-specific settings
const config = {
  development: {
    ...baseConfig,
    database: process.env.DEV_DB_NAME || "postgres",
    username: process.env.DEV_DB_USER || "postgres",
    password: process.env.DEV_DB_PASSWORD || "",
    host: process.env.DEV_DB_HOST || "localhost",
    port: process.env.DEV_DB_PORT || 5432,
  },
  production: {
    ...baseConfig,
    database: process.env.PROD_DB_NAME || "postgres",
    username: process.env.PROD_DB_USER || "postgres",
    password: process.env.PROD_DB_PASSWORD || "",
    host: process.env.PROD_DB_HOST || "localhost",
    port: process.env.PROD_DB_PORT || 5432,
  },
};

// Create Sequelize instance
const sequelize = new Sequelize(
  config[env].database,
  config[env].username,
  config[env].password,
  config[env]
);

// Connect to DB
const connectDB = async () => {
  try {
    console.log(`🔄 Connecting to ${env.toUpperCase()} Supabase PostgreSQL...`);
    await sequelize.authenticate();
    console.log(`✅ Connected successfully to ${env.toUpperCase()} Supabase PostgreSQL`);
  } catch (error) {
    console.error(`❌ Database connection failed (${env}):`, error.message);
    console.log("🔧 Database Config:", {
      host: config[env].host,
      port: config[env].port,
      database: config[env].database,
      username: config[env].username,
      environment: env,
    });
    console.log("💡 Tips:");
    console.log("  • Check your Supabase credentials and password");
    console.log("  • Ensure SSL is enabled (Render requires it)");
    console.log("  • Verify Supabase isn't paused (free tiers sleep after inactivity)");
    throw error;
  }
};

module.exports = { sequelize, connectDB };

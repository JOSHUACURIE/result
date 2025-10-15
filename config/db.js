// config/db.js
const { Sequelize } = require("sequelize");
require("dotenv").config();

const env = process.env.NODE_ENV || "development";

// Choose config for each environment
const config = {
  development: {
    database: process.env.DEV_DB_NAME || "postgres",
    username: process.env.DEV_DB_USER || "postgres",
    password: process.env.DEV_DB_PASSWORD || "password",
    host: process.env.DEV_DB_HOST || "db.supabase.co",
    port: process.env.DEV_DB_PORT || 5432,
    dialect: "postgres",
    dialectOptions: {
      ssl: { require: true, rejectUnauthorized: false },
      connectTimeout: 30000,
    },
    logging: console.log,
    pool: { max: 5, min: 0, acquire: 60000, idle: 10000 },
    retry: { max: 2 },
  },
  production: {
    database: process.env.PROD_DB_NAME || "postgres",
    username: process.env.PROD_DB_USER || "postgres",
    password: process.env.PROD_DB_PASSWORD || "password",
    host: process.env.PROD_DB_HOST || "db.supabase.co",
    port: process.env.PROD_DB_PORT || 5432,
    dialect: "postgres",
    dialectOptions: {
      ssl: { require: true, rejectUnauthorized: false },
      connectTimeout: 30000,
    },
    logging: false,
    pool: { max: 5, min: 0, acquire: 60000, idle: 10000 },
    retry: { max: 2 },
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
    console.log(`🔄 Connecting to ${env} Supabase PostgreSQL...`);
    await sequelize.authenticate();
    console.log(`✅ Connected to ${env} Supabase PostgreSQL successfully`);
    return sequelize; // Return the instance for potential use
  } catch (error) {
    console.error(`❌ Supabase connection failed (${env}):`, error.message);

    if (env === "development") {
      console.log("💡 Check your DEV_DB_* environment variables or internet connection");
    } else if (env === "production") {
      console.log("💡 Check your PROD_DB_* environment variables");
    }

    console.log("🔧 Database Configuration:", {
      host: config[env].host,
      port: config[env].port,
      database: config[env].database,
      username: config[env].username,
      environment: env
    });

    throw error; // Re-throw to let the server handle it
  }
};

// ✅ Export both as an object for consistent imports
module.exports = {
  sequelize,
  connectDB
};
const { Sequelize } = require("sequelize");
require("dotenv").config();

const env = process.env.NODE_ENV || "development";

const baseConfig = {
  dialect: "postgres",
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false,
    },
  },
  logging: false,
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000,
  },
  retry: {
    max: 3,
  },
};

const config = {
  development: {
    ...baseConfig,
    database: process.env.DEV_DB_NAME,
    username: process.env.DEV_DB_USER,
    password: process.env.DEV_DB_PASSWORD,
    host: process.env.DEV_DB_HOST,
    port: process.env.DEV_DB_PORT,
  },
  production: {
    ...baseConfig,
    database: process.env.PROD_DB_NAME,
    username: process.env.PROD_DB_USER,
    password: process.env.PROD_DB_PASSWORD,
    host: process.env.PROD_DB_HOST,
    port: process.env.PROD_DB_PORT,
  },
};

const currentConfig = config[env];

const sequelize = new Sequelize(
  currentConfig.database,
  currentConfig.username,
  currentConfig.password,
  currentConfig
);

const connectDB = async () => {
  try {
    console.log(`🔄 Connecting to ${env.toUpperCase()} database...`);
    await sequelize.authenticate();
    console.log(`✅ Database connected successfully to ${env.toUpperCase()}`);
    return true;
  } catch (error) {
    console.error(`❌ Database connection failed:`, error.message);
    console.log("🔧 Connection details:", {
      host: currentConfig.host,
      port: currentConfig.port,
      database: currentConfig.database,
      username: currentConfig.username,
      environment: env
    });
    throw error;
  }
};

module.exports = { sequelize, connectDB };

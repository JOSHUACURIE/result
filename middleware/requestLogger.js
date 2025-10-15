const logger = require("../utils/logger"); // your Winston logger

const requestLogger = (req, res, next) => {
  const { method, originalUrl } = req;
  const timestamp = new Date().toISOString();

  logger.info(`[${timestamp}] ${method} ${originalUrl}`);
  console.log(`[${timestamp}] ${method} ${originalUrl}`);

  next();
};

module.exports = requestLogger;

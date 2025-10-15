
import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();

/**
 * Generate JWT token
 * @param {Object} payload - data to sign (e.g., user id, roles)
 * @param {string} expiresIn - expiry duration (default 30 days)
 * @returns {string} JWT token
 */
const generateToken = (payload, expiresIn = "30d") => {
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn,
  });
};

export default generateToken;

const express = require("express");
const router = express.Router();
const classController = require("../controllers/classController");
const { authenticate, authorize } = require("../middleware/authMiddleware");

// All routes require authentication
router.use(authenticate);

// ========================================
// ✅ CLASS MANAGEMENT ROUTES
// ========================================

// Create a new class (Admin only)
router.post("/", authorize(['dos', 'principal']), classController.createClass);

// Get all classes (All authenticated users)
router.get("/", classController.getClasses);

// Get class by ID with detailed information (All authenticated users)
router.get("/:id", classController.getClassById);

// Get class statistics (All authenticated users)
router.get("/:id/stats", classController.getClassStats);

// Update class information (Admin only)
router.put("/:id", authorize(['dos', 'principal']), classController.updateClass);

// Soft delete class (Admin only)
router.delete("/:id", authorize(['dos', 'principal']), classController.deleteClass);

// Reactivate a class (Admin only)
router.patch("/:id/reactivate", authorize(['dos', 'principal']), classController.reactivateClass);

module.exports = router;
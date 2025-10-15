const express = require("express");
const router = express.Router();
const studentController = require("../controllers/studentController");
const { authenticate, authorize } = require("../middleware/authMiddleware");

// All routes require authentication
router.use(authenticate);

// ========================================
// ✅ STUDENT MANAGEMENT ROUTES
// ========================================

// Create a new student (Admin only)
router.post("/", authorize(['dos', 'principal']), studentController.createStudent);

// Get all students with filtering (All authenticated users)
router.get("/", studentController.getAllStudents);

// Get students by class and stream (All authenticated users)
router.get("/class/:class_id/stream/:stream_id", studentController.getStudentsByClassStream);

// Get student by ID (All authenticated users)
router.get("/:student_id", studentController.getStudentById);

// Get student with scores (All authenticated users)
router.get("/:student_id/scores", studentController.getStudentWithScores);

// Get student statistics (All authenticated users)
router.get("/:student_id/stats", studentController.getStudentStats);

// Update student information (Admin only)
router.put("/:student_id", authorize(['dos', 'principal']), studentController.updateStudent);

// Delete student (soft delete - Admin only)
router.delete("/:student_id", authorize(['dos', 'principal']), studentController.deleteStudent);

// Reactivate student (Admin only)
router.patch("/:student_id/reactivate", authorize(['dos', 'principal']), studentController.reactivateStudent);

// Bulk update students (Admin only)
router.patch("/bulk/update", authorize(['dos', 'principal']), studentController.bulkUpdateStudents);

module.exports = router;
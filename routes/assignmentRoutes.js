const express = require("express");
const router = express.Router();
const assignmentController = require("../controllers/assignmentController");
const { authenticate, authorize, authorizeTeacherAssignment } = require("../middleware/authMiddleware");

// Public route - check if teacher is assigned
router.get("/check-assignment", assignmentController.isTeacherAssigned);

// All routes require authentication
router.use(authenticate);

// Teacher-specific routes
router.get("/my-assignments", authorize(['teacher']), (req, res) => {
  req.params.teacher_id = req.user.teacher_id;
  assignmentController.getTeacherAssignments(req, res);
});

router.get("/my-assignments/:id/students", authorize(['teacher']), authorizeTeacherAssignment, assignmentController.getAssignmentStudents);

// General access routes
router.get("/teacher/:teacher_id", authorize(['teacher', 'dos', 'principal']), assignmentController.getTeacherAssignments);
router.get("/class/:class_id/stream/:stream_id", authorize(['teacher', 'dos', 'principal']), assignmentController.getClassAssignments);
router.get("/:id", assignmentController.getAssignmentById);
router.get("/:id/stats", assignmentController.getAssignmentStats);

// Admin routes
router.post("/", authorize(['dos', 'principal']), assignmentController.createAssignment);
router.post("/bulk", authorize(['dos', 'principal']), assignmentController.bulkCreateAssignments);
router.put("/:id", authorize(['dos', 'principal']), assignmentController.updateAssignment);
router.delete("/:id", authorize(['dos', 'principal']), assignmentController.deleteAssignment);
router.patch("/:id/reactivate", authorize(['dos', 'principal']), assignmentController.reactivateAssignment);

module.exports = router;
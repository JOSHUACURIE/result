const express = require("express");
const router = express.Router();
const teacherController = require("../controllers/teacherController");
const assignmentController = require("../controllers/assignmentController");
const { authenticate, authorize } = require("../middleware/authMiddleware");

// All routes require authentication
router.use(authenticate);

// Teacher management routes (Admin only)
router.post("/", authorize(['dos', 'principal']), teacherController.createTeacher);
router.get("/", authorize(['dos', 'principal', 'teacher']), teacherController.getAllTeachers);
router.get("/stats", authorize(['dos', 'principal']), teacherController.getUserStats);

// ========================================
// ✅ TEACHER-SPECIFIC ROUTES (Using req.user.teacher_id from token)
// ========================================

// Teacher profile
router.get("/my-profile", authorize(['teacher']), (req, res) => {
  req.params.id = req.user.teacher_id;
  teacherController.getTeacherById(req, res);
});

// Teacher assignment routes
router.get("/my-subjects", authorize(['teacher']), assignmentController.getMyAssignedSubjects);
router.get("/my-assignments", authorize(['teacher']), assignmentController.getMyAssignmentsByTerm);
router.get("/my-assignments/:assignment_id", authorize(['teacher']), assignmentController.getMyAssignmentDetails);
router.get("/my-assignment-stats", authorize(['teacher']), assignmentController.getMyAssignmentStats);
router.get("/my-timetable", authorize(['teacher']), assignmentController.getMyTimetable);

// Legacy assignment route (keep for compatibility)
router.get("/my-assignments-legacy", authorize(['teacher']), (req, res) => {
  req.params.teacher_id = req.user.teacher_id;
  teacherController.getTeacherAssignments(req, res);
});

// Teacher students
router.get("/my-students", authorize(['teacher']), (req, res) => {
  req.params.id = req.user.teacher_id;
  teacherController.getMyStudents(req, res);
});

// ========================================
// ✅ GENERAL TEACHER ROUTES (Can access by ID)
// ========================================

// Teacher profile by ID
router.get("/:id", authorize(['dos', 'principal', 'teacher']), teacherController.getTeacherById);

// Teacher assignments by ID
router.get("/:id/assignments", authorize(['dos', 'principal', 'teacher']), teacherController.getTeacherAssignments);

// Teacher students by ID
router.get("/:id/students", authorize(['dos', 'principal', 'teacher']), teacherController.getMyStudents);

// Teacher statistics by ID
router.get("/:id/stats", authorize(['dos', 'principal', 'teacher']), teacherController.getTeacherStats);

// ========================================
// ✅ ADMIN ONLY ROUTES
// ========================================

router.put("/:id", authorize(['dos', 'principal']), teacherController.updateTeacher);
router.delete("/:id", authorize(['dos', 'principal']), teacherController.deleteTeacher);
router.patch("/:id/reactivate", authorize(['dos', 'principal']), teacherController.reactivateTeacher);

module.exports = router;
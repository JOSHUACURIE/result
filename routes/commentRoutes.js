const express = require("express");
const router = express.Router();
const commentController = require("../controllers/commentController");
const { authenticate, authorize } = require("../middleware/authMiddleware");

// All routes require authentication
router.use(authenticate);

// Comment management routes
router.post("/", authorize(['teacher', 'dos', 'principal']), commentController.createComment);
router.get("/", authorize(['dos', 'principal']), commentController.getAllComments);
router.get("/student/:studentId", commentController.getStudentComments);
router.get("/teacher/:teacherId", authorize(['teacher', 'dos', 'principal']), commentController.getTeacherComments);
router.get("/class/:classId/term/:termId", authorize(['teacher', 'dos', 'principal']), commentController.getClassComments);

// Comment modification routes
router.put("/:id", authorize(['teacher', 'dos', 'principal']), commentController.updateComment);
router.delete("/:id", authorize(['teacher', 'dos', 'principal']), commentController.deleteComment);
router.patch("/:id/toggle-visibility", authorize(['dos', 'principal']), commentController.toggleCommentVisibility);

module.exports = router;
const express = require("express");
const router = express.Router();
const scoreController = require("../controllers/scoreController");
const { authenticate, authorize } = require("../middleware/authMiddleware");

// All routes require authentication
router.use(authenticate);

// Score management routes
router.post("/submit", authorize(['teacher']), scoreController.submitScores);
router.get("/assignment/:assignment_id", authorize(['teacher']), scoreController.getScoresByAssignment);
router.get("/student/:student_id/term/:term_id", scoreController.getScoresByStudent);
router.get("/performance/student/:student_id/term/:term_id", scoreController.getStudentPerformance);
router.get("/performance/class/:class_id/stream/:stream_id/term/:term_id", scoreController.getClassPerformance);

// Admin routes
router.put("/:score_id", authorize(['teacher']), scoreController.updateScore);
router.delete("/:score_id", authorize(['teacher']), scoreController.deleteScore);

module.exports = router;
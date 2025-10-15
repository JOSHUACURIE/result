const express = require("express");
const router = express.Router();
const resultController = require("../controllers/resultController");
const { authenticate, authorize } = require("../middleware/authMiddleware");

// All routes require authentication
router.use(authenticate);

// Result export routes
router.get("/export", authorize(['dos', 'principal', 'teacher']), resultController.exportAllResults);
router.get("/export/student/:studentId", authorize(['dos', 'principal', 'teacher']), resultController.exportStudentResult);
router.get("/summary", authorize(['dos', 'principal', 'teacher']), resultController.getResultSummary);
router.get('/submitted', resultController.getSubmittedResults)
module.exports = router;
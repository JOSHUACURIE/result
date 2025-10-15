const express = require("express");
const router = express.Router();
const subjectController = require("../controllers/subjectController");
const { authenticate, authorize } = require("../middleware/authMiddleware");

// All routes require authentication
router.use(authenticate);

// Subject management routes
router.post("/", authorize(['dos', 'principal']), subjectController.createSubject);
router.get("/", subjectController.getSubjects);
router.get("/available", subjectController.getAvailableSubjectsForAssignment);
router.get("/class/:class_id/stream/:stream_id", subjectController.getSubjectsByClassStream);
router.get("/:id", subjectController.getSubjectById);
router.get("/:id/stats", subjectController.getSubjectStats);
router.put("/:id", authorize(['dos', 'principal']), subjectController.updateSubject);
router.delete("/:id", authorize(['dos', 'principal']), subjectController.deleteSubject);
router.patch("/:id/reactivate", authorize(['dos', 'principal']), subjectController.reactivateSubject);

module.exports = router;
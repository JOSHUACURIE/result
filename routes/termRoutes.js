const express = require("express");
const router = express.Router();
const termController = require("../controllers/termController");
const { authenticate, authorize } = require("../middleware/authMiddleware");

// All routes require authentication
router.use(authenticate);

// Term management routes
router.post("/", authorize(['dos', 'principal']), termController.createTerm);
router.get("/", termController.getTerms);
router.get("/current", termController.getCurrentTerm);
router.get("/academic-year/:academic_year", termController.getTermsByAcademicYear);
router.get("/:id", termController.getTermById);
router.get("/:id/stats", termController.getTermStats);
router.put("/:id", authorize(['dos', 'principal']), termController.updateTerm);
router.delete("/:id", authorize(['dos', 'principal']), termController.deleteTerm);
router.patch("/:id/activate", authorize(['dos', 'principal']), termController.activateTerm);
router.patch("/:id/reactivate", authorize(['dos', 'principal']), termController.reactivateTerm);

module.exports = router;
const express = require("express");
const router = express.Router();
const smsController = require("../controllers/smsController");
const { authenticate, authorize } = require("../middleware/authMiddleware");

// All routes require authentication
router.use(authenticate);

// SMS management routes
router.post("/single", authorize(['dos', 'principal', 'teacher']), smsController.sendSingleSMS);
router.post("/bulk", authorize(['dos', 'principal']), smsController.sendBulkSMS);
router.post("/results", authorize(['dos', 'principal']), smsController.sendResultsSMS);
router.post("/attendance", authorize(['dos', 'principal', 'teacher']), smsController.sendAttendanceSMS);
router.post("/emergency", authorize(['dos', 'principal']), smsController.sendEmergencyAlert);

module.exports = router;
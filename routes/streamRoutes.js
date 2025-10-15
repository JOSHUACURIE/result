const express = require("express");
const router = express.Router();
const streamController = require("../controllers/streamController");
const { authenticate, authorize } = require("../middleware/authMiddleware");

// All routes require authentication
router.use(authenticate);

// Stream management routes
router.post("/", authorize(['dos', 'principal']), streamController.createStream);
router.get("/", streamController.getAllStreams);
router.get("/with-classes", streamController.getStreamsWithClasses);
router.get("/:id", streamController.getStreamById);
router.get("/:id/stats", streamController.getStreamStats);
router.put("/:id", authorize(['dos', 'principal']), streamController.updateStream);
router.delete("/:id", authorize(['dos', 'principal']), streamController.deleteStream);
router.patch("/:id/reactivate", authorize(['dos', 'principal']), streamController.reactivateStream);

module.exports = router;
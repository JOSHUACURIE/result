const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");
const { authenticate, authorize } = require("../middleware/authMiddleware");

// Public routes
router.post("/login", userController.loginUser);
router.post("/register-teacher", userController.registerTeacher);

// All routes below require authentication
router.use(authenticate);

// User management routes
router.get("/", authorize(['dos', 'principal']), userController.getUsers);
router.get("/stats", authorize(['dos', 'principal']), userController.getUserStats);
router.get("/profile", (req, res) => {
  req.params.id = req.user.user_id;
  userController.getUserById(req, res);
});
router.get("/:id", authorize(['dos', 'principal']), userController.getUserById);
router.put("/profile", (req, res) => {
  req.params.id = req.user.user_id;
  userController.updateUser(req, res);
});
router.put("/:id", authorize(['dos', 'principal']), userController.updateUser);
router.patch("/profile/password", (req, res) => {
  req.params.id = req.user.user_id;
  userController.updatePassword(req, res);
});
router.patch("/:id/password", authorize(['dos', 'principal']), userController.updatePassword);
router.delete("/:id", authorize(['dos', 'principal']), userController.deleteUser);
router.patch("/:id/reactivate", authorize(['dos', 'principal']), userController.reactivateUser);

module.exports = router;
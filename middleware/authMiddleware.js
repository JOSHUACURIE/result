const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");
const User = require("../models/User");
const Teacher = require("../models/Teacher");
const logger = require("../utils/logger");

dotenv.config();

// Protect middleware - verifies JWT token and attaches user to request
const authenticate = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
    try {
      token = req.headers.authorization.split(" ")[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET || "supersecretkey");

      // Find user with active status
      req.user = await User.findByPk(decoded.id, {
        where: { is_active: true }
      });

      if (!req.user) {
        return res.status(401).json({ 
          success: false,
          message: "User not found or account is inactive" 
        });
      }

      // If user is a teacher, also attach teacher_id to request
      if (req.user.role === 'teacher' && decoded.teacher_id) {
        req.user.teacher_id = decoded.teacher_id;
      } else if (req.user.role === 'teacher') {
        // Fallback: find teacher profile if not in token
        const teacher = await Teacher.findOne({ 
          where: { user_id: req.user.user_id, is_active: true } 
        });
        if (teacher) {
          req.user.teacher_id = teacher.teacher_id;
        }
      }

      next();
    } catch (error) {
      logger.error(`Authentication error: ${error.message}`);
      return res.status(401).json({ 
        success: false,
        message: "Not authorized, invalid token" 
      });
    }
  } else {
    return res.status(401).json({ 
      success: false,
      message: "Not authorized, no token provided" 
    });
  }
};

// ✅ Role-based authorization (supports single role or array of roles)
const authorize = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        success: false,
        message: "Authentication required" 
      });
    }

    // Convert single role to array for consistent handling
    const allowedRoles = Array.isArray(roles) ? roles : [roles];
    
    if (!allowedRoles.includes(req.user.role)) {
      logger.warn(`Authorization failed: User ${req.user.user_id} with role ${req.user.role} attempted to access ${req.method} ${req.originalUrl}`);
      return res.status(403).json({ 
        success: false,
        message: "Forbidden: You do not have permission to access this resource",
        required_roles: allowedRoles,
        your_role: req.user.role
      });
    }

    next();
  };
};

// Teacher-specific authorization - verifies teacher owns the assignment
const authorizeTeacherAssignment = async (req, res, next) => {
  try {
    const { id } = req.params; // assignment_id from route parameter
    const teacher_id = req.user.teacher_id;

    if (!teacher_id) {
      return res.status(403).json({
        success: false,
        message: "Teacher profile not found"
      });
    }

    const { Assignment } = require("../models");
    const assignment = await Assignment.findOne({
      where: {
        assignment_id: id,
        teacher_id: teacher_id,
        is_active: true
      }
    });

    if (!assignment) {
      return res.status(403).json({
        success: false,
        message: "Access denied: You are not assigned to this subject/class or assignment does not exist"
      });
    }

    req.assignment = assignment;
    next();
  } catch (error) {
    logger.error(`Teacher assignment authorization error: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: "Authorization check failed"
    });
  }
};

// Teacher-specific authorization for student operations (class teacher)
const authorizeClassTeacher = async (req, res, next) => {
  try {
    const { student_id } = req.params;
    const teacher_id = req.user.teacher_id;

    if (!teacher_id) {
      return res.status(403).json({
        success: false,
        message: "Teacher profile not found"
      });
    }

    const { Student } = require("../models");
    const student = await Student.findOne({
      where: {
        student_id: student_id,
        class_teacher_id: teacher_id,
        is_active: true
      }
    });

    if (!student) {
      return res.status(403).json({
        success: false,
        message: "Access denied: You are not the class teacher for this student"
      });
    }

    req.student = student;
    next();
  } catch (error) {
    logger.error(`Class teacher authorization error: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: "Authorization check failed"
    });
  }
};

// Specific role middlewares for convenience
const isDos = authorize('dos');
const isPrincipal = authorize('principal');
const isTeacher = authorize('teacher');
const isAdmin = authorize(['dos', 'principal']); // Combined admin roles

// Optional: Self-or-admin authorization (user can access their own data or admin can access any)
const authorizeSelfOrAdmin = (idParam = 'id') => {
  return (req, res, next) => {
    const requestedId = req.params[idParam];
    
    if (!req.user) {
      return res.status(401).json({ 
        success: false,
        message: "Authentication required" 
      });
    }

    // Allow if user is accessing their own data
    if (parseInt(requestedId) === req.user.user_id) {
      return next();
    }

    // Allow if user is admin (dos or principal)
    if (['dos', 'principal'].includes(req.user.role)) {
      return next();
    }

    // Deny access
    return res.status(403).json({ 
      success: false,
      message: "Forbidden: You can only access your own data" 
    });
  };
};

// Optional: Teacher or admin authorization
const authorizeTeacherOrAdmin = authorize(['teacher', 'dos', 'principal']);

module.exports = {
  authenticate,
  authorize,
  authorizeTeacherAssignment,
  authorizeClassTeacher,
  authorizeSelfOrAdmin,
  authorizeTeacherOrAdmin,
  isDos,
  isPrincipal,
  isTeacher,
  isAdmin,
};
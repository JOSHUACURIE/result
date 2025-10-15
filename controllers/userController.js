const User = require("../models/User");
const Teacher = require("../models/Teacher");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "supersecretkey";

/**
 * ✅ Register Teacher (with User creation)
 */
exports.registerTeacher = async (req, res) => {
  const { fullname, email, password, phone_number, teacher_code, specialization, employment_date } = req.body;

  // Validate required fields
  if (!fullname || !email || !password || !teacher_code) {
    return res.status(400).json({ 
      success: false,
      message: "Fullname, email, password, and teacher code are required" 
    });
  }

  const transaction = await User.sequelize.transaction();

  try {
    // Check if user already exists
    const normalizedEmail = email.toLowerCase();
    const existingUser = await User.findOne({ where: { email: normalizedEmail }, transaction });
    if (existingUser) {
      await transaction.rollback();
      return res.status(400).json({ 
        success: false,
        message: "User already exists" 
      });
    }

    // Check if teacher code already exists
    const existingTeacherCode = await Teacher.findOne({ where: { teacher_code }, transaction });
    if (existingTeacherCode) {
      await transaction.rollback();
      return res.status(400).json({ 
        success: false,
        message: "Teacher code already exists" 
      });
    }

    // Create User
    const user = await User.create(
      {
        fullname,
        email: normalizedEmail,
        password_hash: password, // Will be hashed by User model's hook
        role: "teacher",
      },
      { transaction }
    );

    // Create Teacher
    const teacher = await Teacher.create(
      {
        user_id: user.user_id,
        teacher_code,
        phone_number: phone_number || null,
        specialization: specialization || null,
        employment_date: employment_date || null,
      },
      { transaction }
    );

    await transaction.commit();
    
    return res.status(201).json({ 
      success: true,
      message: "✅ Teacher registered successfully", 
      data: {
        teacher_id: teacher.teacher_id,
        teacher_code: teacher.teacher_code,
        user: {
          user_id: user.user_id,
          fullname: user.fullname,
          email: user.email,
          role: user.role,
        }
      }
    });
  } catch (error) {
    await transaction.rollback();
    console.error("❌ Error registering teacher:", error);
    return res.status(500).json({ 
      success: false,
      message: "Server error", 
      error: error.message 
    });
  }
};

/**
 * ✅ Login User
 */
exports.loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ 
        success: false,
        message: "Email and password are required" 
      });
    }

    const normalizedEmail = typeof email === 'string' ? email.toLowerCase() : email;

    const user = await User.findOne({ 
      where: { 
        email: normalizedEmail,
        is_active: true 
      } 
    });
    
    if (!user) {
      return res.status(400).json({ 
        success: false,
        message: "Invalid credentials" 
      });
    }

    const isMatch = await user.validatePassword(password);
    if (!isMatch) {
      return res.status(400).json({ 
        success: false,
        message: "Invalid credentials" 
      });
    }

    // Get teacher profile if user is a teacher
    let teacherProfile = null;
    if (user.role === 'teacher') {
      teacherProfile = await Teacher.findOne({
        where: { user_id: user.user_id },
        attributes: ['teacher_id', 'teacher_code', 'phone_number', 'specialization']
      });
    }

    const token = jwt.sign(
      { 
        id: user.user_id, 
        role: user.role,
        email: user.email,
        ...(teacherProfile && { teacher_id: teacherProfile.teacher_id })
      },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    return res.json({
      success: true,
      message: "✅ Login successful",
      data: {
        token,
        user: {
          user_id: user.user_id,
          fullname: user.fullname,
          email: user.email,
          role: user.role,
          ...(teacherProfile && { teacher: teacherProfile })
        },
      },
    });
  } catch (error) {
    console.error("Error logging in:", error);
    return res.status(500).json({ 
      success: false,
      message: "Server error",
      error: error.message 
    });
  }
};

/**
 * ✅ Fetch all users
 */
exports.getUsers = async (req, res) => {
  try {
    const { role, is_active = true, include_inactive = false } = req.query;
    
    const whereClause = {};
    if (role) whereClause.role = role;
    if (!include_inactive) whereClause.is_active = true;
    if (is_active !== undefined) whereClause.is_active = is_active === 'true';

    const users = await User.findAll({
      where: whereClause,
      attributes: ["user_id", "fullname", "email", "role", "is_active", "created_at", "updated_at"],
      include: [
        { 
          model: Teacher, 
          as: "teacher_profile", 
          attributes: ["teacher_id", "teacher_code", "phone_number", "specialization"] 
        }
      ],
      order: [["created_at", "DESC"]]
    });

    return res.json({
      success: true,
      data: users,
      count: users.length
    });
  } catch (error) {
    console.error("Error fetching users:", error);
    return res.status(500).json({ 
      success: false,
      message: "Server error",
      error: error.message 
    });
  }
};

/**
 * ✅ Get user by ID
 */
exports.getUserById = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id, {
      attributes: ["user_id", "fullname", "email", "role", "is_active", "created_at", "updated_at"],
      include: [
        { 
          model: Teacher, 
          as: "teacher_profile", 
          attributes: ["teacher_id", "teacher_code", "phone_number", "specialization", "employment_date"] 
        }
      ]
    });

    if (!user) {
      return res.status(404).json({ 
        success: false,
        message: "User not found" 
      });
    }

    return res.json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error("Error fetching user:", error);
    return res.status(500).json({ 
      success: false,
      message: "Server error",
      error: error.message 
    });
  }
};

/**
 * ✅ Update user profile
 */
exports.updateUser = async (req, res) => {
  const transaction = await User.sequelize.transaction();
  
  try {
    const { fullname, email, role, is_active } = req.body;
    
    const user = await User.findByPk(req.params.id, { transaction });
    if (!user) {
      await transaction.rollback();
      return res.status(404).json({ 
        success: false,
        message: "User not found" 
      });
    }

    // Check if email is being changed and if it already exists
    if (email && email !== user.email) {
      const existingUser = await User.findOne({ 
        where: { email: email.toLowerCase() },
        transaction 
      });
      if (existingUser) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: "Email already in use"
        });
      }
    }

    await user.update({
      fullname: fullname || user.fullname,
      email: email ? email.toLowerCase() : user.email,
      role: role || user.role,
      is_active: is_active !== undefined ? is_active : user.is_active
    }, { transaction });

    await transaction.commit();

    const updatedUser = await User.findByPk(req.params.id, {
      attributes: ["user_id", "fullname", "email", "role", "is_active", "created_at", "updated_at"],
      include: [
        { 
          model: Teacher, 
          as: "teacher_profile", 
          attributes: ["teacher_id", "teacher_code", "phone_number", "specialization"] 
        }
      ]
    });

    return res.json({
      success: true,
      message: "✅ User updated successfully",
      data: updatedUser
    });
  } catch (error) {
    await transaction.rollback();
    console.error("Error updating user:", error);
    return res.status(500).json({ 
      success: false,
      message: "Server error",
      error: error.message 
    });
  }
};

/**
 * ✅ Update user password
 */
exports.updatePassword = async (req, res) => {
  try {
    const { current_password, new_password } = req.body;
    
    if (!current_password || !new_password) {
      return res.status(400).json({ 
        success: false,
        message: "Current password and new password are required" 
      });
    }

    const user = await User.findByPk(req.params.id);
    if (!user) {
      return res.status(404).json({ 
        success: false,
        message: "User not found" 
      });
    }

    // Verify current password
    const isCurrentPasswordValid = await user.validatePassword(current_password);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({ 
        success: false,
        message: "Current password is incorrect" 
      });
    }

    // Update password (will be hashed by model hook)
    await user.update({ password_hash: new_password });

    return res.json({
      success: true,
      message: "✅ Password updated successfully"
    });
  } catch (error) {
    console.error("Error updating password:", error);
    return res.status(500).json({ 
      success: false,
      message: "Server error",
      error: error.message 
    });
  }
};

/**
 * ✅ Delete user (soft delete)
 */
exports.deleteUser = async (req, res) => {
  const transaction = await User.sequelize.transaction();
  
  try {
    const user = await User.findByPk(req.params.id, { transaction });
    if (!user) {
      await transaction.rollback();
      return res.status(404).json({ 
        success: false,
        message: "User not found" 
      });
    }

    // Check if user is a teacher with active assignments
    if (user.role === 'teacher') {
      const teacher = await Teacher.findOne({ 
        where: { user_id: user.user_id },
        transaction 
      });
      
      if (teacher) {
        const { Assignment } = require("../models");
        const activeAssignments = await Assignment.count({
          where: { 
            teacher_id: teacher.teacher_id,
            is_active: true 
          },
          transaction
        });

        if (activeAssignments > 0) {
          await transaction.rollback();
          return res.status(400).json({
            success: false,
            message: "Cannot delete teacher with active assignments. Remove assignments first.",
            active_assignments: activeAssignments
          });
        }

        // Soft delete teacher
        await teacher.update({ is_active: false }, { transaction });
      }
    }

    // Soft delete user
    await user.update({ is_active: false }, { transaction });

    await transaction.commit();

    return res.json({ 
      success: true, 
      message: "✅ User deactivated successfully" 
    });
  } catch (error) {
    await transaction.rollback();
    console.error("Error deleting user:", error);
    return res.status(500).json({ 
      success: false,
      message: "Server error",
      error: error.message 
    });
  }
};

/**
 * ✅ Reactivate user
 */
exports.reactivateUser = async (req, res) => {
  const transaction = await User.sequelize.transaction();
  
  try {
    const user = await User.findByPk(req.params.id, { 
      include: [
        { 
          model: Teacher, 
          as: "teacher_profile" 
        }
      ],
      transaction 
    });
    
    if (!user) {
      await transaction.rollback();
      return res.status(404).json({ 
        success: false,
        message: "User not found" 
      });
    }

    // Reactivate user
    await user.update({ is_active: true }, { transaction });

    // Reactivate teacher profile if exists
    if (user.teacher_profile) {
      await user.teacher_profile.update({ is_active: true }, { transaction });
    }

    await transaction.commit();

    return res.json({
      success: true,
      message: "✅ User reactivated successfully",
      data: user
    });
  } catch (error) {
    await transaction.rollback();
    console.error("Error reactivating user:", error);
    return res.status(500).json({ 
      success: false,
      message: "Server error",
      error: error.message 
    });
  }
};

/**
 * ✅ Get user statistics
 */
exports.getUserStats = async (req, res) => {
  try {
    const { User, Teacher } = require("../models");
    
    const stats = await User.findAll({
      attributes: [
        'role',
        [User.sequelize.fn('COUNT', User.sequelize.col('user_id')), 'count'],
        [User.sequelize.fn('SUM', User.sequelize.cast(User.sequelize.col('is_active'), 'int')), 'active_count']
      ],
      group: ['role'],
      raw: true
    });

    const totalUsers = await User.count();
    const activeUsers = await User.count({ where: { is_active: true } });
    const totalTeachers = await Teacher.count({ where: { is_active: true } });

    const roleDistribution = stats.reduce((acc, stat) => {
      acc[stat.role] = {
        total: parseInt(stat.count),
        active: parseInt(stat.active_count)
      };
      return acc;
    }, {});

    return res.json({
      success: true,
      data: {
        total_users: totalUsers,
        active_users: activeUsers,
        total_teachers: totalTeachers,
        role_distribution: roleDistribution
      }
    });
  } catch (error) {
    console.error("Error fetching user statistics:", error);
    return res.status(500).json({ 
      success: false,
      message: "Server error",
      error: error.message 
    });
  }
};
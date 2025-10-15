const Class = require("../models/Class");

// Create a new class
const createClass = async (req, res) => {
  try {
    const { class_name, class_level } = req.body;

    if (!class_name || !class_level) {
      return res.status(400).json({ 
        success: false,
        message: "Class name and class level are required" 
      });
    }

    const newClass = await Class.create({ 
      class_name, 
      class_level 
    });

    res.status(201).json({
      success: true,
      message: "✅ Class created successfully",
      class: newClass,
    });
  } catch (error) {
    console.error("❌ Error creating class:", error.message);
    
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({
        success: false,
        message: "Class name already exists"
      });
    }
    
    res.status(500).json({ 
      success: false,
      message: "Server error while creating class" 
    });
  }
};

// Get all classes (active only by default)
const getClasses = async (req, res) => {
  try {
    const { include_inactive = false } = req.query;
    
    const whereClause = {};
    if (!include_inactive) {
      whereClause.is_active = true;
    }

    const classes = await Class.findAll({
      where: whereClause,
      order: [["class_level", "ASC"], ["class_name", "ASC"]],
    });

    res.status(200).json({
      success: true,
      data: classes,
      count: classes.length
    });
  } catch (error) {
    console.error("❌ Error fetching classes:", error.message);
    res.status(500).json({ 
      success: false,
      message: "Server error while fetching classes" 
    });
  }
};

// Get class by ID with detailed information
const getClassById = async (req, res) => {
  try {
    const { Student, Stream } = require("../models");
    
    const classItem = await Class.findByPk(req.params.id, {
      include: [
        {
          model: Student,
          as: 'class_students',
          attributes: ['student_id', 'admission_number', 'fullname'],
          where: { is_active: true },
          required: false
        },
        {
          model: Stream,
          as: 'class_streams',
          attributes: ['stream_id', 'stream_name'],
          where: { is_active: true },
          required: false
        }
      ]
    });

    if (!classItem) {
      return res.status(404).json({ 
        success: false,
        message: "Class not found" 
      });
    }

    res.status(200).json({
      success: true,
      data: classItem
    });
  } catch (error) {
    console.error("❌ Error fetching class:", error.message);
    res.status(500).json({ 
      success: false,
      message: "Server error while fetching class" 
    });
  }
};

// Update class information
const updateClass = async (req, res) => {
  try {
    const { class_name, class_level, is_active } = req.body;
    
    const classItem = await Class.findByPk(req.params.id);

    if (!classItem) {
      return res.status(404).json({ 
        success: false,
        message: "Class not found" 
      });
    }

    // Build update object with only provided fields
    const updateData = {};
    if (class_name !== undefined) updateData.class_name = class_name;
    if (class_level !== undefined) updateData.class_level = class_level;
    if (is_active !== undefined) updateData.is_active = is_active;

    await classItem.update(updateData);

    res.status(200).json({
      success: true,
      message: "✅ Class updated successfully",
      data: classItem
    });
  } catch (error) {
    console.error("❌ Error updating class:", error.message);
    
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({
        success: false,
        message: "Class name already exists"
      });
    }
    
    res.status(500).json({ 
      success: false,
      message: "Server error while updating class" 
    });
  }
};

// Soft delete class (set is_active to false)
const deleteClass = async (req, res) => {
  try {
    const classItem = await Class.findByPk(req.params.id);

    if (!classItem) {
      return res.status(404).json({ 
        success: false,
        message: "Class not found" 
      });
    }

    // Check if class has active students
    const { Student } = require("../models");
    const activeStudents = await Student.count({
      where: { 
        class_id: req.params.id,
        is_active: true 
      }
    });

    if (activeStudents > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete class with ${activeStudents} active students. Reassign students first.`
      });
    }

    // Soft delete by setting is_active to false
    await classItem.update({ is_active: false });

    res.status(200).json({ 
      success: true,
      message: "✅ Class deactivated successfully" 
    });
  } catch (error) {
    console.error("❌ Error deleting class:", error.message);
    res.status(500).json({ 
      success: false,
      message: "Server error while deleting class" 
    });
  }
};

// Reactivate a class
const reactivateClass = async (req, res) => {
  try {
    const classItem = await Class.findByPk(req.params.id);

    if (!classItem) {
      return res.status(404).json({ 
        success: false,
        message: "Class not found" 
      });
    }

    await classItem.update({ is_active: true });

    res.status(200).json({
      success: true,
      message: "✅ Class reactivated successfully",
      data: classItem
    });
  } catch (error) {
    console.error("❌ Error reactivating class:", error.message);
    res.status(500).json({ 
      success: false,
      message: "Server error while reactivating class" 
    });
  }
};

// Get class statistics
const getClassStats = async (req, res) => {
  try {
    const { Student, Assignment } = require("../models");
    
    const classItem = await Class.findByPk(req.params.id, {
      include: [
        {
          model: Student,
          as: 'class_students',
          attributes: [],
          where: { is_active: true },
          required: false
        },
        {
          model: Assignment,
          as: 'class_assignments',
          attributes: [],
          where: { is_active: true },
          required: false
        }
      ],
      attributes: [
        'class_id',
        'class_name',
        'class_level',
        'is_active',
        [
          Student.sequelize.literal('COUNT(DISTINCT "class_students"."student_id")'),
          'student_count'
        ],
        [
          Student.sequelize.literal('COUNT(DISTINCT "class_assignments"."assignment_id")'),
          'assignment_count'
        ]
      ],
      group: ['Class.class_id']
    });

    if (!classItem) {
      return res.status(404).json({ 
        success: false,
        message: "Class not found" 
      });
    }

    res.status(200).json({
      success: true,
      data: classItem
    });
  } catch (error) {
    console.error("❌ Error fetching class stats:", error.message);
    res.status(500).json({ 
      success: false,
      message: "Server error while fetching class statistics" 
    });
  }
};

module.exports = {
  createClass,
  getClasses,
  getClassById,
  updateClass,
  deleteClass,
  reactivateClass,
  getClassStats
};
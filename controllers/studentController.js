const Student = require("../models/Student");
const Class = require("../models/Class");
const Stream = require("../models/Stream");
const Score = require("../models/Score");
const Teacher = require("../models/Teacher");
const Term = require("../models/Term");
const { sequelize } = require("../models");
const User=require('../models/User')
// ======================
// ✅ Create Student
// ======================
exports.createStudent = async (req, res) => {
  try {
    const {
      admission_number,
      fullname,
      guardian_phone,
      class_id,
      stream_id,
      class_teacher_id,
      date_of_birth,
      gender,
    } = req.body;

    if (!admission_number || !fullname) {
      return res.status(400).json({
        success: false,
        message: "Admission number and fullname are required",
      });
    }

    // Check if admission number already exists
    const existingStudent = await Student.findOne({ where: { admission_number } });
    if (existingStudent) {
      return res.status(400).json({
        success: false,
        message: "Admission number already exists",
      });
    }

    if (class_id) {
      const classExists = await Class.findByPk(class_id);
      if (!classExists)
        return res.status(404).json({ 
          success: false,
          message: "Class not found" 
        });
    }

    if (stream_id) {
      const streamExists = await Stream.findByPk(stream_id);
      if (!streamExists)
        return res.status(404).json({ 
          success: false,
          message: "Stream not found" 
        });
    }

    if (class_teacher_id) {
      const teacherExists = await Teacher.findByPk(class_teacher_id);
      if (!teacherExists)
        return res.status(404).json({ 
          success: false,
          message: "Class teacher not found" 
        });
    }

    const newStudent = await Student.create({
      admission_number,
      fullname,
      guardian_phone: guardian_phone || null,
      class_id: class_id || null,
      stream_id: stream_id || null,
      class_teacher_id: class_teacher_id || null,
      date_of_birth: date_of_birth || null,
      gender: gender || null,
    });

    res.status(201).json({
      success: true,
      message: "✅ Student created successfully",
      data: newStudent,
    });
  } catch (error) {
    console.error("Error creating student:", error);
    res.status(500).json({ 
      success: false,
      message: "Server error", 
      error: error.message 
    });
  }
};

// ======================
// ✅ Get All Students
// ======================
exports.getAllStudents = async (req, res) => {
  try {
    const { class_id, stream_id, is_active = true } = req.query;
    
    const whereClause = { is_active: is_active !== 'false' };
    if (class_id) whereClause.class_id = class_id;
    if (stream_id) whereClause.stream_id = stream_id;

    const students = await Student.findAll({
      where: whereClause,
      include: [
        { 
          model: Class, 
          as: "student_class",
          attributes: ["class_id", "class_name"] 
        },
        { 
          model: Stream, 
          as: "student_stream",
          attributes: ["stream_id", "stream_name"] 
        },
        {
          model: Teacher,
          as: "class_teacher",
          attributes: ["teacher_id", "teacher_code"],
          include: [
            {
              model: require('../models/User'),
              as: 'user_account',
              attributes: ['fullname']
            }
          ]
        }
      ],
      order: [
        ["class_id", "ASC"],
        ["stream_id", "ASC"],
        ["fullname", "ASC"],
      ],
    });

    res.status(200).json({
      success: true,
      data: students,
      count: students.length
    });
  } catch (error) {
    console.error("Error fetching students:", error);
    res.status(500).json({ 
      success: false,
      message: "Failed to fetch students",
      error: error.message 
    });
  }
};

// ======================
// ✅ Get Student by ID
// ======================
exports.getStudentById = async (req, res) => {
  try {
    const { student_id } = req.params;

    const student = await Student.findByPk(student_id, {
      include: [
        { 
          model: Class, 
          as: "student_class",
          attributes: ["class_id", "class_name", "class_level"] 
        },
        { 
          model: Stream, 
          as: "student_stream",
          attributes: ["stream_id", "stream_name"] 
        },
        {
          model: Teacher,
          as: "class_teacher",
          attributes: ["teacher_id", "teacher_code"],
          include: [
            {
              model: require('./User'),
              as: 'user_account',
              attributes: ['fullname', 'email']
            }
          ]
        }
      ],
    });

    if (!student) {
      return res.status(404).json({ 
        success: false,
        message: "Student not found" 
      });
    }

    res.status(200).json({
      success: true,
      data: student
    });
  } catch (error) {
    console.error("Error fetching student:", error);
    res.status(500).json({ 
      success: false,
      message: "Server error", 
      error: error.message 
    });
  }
};

// ======================
// ✅ Get Student with Scores
// ======================
exports.getStudentWithScores = async (req, res) => {
  try {
    const { student_id } = req.params;
    const { term_id } = req.query;

    const student = await Student.findByPk(student_id, {
      include: [
        { 
          model: Class, 
          as: "student_class",
          attributes: ["class_id", "class_name"] 
        },
        { 
          model: Stream, 
          as: "student_stream",
          attributes: ["stream_id", "stream_name"] 
        },
        {
          model: Teacher,
          as: "class_teacher",
          attributes: ["teacher_id", "teacher_code"],
          include: [
            {
              model: require('./User'),
              as: 'user_account',
              attributes: ['fullname']
            }
          ]
        },
        {
          model: Score,
          as: "student_scores",
          where: term_id ? { term_id } : {},
          required: false,
          include: [
            {
              model: require('./Assignment'),
              as: 'score_assignment',
              attributes: ['assignment_id'],
              include: [
                {
                  model: require('./Subject'),
                  as: 'assignment_subject',
                  attributes: ['subject_id', 'subject_name', 'subject_code']
                }
              ]
            },
            {
              model: Term,
              as: 'score_term',
              attributes: ['term_id', 'term_name', 'academic_year']
            }
          ]
        }
      ],
    });

    if (!student) {
      return res.status(404).json({ 
        success: false,
        message: "Student not found" 
      });
    }

    res.status(200).json({
      success: true,
      data: student
    });
  } catch (error) {
    console.error("Error fetching student with scores:", error);
    res.status(500).json({ 
      success: false,
      message: "Server error", 
      error: error.message 
    });
  }
};

// ======================
// ✅ Update Student
// ======================
exports.updateStudent = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { student_id } = req.params;
    const {
      admission_number,
      fullname,
      class_id,
      stream_id,
      class_teacher_id,
      guardian_phone,
      date_of_birth,
      gender,
      is_active,
    } = req.body;

    const student = await Student.findByPk(student_id, { transaction });
    if (!student) {
      await transaction.rollback();
      return res.status(404).json({ 
        success: false,
        message: "Student not found" 
      });
    }

    // Check if admission number is being changed and if it already exists
    if (admission_number && admission_number !== student.admission_number) {
      const existingStudent = await Student.findOne({ 
        where: { admission_number },
        transaction 
      });
      if (existingStudent) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: "Admission number already exists",
        });
      }
    }

    // Validate references if provided
    if (class_id) {
      const classExists = await Class.findByPk(class_id, { transaction });
      if (!classExists) {
        await transaction.rollback();
        return res.status(404).json({ 
          success: false,
          message: "Class not found" 
        });
      }
    }

    if (stream_id) {
      const streamExists = await Stream.findByPk(stream_id, { transaction });
      if (!streamExists) {
        await transaction.rollback();
        return res.status(404).json({ 
          success: false,
          message: "Stream not found" 
        });
      }
    }

    if (class_teacher_id) {
      const teacherExists = await Teacher.findByPk(class_teacher_id, { transaction });
      if (!teacherExists) {
        await transaction.rollback();
        return res.status(404).json({ 
          success: false,
          message: "Class teacher not found" 
        });
      }
    }

    await student.update({
      admission_number: admission_number || student.admission_number,
      fullname: fullname || student.fullname,
      class_id: class_id !== undefined ? class_id : student.class_id,
      stream_id: stream_id !== undefined ? stream_id : student.stream_id,
      class_teacher_id: class_teacher_id !== undefined ? class_teacher_id : student.class_teacher_id,
      guardian_phone: guardian_phone !== undefined ? guardian_phone : student.guardian_phone,
      date_of_birth: date_of_birth || student.date_of_birth,
      gender: gender || student.gender,
      is_active: is_active !== undefined ? is_active : student.is_active,
    }, { transaction });

    await transaction.commit();

    res.status(200).json({
      success: true,
      message: "✅ Student updated successfully",
      data: student,
    });
  } catch (error) {
    await transaction.rollback();
    console.error("Error updating student:", error);
    res.status(500).json({ 
      success: false,
      message: "Server error", 
      error: error.message 
    });
  }
};

// ======================
// ✅ Delete Student (Soft Delete)
// ======================
exports.deleteStudent = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { student_id } = req.params;

    const student = await Student.findByPk(student_id, { transaction });
    if (!student) {
      await transaction.rollback();
      return res.status(404).json({ 
        success: false,
        message: "Student not found" 
      });
    }

    // Check for existing scores
    const scores = await Score.findAll({ 
      where: { student_id },
      transaction 
    });
    
    if (scores.length > 0) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: "Cannot delete student with existing scores. Remove scores first or use deactivation.",
        scoresCount: scores.length
      });
    }

    // Soft delete by setting is_active to false
    await student.update({ is_active: false }, { transaction });

    await transaction.commit();

    res.status(200).json({
      success: true,
      message: "✅ Student deactivated successfully",
      data: {
        student_id: student.student_id,
        fullname: student.fullname
      }
    });
  } catch (error) {
    await transaction.rollback();
    console.error("Error deleting student:", error);
    res.status(500).json({ 
      success: false,
      message: "Server error", 
      error: error.message 
    });
  }
};

// ======================
// ✅ Reactivate Student
// ======================
exports.reactivateStudent = async (req, res) => {
  try {
    const { student_id } = req.params;

    const student = await Student.findByPk(student_id);
    if (!student) {
      return res.status(404).json({ 
        success: false,
        message: "Student not found" 
      });
    }

    await student.update({ is_active: true });

    res.status(200).json({
      success: true,
      message: "✅ Student reactivated successfully",
      data: student
    });
  } catch (error) {
    console.error("Error reactivating student:", error);
    res.status(500).json({ 
      success: false,
      message: "Server error", 
      error: error.message 
    });
  }
};

// ======================
// ✅ Get Students by Class and Stream
// ======================
exports.getStudentsByClassStream = async (req, res) => {
  try {
    const { class_id, stream_id } = req.params;
    const { is_active = true } = req.query;

    const students = await Student.findAll({
      where: { 
        class_id, 
        stream_id,
        is_active: is_active !== 'false'
      },
      include: [
        { 
          model: Class, 
          as: "student_class",
          attributes: ["class_id", "class_name"] 
        },
        { 
          model: Stream, 
          as: "student_stream",
          attributes: ["stream_id", "stream_name"] 
        },
        {
          model: Teacher,
          as: "class_teacher",
          attributes: ["teacher_id", "teacher_code"],
          include: [
            {
              model: require('./User'),
              as: 'user_account',
              attributes: ['fullname']
            }
          ]
        }
      ],
      order: [["fullname", "ASC"]],
    });

    res.status(200).json({
      success: true,
      data: students,
      count: students.length
    });
  } catch (error) {
    console.error("Error fetching students by class/stream:", error);
    res.status(500).json({ 
      success: false,
      message: "Server error", 
      error: error.message 
    });
  }
};

// ======================
// ✅ Get Student Statistics
// ======================
exports.getStudentStats = async (req, res) => {
  try {
    const { student_id } = req.params;

    const student = await Student.findByPk(student_id, {
      include: [
        {
          model: Score,
          as: "student_scores",
          attributes: [],
          required: false
        }
      ],
      attributes: [
        'student_id',
        'admission_number',
        'fullname',
        'class_id',
        'stream_id',
        [
          Student.sequelize.literal('COUNT(DISTINCT "student_scores"."score_id")'),
          'total_scores'
        ],
        [
          Student.sequelize.literal('AVG("student_scores"."score")'),
          'average_score'
        ],
        [
          Student.sequelize.literal('MAX("student_scores"."created_at")'),
          'last_score_date'
        ]
      ],
      group: ['Student.student_id']
    });

    if (!student) {
      return res.status(404).json({ 
        success: false,
        message: "Student not found" 
      });
    }

    res.status(200).json({
      success: true,
      data: student
    });
  } catch (error) {
    console.error("Error fetching student stats:", error);
    res.status(500).json({ 
      success: false,
      message: "Server error", 
      error: error.message 
    });
  }
};

// ======================
// ✅ Bulk Student Operations
// ======================
exports.bulkUpdateStudents = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { student_ids, update_data } = req.body;

    if (!Array.isArray(student_ids) || student_ids.length === 0 || !update_data) {
      await transaction.rollback();
      return res.status(400).json({ 
        success: false,
        message: "Student IDs array and update data are required" 
      });
    }

    // Validate students exist
    const students = await Student.findAll({
      where: { student_id: student_ids },
      transaction
    });

    if (students.length !== student_ids.length) {
      await transaction.rollback();
      return res.status(404).json({ 
        success: false,
        message: "Some students not found",
        found: students.length,
        requested: student_ids.length
      });
    }

    // Update all students
    await Student.update(update_data, {
      where: { student_id: student_ids },
      transaction
    });

    await transaction.commit();

    res.status(200).json({
      success: true,
      message: `✅ ${students.length} students updated successfully`,
      data: {
        updated_count: students.length
      }
    });
  } catch (error) {
    await transaction.rollback();
    console.error("Error in bulk student update:", error);
    res.status(500).json({ 
      success: false,
      message: "Server error", 
      error: error.message 
    });
  }
};

// REMOVED METHODS:
// - enrollStudentSubjects (all students take all subjects)
// - getStudentSubjects (all students take all subjects)
// - removeStudentSubject (all students take all subjects)
// - getStudentEnrollments (no longer needed)
const { Assignment, Teacher, Subject, Class, Stream, Term, Student, Score, User, sequelize } = require("../models");
const { Op } = require("sequelize");

const assignmentController = {
  // ========================================
  // ✅ CREATE ASSIGNMENT
  // ========================================
  createAssignment: async (req, res) => {
    const { teacher_id, subject_id, class_id, stream_id, academic_year, term_id } = req.body;

    // Validate required fields
    if (!teacher_id || !subject_id || !class_id || !stream_id || !academic_year || !term_id) {
      return res.status(400).json({
        success: false,
        message: "All fields (teacher_id, subject_id, class_id, stream_id, academic_year, term_id) are required",
      });
    }

    try {
      // Check if assignment already exists
      const existingAssignment = await Assignment.findOne({
        where: {
          teacher_id,
          subject_id,
          class_id,
          stream_id,
          academic_year,
          term_id,
        },
      });

      if (existingAssignment) {
        return res.status(400).json({
          success: false,
          message: "Assignment already exists for this teacher, subject, class, stream, and term",
        });
      }

      // Create the assignment
      const assignment = await Assignment.create({
        teacher_id,
        subject_id,
        class_id,
        stream_id,
        academic_year,
        term_id,
      });

      // Fetch the complete assignment with associations
      const completeAssignment = await Assignment.findByPk(assignment.assignment_id, {
        include: [
          {
            model: Teacher,
            as: "assignment_teacher",
            attributes: ["teacher_id", "teacher_code"],
            include: [
              {
                model: User,
                as: "user_account",
                attributes: ["fullname"],
              },
            ],
          },
          {
            model: Subject,
            as: "assignment_subject",
            attributes: ["subject_id", "subject_name", "subject_code"],
          },
          {
            model: Class,
            as: "assignment_class",
            attributes: ["class_id", "class_name"],
          },
          {
            model: Stream,
            as: "assignment_stream",
            attributes: ["stream_id", "stream_name"],
          },
          {
            model: Term,
            as: "assignment_term",
            attributes: ["term_id", "term_name", "academic_year"],
          },
        ],
      });

      res.status(201).json({
        success: true,
        message: "✅ Teacher assigned successfully",
        data: completeAssignment,
      });
    } catch (error) {
      console.error("Error creating assignment:", error);
      res.status(500).json({
        success: false,
        message: "Server error while creating assignment",
        error: error.message,
      });
    }
  },

  // ========================================
  // ✅ BULK CREATE ASSIGNMENTS
  // ========================================
  bulkCreateAssignments: async (req, res) => {
    const { assignments } = req.body;

    if (!Array.isArray(assignments) || assignments.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Assignments array is required and must not be empty",
      });
    }

    const transaction = await sequelize.transaction();

    try {
      const createdAssignments = [];
      const skippedAssignments = [];

      for (const assignmentData of assignments) {
        const { teacher_id, subject_id, class_id, stream_id, academic_year, term_id } = assignmentData;

        // Validate required fields for each assignment
        if (!teacher_id || !subject_id || !class_id || !stream_id || !academic_year || !term_id) {
          skippedAssignments.push({
            ...assignmentData,
            error: "Missing required fields",
          });
          continue;
        }

        try {
          // Check if assignment already exists
          const existingAssignment = await Assignment.findOne({
            where: {
              teacher_id,
              subject_id,
              class_id,
              stream_id,
              academic_year,
              term_id,
            },
            transaction,
          });

          if (existingAssignment) {
            skippedAssignments.push({
              ...assignmentData,
              error: "Assignment already exists",
            });
            continue;
          }

          // Create assignment
          const assignment = await Assignment.create(
            {
              teacher_id,
              subject_id,
              class_id,
              stream_id,
              academic_year,
              term_id,
            },
            { transaction }
          );

          createdAssignments.push(assignment);
        } catch (error) {
          skippedAssignments.push({
            ...assignmentData,
            error: error.message,
          });
        }
      }

      await transaction.commit();

      res.status(201).json({
        success: true,
        message: `✅ ${createdAssignments.length} assignments created successfully, ${skippedAssignments.length} skipped`,
        data: {
          created: createdAssignments,
          skipped: skippedAssignments,
        },
      });
    } catch (error) {
      if (!transaction.finished) {
        await transaction.rollback();
      }
      console.error("Error in bulk assignment creation:", error);
      res.status(500).json({
        success: false,
        message: "Server error while creating assignments",
        error: error.message,
      });
    }
  },

  // ========================================
  // ✅ GET ALL ASSIGNMENTS
  // ========================================
  getAllAssignments: async (req, res) => {
    try {
      const { teacher_id, subject_id, class_id, stream_id, term_id, academic_year, is_active = true } = req.query;

      const whereClause = { is_active: is_active !== "false" };
      if (teacher_id) whereClause.teacher_id = teacher_id;
      if (subject_id) whereClause.subject_id = subject_id;
      if (class_id) whereClause.class_id = class_id;
      if (stream_id) whereClause.stream_id = stream_id;
      if (term_id) whereClause.term_id = term_id;
      if (academic_year) whereClause.academic_year = academic_year;

      const assignments = await Assignment.findAll({
        where: whereClause,
        include: [
          {
            model: Teacher,
            as: "assignment_teacher",
            attributes: ["teacher_id", "teacher_code"],
            include: [
              {
                model: User,
                as: "user_account",
                attributes: ["fullname", "email"],
              },
            ],
          },
          {
            model: Subject,
            as: "assignment_subject",
            attributes: ["subject_id", "subject_name", "subject_code", "subject_type"],
          },
          {
            model: Class,
            as: "assignment_class",
            attributes: ["class_id", "class_name", "class_level"],
          },
          {
            model: Stream,
            as: "assignment_stream",
            attributes: ["stream_id", "stream_name"],
          },
          {
            model: Term,
            as: "assignment_term",
            attributes: ["term_id", "term_name", "academic_year"],
          },
        ],
        order: [
          ["academic_year", "DESC"],
          ["term_id", "ASC"],
          ["class_id", "ASC"],
          ["stream_id", "ASC"],
          ["subject_id", "ASC"],
        ],
      });

      res.json({
        success: true,
        data: assignments,
        count: assignments.length,
      });
    } catch (error) {
      console.error("Error fetching assignments:", error);
      res.status(500).json({
        success: false,
        message: "Server error while fetching assignments",
        error: error.message,
      });
    }
  },

  // ========================================
  // ✅ GET ASSIGNMENT BY ID
  // ========================================
  getAssignmentById: async (req, res) => {
    try {
      const { id } = req.params;

      const assignment = await Assignment.findByPk(id, {
        include: [
          {
            model: Teacher,
            as: "assignment_teacher",
            attributes: ["teacher_id", "teacher_code", "phone_number", "specialization"],
            include: [
              {
                model: User,
                as: "user_account",
                attributes: ["fullname", "email"],
              },
            ],
          },
          {
            model: Subject,
            as: "assignment_subject",
            attributes: ["subject_id", "subject_name", "subject_code", "subject_type"],
          },
          {
            model: Class,
            as: "assignment_class",
            attributes: ["class_id", "class_name", "class_level"],
          },
          {
            model: Stream,
            as: "assignment_stream",
            attributes: ["stream_id", "stream_name"],
          },
          {
            model: Term,
            as: "assignment_term",
            attributes: ["term_id", "term_name", "academic_year"],
          },
          {
            model: Score,
            as: "assignment_scores",
            required: false,
            attributes: ["score_id", "score", "student_id", "submitted_at"],
            include: [
              {
                model: Student,
                as: "score_student",
                attributes: ["student_id", "admission_number", "fullname"],
              },
            ],
          },
        ],
      });

      if (!assignment) {
        return res.status(404).json({
          success: false,
          message: "Assignment not found",
        });
      }

      res.json({
        success: true,
        data: assignment,
      });
    } catch (error) {
      console.error("Error fetching assignment:", error);
      res.status(500).json({
        success: false,
        message: "Server error while fetching assignment",
        error: error.message,
      });
    }
  },

  // ========================================
  // ✅ GET TEACHER'S ASSIGNMENTS
  // ========================================
  getTeacherAssignments: async (req, res) => {
    try {
      const { teacher_id } = req.params;
      const { term_id, academic_year, is_active = true } = req.query;

      const whereClause = {
        teacher_id,
        is_active: is_active !== "false",
      };
      if (term_id) whereClause.term_id = term_id;
      if (academic_year) whereClause.academic_year = academic_year;

      // Assuming Assignment.getTeacherAssignments is a custom method
      const assignments = await Assignment.getTeacherAssignments(teacher_id, academic_year, term_id);

      res.json({
        success: true,
        data: assignments,
        count: assignments.length,
      });
    } catch (error) {
      console.error("Error fetching teacher assignments:", error);
      res.status(500).json({
        success: false,
        message: "Server error while fetching teacher assignments",
        error: error.message,
      });
    }
  },

  // ========================================
  // ✅ GET TEACHER'S ASSIGNED SUBJECTS
  // ========================================
  getMyAssignedSubjects: async (req, res) => {
    try {
      const teacher_id = req.user.teacher_id; // From authentication token
      const { academic_year, term_id, is_active = true } = req.query;

      if (!teacher_id) {
        return res.status(400).json({
          success: false,
          message: "Teacher ID is required",
        });
      }

      const whereClause = {
        teacher_id,
        is_active: is_active !== "false",
      };

      if (academic_year) whereClause.academic_year = academic_year;
      if (term_id) whereClause.term_id = term_id;

      const assignments = await Assignment.findAll({
        where: whereClause,
        include: [
          {
            model: Subject,
            as: "assignment_subject",
            attributes: ["subject_id", "subject_name", "subject_code", "subject_type"],
          },
          {
            model: Class,
            as: "assignment_class",
            attributes: ["class_id", "class_name", "class_level"],
          },
          {
            model: Stream,
            as: "assignment_stream",
            attributes: ["stream_id", "stream_name"],
          },
          {
            model: Term,
            as: "assignment_term",
            attributes: ["term_id", "term_name", "academic_year"],
          },
        ],
        order: [
          ["academic_year", "DESC"],
          ["term_id", "ASC"],
          ["class_id", "ASC"],
          ["stream_id", "ASC"],
        ],
      });

      // Format the response to group by subject
      const subjectsMap = new Map();

      assignments.forEach((assignment) => {
        const subject = assignment.assignment_subject;
        const subjectId = subject.subject_id;

        if (!subjectsMap.has(subjectId)) {
          subjectsMap.set(subjectId, {
            subject_id: subject.subject_id,
            subject_name: subject.subject_name,
            subject_code: subject.subject_code,
            subject_type: subject.subject_type,
            assignments: [],
          });
        }

        const subjectData = subjectsMap.get(subjectId);
        subjectData.assignments.push({
          assignment_id: assignment.assignment_id,
          class: {
            class_id: assignment.assignment_class.class_id,
            class_name: assignment.assignment_class.class_name,
            class_level: assignment.assignment_class.class_level,
          },
          stream: {
            stream_id: assignment.assignment_stream.stream_id,
            stream_name: assignment.assignment_stream.stream_name,
          },
          term: {
            term_id: assignment.assignment_term.term_id,
            term_name: assignment.assignment_term.term_name,
            academic_year: assignment.assignment_term.academic_year,
          },
          academic_year: assignment.academic_year,
          assigned_date: assignment.assigned_date,
        });
      });

      const subjects = Array.from(subjectsMap.values());

      res.json({
        success: true,
        data: subjects,
        count: subjects.length,
        total_assignments: assignments.length,
      });
    } catch (error) {
      console.error("Error fetching teacher's assigned subjects:", error);
      res.status(500).json({
        success: false,
        message: "Server error while fetching assigned subjects",
        error: error.message,
      });
    }
  },

  // ========================================
  // ✅ GET TEACHER'S ASSIGNMENTS BY TERM
  // ========================================
  getMyAssignmentsByTerm: async (req, res) => {
    try {
      const teacher_id = req.user.teacher_id;
      const { academic_year, term_id } = req.query;

      if (!teacher_id) {
        return res.status(400).json({
          success: false,
          message: "Teacher ID is required",
        });
      }

      if (!academic_year || !term_id) {
        return res.status(400).json({
          success: false,
          message: "Academic year and term ID are required",
        });
      }

      const assignments = await Assignment.findAll({
        where: {
          teacher_id,
          academic_year,
          term_id,
          is_active: true,
        },
        include: [
          {
            model: Subject,
            as: "assignment_subject",
            attributes: ["subject_id", "subject_name", "subject_code", "subject_type"],
          },
          {
            model: Class,
            as: "assignment_class",
            attributes: ["class_id", "class_name", "class_level"],
          },
          {
            model: Stream,
            as: "assignment_stream",
            attributes: ["stream_id", "stream_name"],
          },
          {
            model: Term,
            as: "assignment_term",
            attributes: ["term_id", "term_name"],
          },
        ],
        order: [
          [{ model: Class, as: "assignment_class" }, "class_name", "ASC"],
          [{ model: Stream, as: "assignment_stream" }, "stream_name", "ASC"],
          [{ model: Subject, as: "assignment_subject" }, "subject_name", "ASC"],
        ],
      });

      res.json({
        success: true,
        data: assignments,
        count: assignments.length,
        academic_year,
        term_id,
      });
    } catch (error) {
      console.error("Error fetching teacher assignments by term:", error);
      res.status(500).json({
        success: false,
        message: "Server error while fetching assignments",
        error: error.message,
      });
    }
  },

  // ========================================
  // ✅ GET TEACHER'S ASSIGNMENT DETAILS
  // ========================================
  getMyAssignmentDetails: async (req, res) => {
    try {
      const teacher_id = req.user.teacher_id;
      const { assignment_id } = req.params;

      if (!teacher_id) {
        return res.status(400).json({
          success: false,
          message: "Teacher ID is required",
        });
      }

      const assignment = await Assignment.findOne({
        where: {
          assignment_id,
          teacher_id,
          is_active: true,
        },
        include: [
          {
            model: Subject,
            as: "assignment_subject",
            attributes: ["subject_id", "subject_name", "subject_code", "subject_type"],
          },
          {
            model: Class,
            as: "assignment_class",
            attributes: ["class_id", "class_name", "class_level"],
          },
          {
            model: Stream,
            as: "assignment_stream",
            attributes: ["stream_id", "stream_name"],
          },
          {
            model: Term,
            as: "assignment_term",
            attributes: ["term_id", "term_name", "academic_year"],
          },
        ],
      });

      if (!assignment) {
        return res.status(404).json({
          success: false,
          message: "Assignment not found or you don't have permission to access it",
        });
      }

      res.json({
        success: true,
        data: assignment,
      });
    } catch (error) {
      console.error("Error fetching assignment details:", error);
      res.status(500).json({
        success: false,
        message: "Server error while fetching assignment details",
        error: error.message,
      });
    }
  },

  // ========================================
  // ✅ GET TEACHER'S ASSIGNMENT STATISTICS
  // ========================================
  getMyAssignmentStats: async (req, res) => {
    try {
      const teacher_id = req.user.teacher_id;
      const { academic_year, term_id } = req.query;

      if (!teacher_id) {
        return res.status(400).json({
          success: false,
          message: "Teacher ID is required",
        });
      }

      const whereClause = {
        teacher_id,
        is_active: true,
      };

      if (academic_year) whereClause.academic_year = academic_year;
      if (term_id) whereClause.term_id = term_id;

      const stats = await Assignment.findAll({
        where: whereClause,
        attributes: [
          "academic_year",
          "term_id",
          [sequelize.fn("COUNT", sequelize.col("assignment_id")), "total_assignments"],
          [sequelize.fn("COUNT", sequelize.fn("DISTINCT", sequelize.col("subject_id"))), "total_subjects"],
          [sequelize.fn("COUNT", sequelize.fn("DISTINCT", sequelize.col("class_id"))), "total_classes"],
        ],
        group: ["academic_year", "term_id"],
        order: [["academic_year", "DESC"], ["term_id", "ASC"]],
        raw: true,
      });

      // Get current term assignments count
      const currentYear = new Date().getFullYear().toString();
      const currentAssignments = await Assignment.count({
        where: {
          teacher_id,
          academic_year: currentYear,
          is_active: true,
        },
      });

      res.json({
        success: true,
        data: {
          statistics: stats,
          current_year_assignments: currentAssignments,
          total_career_assignments: stats.reduce((sum, stat) => sum + parseInt(stat.total_assignments), 0),
        },
      });
    } catch (error) {
      console.error("Error fetching teacher assignment statistics:", error);
      res.status(500).json({
        success: false,
        message: "Server error while fetching assignment statistics",
        error: error.message,
      });
    }
  },

  // ========================================
  // ✅ GET TEACHER'S TIMETABLE
  // ========================================
  getMyTimetable: async (req, res) => {
    try {
      const teacher_id = req.user.teacher_id;
      const { academic_year, term_id } = req.query;

      if (!teacher_id) {
        return res.status(400).json({
          success: false,
          message: "Teacher ID is required",
        });
      }

      if (!academic_year || !term_id) {
        return res.status(400).json({
          success: false,
          message: "Academic year and term ID are required",
        });
      }

      const assignments = await Assignment.findAll({
        where: {
          teacher_id,
          academic_year,
          term_id,
          is_active: true,
        },
        include: [
          {
            model: Subject,
            as: "assignment_subject",
            attributes: ["subject_id", "subject_name", "subject_code", "subject_type"],
          },
          {
            model: Class,
            as: "assignment_class",
            attributes: ["class_id", "class_name", "class_level"],
          },
          {
            model: Stream,
            as: "assignment_stream",
            attributes: ["stream_id", "stream_name"],
          },
          {
            model: Term,
            as: "assignment_term",
            attributes: ["term_id", "term_name"],
          },
        ],
        order: [
          [{ model: Class, as: "assignment_class" }, "class_name", "ASC"],
          [{ model: Stream, as: "assignment_stream" }, "stream_name", "ASC"],
          [{ model: Subject, as: "assignment_subject" }, "subject_name", "ASC"],
        ],
      });

      // Group assignments by class and stream
      const timetable = {};

      assignments.forEach((assignment) => {
        const classKey = `${assignment.assignment_class.class_name}-${assignment.assignment_stream.stream_name}`;

        if (!timetable[classKey]) {
          timetable[classKey] = {
            class: assignment.assignment_class,
            stream: assignment.assignment_stream,
            subjects: [],
          };
        }

        timetable[classKey].subjects.push({
          subject_id: assignment.assignment_subject.subject_id,
          subject_name: assignment.assignment_subject.subject_name,
          subject_code: assignment.assignment_subject.subject_code,
          subject_type: assignment.assignment_subject.subject_type,
          assignment_id: assignment.assignment_id,
        });
      });

      res.json({
        success: true,
        data: {
          academic_year,
          term_id,
          timetable: Object.values(timetable),
          total_classes: Object.keys(timetable).length,
          total_subjects: assignments.length,
        },
      });
    } catch (error) {
      console.error("Error fetching teacher timetable:", error);
      res.status(500).json({
        success: false,
        message: "Server error while fetching timetable",
        error: error.message,
      });
    }
  },

  // ========================================
  // ✅ GET CLASS ASSIGNMENTS
  // ========================================
  getClassAssignments: async (req, res) => {
    try {
      const { class_id, stream_id } = req.params;
      const { academic_year, term_id, is_active = true } = req.query;

      if (!academic_year || !term_id) {
        return res.status(400).json({
          success: false,
          message: "Academic year and term ID are required",
        });
      }

      // Assuming Assignment.getClassAssignments is a custom method
      const assignments = await Assignment.getClassAssignments(class_id, stream_id, academic_year, term_id);

      res.json({
        success: true,
        data: assignments,
        count: assignments.length,
      });
    } catch (error) {
      console.error("Error fetching class assignments:", error);
      res.status(500).json({
        success: false,
        message: "Server error while fetching class assignments",
        error: error.message,
      });
    }
  },

  // ========================================
  // ✅ UPDATE ASSIGNMENT
  // ========================================
  updateAssignment: async (req, res) => {
    const { id } = req.params;
    const { teacher_id, subject_id, class_id, stream_id, academic_year, term_id, is_active } = req.body;

    const transaction = await sequelize.transaction();

    try {
      const assignment = await Assignment.findByPk(id, { transaction });
      if (!assignment) {
        await transaction.rollback();
        return res.status(404).json({
          success: false,
          message: "Assignment not found",
        });
      }

      // If changing assignment details, check for duplicates
      if (teacher_id || subject_id || class_id || stream_id || academic_year || term_id) {
        const whereClause = {
          assignment_id: { [Op.ne]: id },
        };

        if (teacher_id) whereClause.teacher_id = teacher_id;
        if (subject_id) whereClause.subject_id = subject_id;
        if (class_id) whereClause.class_id = class_id;
        if (stream_id) whereClause.stream_id = stream_id;
        if (academic_year) whereClause.academic_year = academic_year;
        if (term_id) whereClause.term_id = term_id;

        const existingAssignment = await Assignment.findOne({
          where: whereClause,
          transaction,
        });

        if (existingAssignment) {
          await transaction.rollback();
          return res.status(400).json({
            success: false,
            message: "An assignment with these details already exists",
          });
        }
      }

      await assignment.update(
        {
          teacher_id: teacher_id || assignment.teacher_id,
          subject_id: subject_id || assignment.subject_id,
          class_id: class_id || assignment.class_id,
          stream_id: stream_id || assignment.stream_id,
          academic_year: academic_year || assignment.academic_year,
          term_id: term_id || assignment.term_id,
          is_active: is_active !== undefined ? is_active : assignment.is_active,
        },
        { transaction }
      );

      await transaction.commit();

      const updatedAssignment = await Assignment.findByPk(id, {
        include: [
          {
            model: Teacher,
            as: "assignment_teacher",
            attributes: ["teacher_id", "teacher_code"],
            include: [
              {
                model: User,
                as: "user_account",
                attributes: ["fullname"],
              },
            ],
          },
          {
            model: Subject,
            as: "assignment_subject",
            attributes: ["subject_id", "subject_name", "subject_code"],
          },
          {
            model: Class,
            as: "assignment_class",
            attributes: ["class_id", "class_name"],
          },
          {
            model: Stream,
            as: "assignment_stream",
            attributes: ["stream_id", "stream_name"],
          },
          {
            model: Term,
            as: "assignment_term",
            attributes: ["term_id", "term_name", "academic_year"],
          },
        ],
      });

      res.json({
        success: true,
        message: "✅ Assignment updated successfully",
        data: updatedAssignment,
      });
    } catch (error) {
      if (!transaction.finished) {
        await transaction.rollback();
      }
      console.error("Error updating assignment:", error);
      res.status(500).json({
        success: false,
        message: "Server error while updating assignment",
        error: error.message,
      });
    }
  },

  // ========================================
  // ✅ DELETE ASSIGNMENT (Soft Delete)
  // ========================================
  deleteAssignment: async (req, res) => {
    const { id } = req.params;

    const transaction = await sequelize.transaction();

    try {
      const assignment = await Assignment.findByPk(id, {
        include: [
          {
            model: Score,
            as: "assignment_scores",
            required: false,
          },
        ],
        transaction,
      });

      if (!assignment) {
        await transaction.rollback();
        return res.status(404).json({
          success: false,
          message: "Assignment not found",
        });
      }

      // Check if assignment has scores
      if (assignment.assignment_scores && assignment.assignment_scores.length > 0) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: "Cannot delete assignment with existing scores. Remove scores first.",
          scores_count: assignment.assignment_scores.length,
        });
      }

      // Soft delete by setting is_active to false
      await assignment.update({ is_active: false }, { transaction });

      await transaction.commit();

      res.json({
        success: true,
        message: "✅ Assignment deactivated successfully",
      });
    } catch (error) {
      if (!transaction.finished) {
        await transaction.rollback();
      }
      console.error("Error deleting assignment:", error);
      res.status(500).json({
        success: false,
        message: "Server error while deleting assignment",
        error: error.message,
      });
    }
  },

  // ========================================
  // ✅ REACTIVATE ASSIGNMENT
  // ========================================
  reactivateAssignment: async (req, res) => {
    try {
      const { id } = req.params;

      const assignment = await Assignment.findByPk(id);
      if (!assignment) {
        return res.status(404).json({
          success: false,
          message: "Assignment not found",
        });
      }

      await assignment.update({ is_active: true });

      res.json({
        success: true,
        message: "✅ Assignment reactivated successfully",
        data: assignment,
      });
    } catch (error) {
      console.error("Error reactivating assignment:", error);
      res.status(500).json({
        success: false,
        message: "Server error while reactivating assignment",
        error: error.message,
      });
    }
  },

  // ========================================
  // ✅ GET ASSIGNMENT STATISTICS
  // ========================================
  getAssignmentStats: async (req, res) => {
    try {
      const { id } = req.params;

      const assignment = await Assignment.findByPk(id, {
        include: [
          {
            model: Score,
            as: "assignment_scores",
            attributes: [],
            required: false,
          },
          {
            model: Class,
            as: "assignment_class",
            attributes: [],
            include: [
              {
                model: Student,
                as: "class_students",
                attributes: [],
                required: false,
                where: { is_active: true },
              },
            ],
          },
        ],
        attributes: [
          "assignment_id",
          [sequelize.fn("COUNT", sequelize.fn("DISTINCT", sequelize.col("assignment_scores.score_id"))), "scores_count"],
          [
            sequelize.fn("COUNT", sequelize.fn("DISTINCT", sequelize.col("assignment_class->class_students.student_id"))),
            "students_count",
          ],
          [sequelize.fn("AVG", sequelize.col("assignment_scores.score")), "average_score"],
          [sequelize.fn("MAX", sequelize.col("assignment_scores.score")), "highest_score"],
          [sequelize.fn("MIN", sequelize.col("assignment_scores.score")), "lowest_score"],
        ],
        group: ["Assignment.assignment_id"],
        raw: true,
      });

      if (!assignment) {
        return res.status(404).json({
          success: false,
          message: "Assignment not found",
        });
      }

      res.json({
        success: true,
        data: assignment,
      });
    } catch (error) {
      console.error("Error fetching assignment statistics:", error);
      res.status(500).json({
        success: false,
        message: "Server error while fetching assignment statistics",
        error: error.message,
      });
    }
  },

  // ========================================
  // ✅ CHECK IF TEACHER IS ASSIGNED
  // ========================================
  isTeacherAssigned: async (req, res) => {
    try {
      const { teacher_id, subject_id, class_id, stream_id, academic_year, term_id } = req.query;

      if (!teacher_id || !subject_id || !class_id || !stream_id || !academic_year || !term_id) {
        return res.status(400).json({
          success: false,
          message: "All parameters are required: teacher_id, subject_id, class_id, stream_id, academic_year, term_id",
        });
      }

      // Assuming Assignment.isTeacherAssigned is a custom method
      const isAssigned = await Assignment.isTeacherAssigned(
        teacher_id,
        subject_id,
        class_id,
        stream_id,
        academic_year,
        term_id
      );

      res.json({
        success: true,
        data: {
          is_assigned: isAssigned,
          assignment_exists: isAssigned,
        },
      });
    } catch (error) {
      console.error("Error checking teacher assignment:", error);
      res.status(500).json({
        success: false,
        message: "Server error while checking teacher assignment",
        error: error.message,
      });
    }
  },

  // ========================================
  // ✅ GET ASSIGNMENT STUDENTS
  // ========================================
  getAssignmentStudents: async (req, res) => {
    try {
      const { id } = req.params;

      const assignment = await Assignment.findByPk(id, {
        include: [
          {
            model: Class,
            as: "assignment_class",
            attributes: ["class_id", "class_name"],
          },
          {
            model: Stream,
            as: "assignment_stream",
            attributes: ["stream_id", "stream_name"],
          },
        ],
      });

      if (!assignment) {
        return res.status(404).json({
          success: false,
          message: "Assignment not found",
        });
      }

      // Get all students for this class and stream
      const students = await Student.findAll({
        where: {
          class_id: assignment.class_id,
          stream_id: assignment.stream_id,
          is_active: true,
        },
        attributes: ["student_id", "admission_number", "fullname", "guardian_phone"],
        include: [
          {
            model: Score,
            as: "student_scores",
            where: { assignment_id: id },
            required: false,
            attributes: ["score_id", "score", "submitted_at"],
          },
        ],
        order: [["fullname", "ASC"]],
      });

      res.json({
        success: true,
        data: {
          assignment: {
            assignment_id: assignment.assignment_id,
            class: assignment.assignment_class.class_name,
            stream: assignment.assignment_stream.stream_name,
          },
          students: students,
          count: students.length,
        },
      });
    } catch (error) {
      console.error("Error fetching assignment students:", error);
      res.status(500).json({
        success: false,
        message: "Server error while fetching assignment students",
        error: error.message,
      });
    }
  },
};

module.exports = assignmentController;
const { User, Teacher, Subject, Assignment, Class, Stream, Student, Score, Term, sequelize } = require("../models");

const teacherController = {
 
  createTeacher: async (req, res) => {
    // Extract and validate required fields
    const { 
      fullname, 
      email, 
      password, 
      teacher_code,
      // Optional fields with defaults
      phone_number = null,
      specialization = null,
      employment_date = null
    } = req.body;

    // Validation
    if (!fullname || !email || !password || !teacher_code) {
      return res.status(400).json({
        success: false,
        message: "Fullname, email, password, and teacher code are required",
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid email address",
      });
    }

    // Validate password length
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters long",
      });
    }

    let transaction;

    try {
      transaction = await sequelize.transaction();

      const normalizedEmail = email.toLowerCase().trim();
      const trimmedTeacherCode = teacher_code.trim();
      const trimmedFullname = fullname.trim();
      
      // Check if email already exists
      const existingUser = await User.findOne({ 
        where: { email: normalizedEmail }, 
        transaction 
      });
      
      if (existingUser) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: "Email already in use",
        });
      }

      // Check if teacher code already exists
      const existingTeacherCode = await Teacher.findOne({ 
        where: { teacher_code: trimmedTeacherCode }, 
        transaction 
      });
      
      if (existingTeacherCode) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: "Teacher code already in use",
        });
      }

      // Create user
      const user = await User.create(
        { 
          fullname: trimmedFullname, 
          email: normalizedEmail, 
          password_hash: password, // Make sure your User model hashes this password
          role: "teacher" 
        },
        { transaction }
      );

      // Create teacher with cleaned data
      const teacher = await Teacher.create(
        {
          user_id: user.user_id,
          teacher_code: trimmedTeacherCode,
          phone_number: phone_number?.trim() || null,
          specialization: specialization?.trim() || null,
          employment_date: employment_date || null
        },
        { transaction }
      );

      await transaction.commit();

      // Return response without sensitive data
      res.status(201).json({
        success: true,
        message: "✅ Teacher created successfully",
        data: {
          teacher_id: teacher.teacher_id,
          teacher_code: teacher.teacher_code,
          phone_number: teacher.phone_number,
          specialization: teacher.specialization,
          employment_date: teacher.employment_date,
          is_active: teacher.is_active,
          user: {
            user_id: user.user_id,
            fullname: user.fullname,
            email: user.email,
            role: user.role,
          },
        },
      });
    } catch (error) {
      // Only rollback if transaction exists and isn't finished
      if (transaction && !transaction.finished) {
        await transaction.rollback();
      }
      console.error("Error creating teacher:", error);
      res.status(500).json({
        success: false,
        message: "Server error while creating teacher",
        error: error.message,
      });
    }
  },

  // ... rest of your controller methods remain the same
  getAllTeachers: async (req, res) => {
    try {
      const { is_active = true } = req.query;
      
      const whereClause = { is_active: is_active !== 'false' };

      const teachers = await Teacher.findAll({
        where: whereClause,
        include: [
          {
            model: User,
            as: "user_account",
            attributes: ["user_id", "fullname", "email", "role"],
          }
        ],
        order: [["teacher_id", "ASC"]],
      });

      res.json({ 
        success: true, 
        data: teachers, 
        count: teachers.length 
      });
    } catch (error) {
      console.error("Error fetching teachers:", error);
      res.status(500).json({
        success: false,
        message: "Server error while fetching teachers",
        error: error.message,
      });
    }
  },

  getTeacherById: async (req, res) => {
    try {
      const teacherId = req.params.id || req.user.teacher_id;

      const teacher = await Teacher.findByPk(teacherId, {
        include: [
          {
            model: User,
            as: "user_account",
            attributes: ["user_id", "fullname", "email", "role"],
          },
          {
            model: Assignment,
            as: "teacher_assignments",
            where: { is_active: true },
            required: false,
            include: [
              {
                model: Subject,
                as: 'assignment_subject',
                attributes: ['subject_id', 'subject_name', 'subject_code']
              },
              {
                model: Class,
                as: 'assignment_class',
                attributes: ['class_id', 'class_name']
              },
              {
                model: Stream,
                as: 'assignment_stream',
                attributes: ['stream_id', 'stream_name']
              }
            ]
          }
        ],
      });

      if (!teacher) {
        return res.status(404).json({
          success: false,
          message: "Teacher not found",
        });
      }

      res.json({ 
        success: true, 
        data: teacher 
      });
    } catch (error) {
      console.error("Error fetching teacher:", error);
      res.status(500).json({
        success: false,
        message: "Server error while fetching teacher",
        error: error.message,
      });
    }
  },

  getTeacherAssignments: async (req, res) => {
    try {
      const teacherId = req.params.teacher_id || req.params.id;
      const { term_id, academic_year, is_active = true } = req.query;

      const whereClause = { 
        teacher_id: teacherId,
        is_active: is_active !== 'false' 
      };
      if (term_id) whereClause.term_id = term_id;
      if (academic_year) whereClause.academic_year = academic_year;

      const assignments = await Assignment.findAll({
        where: whereClause,
        include: [
          { 
            model: Subject, 
            as: "assignment_subject",
            attributes: ["subject_id", "subject_name", "subject_code"] 
          },
          { 
            model: Class, 
            as: "assignment_class",
            attributes: ["class_id", "class_name"] 
          },
          { 
            model: Stream, 
            as: "assignment_stream",
            attributes: ["stream_id", "stream_name"] 
          },
          { 
            model: Term, 
            as: "assignment_term",
            attributes: ["term_id", "term_name", "academic_year"] 
          }
        ],
        order: [
          ['class_id', 'ASC'],
          ['stream_id', 'ASC'],
          ['subject_id', 'ASC']
        ]
      });

      res.json({
        success: true,
        data: assignments,
        count: assignments.length
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

  getMyStudents: async (req, res) => {
    try {
      const teacherId = req.params.id || req.user.teacher_id;

      const students = await Student.findAll({
        where: { 
          class_teacher_id: teacherId,
          is_active: true 
        },
        include: [
          {
            model: Class,
            as: 'student_class',
            attributes: ['class_id', 'class_name']
          },
          {
            model: Stream,
            as: 'student_stream',
            attributes: ['stream_id', 'stream_name']
          }
        ],
        order: [
          ['class_id', 'ASC'],
          ['stream_id', 'ASC'],
          ['fullname', 'ASC']
        ]
      });

      res.status(200).json({
        success: true,
        data: students,
        count: students.length
      });
    } catch (error) {
      console.error("Error fetching teacher's students:", error);
      res.status(500).json({
        success: false,
        message: "Server error while fetching teacher's students",
        error: error.message,
      });
    }
  },

  
  updateTeacher: async (req, res) => {
    const teacherId = req.params.id;
    
    // Extract fields with proper defaults
    const { 
      fullname, 
      email, 
      phone_number, 
      teacher_code, 
      specialization, 
      employment_date, 
      is_active 
    } = req.body;

    let transaction;

    try {
      transaction = await sequelize.transaction();

      const teacher = await Teacher.findByPk(teacherId, { 
        include: [{
          model: User,
          as: "user_account"
        }],
        transaction 
      });

      if (!teacher) {
        await transaction.rollback();
        return res.status(404).json({
          success: false,
          message: "Teacher not found",
        });
      }

      // Validate teacher code if it's being changed
      if (teacher_code && teacher_code !== teacher.teacher_code) {
        const trimmedTeacherCode = teacher_code.trim();
        const existingTeacher = await Teacher.findOne({ 
          where: { teacher_code: trimmedTeacherCode },
          transaction 
        });
        if (existingTeacher) {
          await transaction.rollback();
          return res.status(400).json({
            success: false,
            message: "Teacher code already in use",
          });
        }
      }

      // Update teacher with cleaned data
      const updateData = {};
      
      if (teacher_code) updateData.teacher_code = teacher_code.trim();
      if (phone_number !== undefined) updateData.phone_number = phone_number?.trim() || null;
      if (specialization !== undefined) updateData.specialization = specialization?.trim() || null;
      if (employment_date !== undefined) updateData.employment_date = employment_date || null;
      if (is_active !== undefined) updateData.is_active = is_active;

      if (Object.keys(updateData).length > 0) {
        await teacher.update(updateData, { transaction });
      }

      // Update user if user data is provided
      if (teacher.user_account) {
        const userUpdateData = {};
        
        if (fullname) userUpdateData.fullname = fullname.trim();
        if (email) {
          const normalizedEmail = email.toLowerCase().trim();
          // Validate email if it's being changed
          if (normalizedEmail !== teacher.user_account.email) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(normalizedEmail)) {
              await transaction.rollback();
              return res.status(400).json({
                success: false,
                message: "Please provide a valid email address",
              });
            }
            
            // Check if new email is already in use
            const existingUser = await User.findOne({ 
              where: { email: normalizedEmail },
              transaction 
            });
            if (existingUser && existingUser.user_id !== teacher.user_account.user_id) {
              await transaction.rollback();
              return res.status(400).json({
                success: false,
                message: "Email already in use by another user",
              });
            }
            userUpdateData.email = normalizedEmail;
          }
        }

        if (Object.keys(userUpdateData).length > 0) {
          await teacher.user_account.update(userUpdateData, { transaction });
        }
      }

      await transaction.commit();

      // Fetch updated teacher with user data
      const updatedTeacher = await Teacher.findByPk(teacherId, {
        include: [
          {
            model: User,
            as: "user_account",
            attributes: ["user_id", "fullname", "email", "role"]
          }
        ]
      });

      res.json({
        success: true,
        message: "✅ Teacher updated successfully",
        data: updatedTeacher
      });
    } catch (error) {
      if (transaction && !transaction.finished) {
        await transaction.rollback();
      }
      console.error("Error updating teacher:", error);
      res.status(500).json({
        success: false,
        message: "Server error while updating teacher",
        error: error.message,
      });
    }
  },

  deleteTeacher: async (req, res) => {
    const teacherId = req.params.id;

    let transaction;
    
    try {
      transaction = await sequelize.transaction();

      const teacher = await Teacher.findByPk(teacherId, { 
        include: [
          {
            model: Assignment,
            as: 'teacher_assignments',
            where: { is_active: true },
            required: false
          }
        ],
        transaction 
      });

      if (!teacher) {
        await transaction.rollback();
        return res.status(404).json({ 
          success: false, 
          message: 'Teacher not found' 
        });
      }

      if (teacher.teacher_assignments && teacher.teacher_assignments.length > 0) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: "Cannot delete teacher with active assignments. Remove assignments first.",
          active_assignments: teacher.teacher_assignments.length
        });
      }

      await teacher.update({ is_active: false }, { transaction });

      if (teacher.user_account) {
        await teacher.user_account.update({ is_active: false }, { transaction });
      }

      await transaction.commit();
      
      return res.json({ 
        success: true, 
        message: '✅ Teacher deactivated successfully' 
      });
    } catch (error) {
      if (transaction && !transaction.finished) {
        await transaction.rollback();
      }
      console.error('Error deleting teacher:', error);
      return res.status(500).json({ 
        success: false, 
        message: 'Server error', 
        error: error.message 
      });
    }
  },

  reactivateTeacher: async (req, res) => {
    try {
      const teacherId = req.params.id;

      const teacher = await Teacher.findByPk(teacherId, {
        include: [{
          model: User,
          as: "user_account"
        }]
      });

      if (!teacher) {
        return res.status(404).json({ 
          success: false, 
          message: 'Teacher not found' 
        });
      }

      await teacher.update({ is_active: true });

      if (teacher.user_account) {
        await teacher.user_account.update({ is_active: true });
      }

      res.json({
        success: true,
        message: "✅ Teacher reactivated successfully",
        data: teacher
      });
    } catch (error) {
      console.error('Error reactivating teacher:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Server error', 
        error: error.message 
      });
    }
  },
 getMyAssignedSubjects: async (req, res) => {
    try {
      const teacher_id = req.user.teacher_id; // Assuming teacher ID is in the token
      const { academic_year, term_id, is_active = true } = req.query;

      if (!teacher_id) {
        return res.status(400).json({
          success: false,
          message: "Teacher ID is required"
        });
      }

      const whereClause = { 
        teacher_id,
        is_active: is_active !== 'false' 
      };
      
      if (academic_year) whereClause.academic_year = academic_year;
      if (term_id) whereClause.term_id = term_id;

      const assignments = await Assignment.findAll({
        where: whereClause,
        include: [
          {
            model: Subject,
            as: "assignment_subject",
            attributes: ['subject_id', 'subject_name', 'subject_code', 'subject_type']
          },
          {
            model: Class,
            as: "assignment_class",
            attributes: ['class_id', 'class_name', 'class_level']
          },
          {
            model: Stream,
            as: "assignment_stream",
            attributes: ['stream_id', 'stream_name']
          },
          {
            model: Term,
            as: "assignment_term",
            attributes: ['term_id', 'term_name', 'academic_year']
          }
        ],
        order: [
          ['academic_year', 'DESC'],
          ['term_id', 'ASC'],
          ['class_id', 'ASC'],
          ['stream_id', 'ASC']
        ]
      });

      // Format the response to group by subject
      const subjectsMap = new Map();

      assignments.forEach(assignment => {
        const subject = assignment.assignment_subject;
        const subjectId = subject.subject_id;

        if (!subjectsMap.has(subjectId)) {
          subjectsMap.set(subjectId, {
            subject_id: subject.subject_id,
            subject_name: subject.subject_name,
            subject_code: subject.subject_code,
            subject_type: subject.subject_type,
            assignments: []
          });
        }

        const subjectData = subjectsMap.get(subjectId);
        subjectData.assignments.push({
          assignment_id: assignment.assignment_id,
          class: {
            class_id: assignment.assignment_class.class_id,
            class_name: assignment.assignment_class.class_name,
            class_level: assignment.assignment_class.class_level
          },
          stream: {
            stream_id: assignment.assignment_stream.stream_id,
            stream_name: assignment.assignment_stream.stream_name
          },
          term: {
            term_id: assignment.assignment_term.term_id,
            term_name: assignment.assignment_term.term_name,
            academic_year: assignment.assignment_term.academic_year
          },
          academic_year: assignment.academic_year,
          assigned_date: assignment.assigned_date
        });
      });

      const subjects = Array.from(subjectsMap.values());

      res.json({
        success: true,
        data: subjects,
        count: subjects.length,
        total_assignments: assignments.length
      });

    } catch (error) {
      console.error("Error fetching teacher's assigned subjects:", error);
      res.status(500).json({
        success: false,
        message: "Server error while fetching assigned subjects",
        error: error.message
      });
    }
  },

  // ✅ GET TEACHER'S ASSIGNMENTS BY TERM
  getMyAssignmentsByTerm: async (req, res) => {
    try {
      const teacher_id = req.user.teacher_id;
      const { academic_year, term_id } = req.query;

      if (!teacher_id) {
        return res.status(400).json({
          success: false,
          message: "Teacher ID is required"
        });
      }

      if (!academic_year || !term_id) {
        return res.status(400).json({
          success: false,
          message: "Academic year and term ID are required"
        });
      }

      const assignments = await Assignment.findAll({
        where: { 
          teacher_id,
          academic_year,
          term_id,
          is_active: true 
        },
        include: [
          {
            model: Subject,
            as: "assignment_subject",
            attributes: ['subject_id', 'subject_name', 'subject_code', 'subject_type']
          },
          {
            model: Class,
            as: "assignment_class",
            attributes: ['class_id', 'class_name', 'class_level']
          },
          {
            model: Stream,
            as: "assignment_stream",
            attributes: ['stream_id', 'stream_name']
          },
          {
            model: Term,
            as: "assignment_term",
            attributes: ['term_id', 'term_name']
          }
        ],
        order: [
          [Class, 'class_name', 'ASC'],
          [Stream, 'stream_name', 'ASC'],
          [Subject, 'subject_name', 'ASC']
        ]
      });

      res.json({
        success: true,
        data: assignments,
        count: assignments.length,
        academic_year,
        term_id
      });

    } catch (error) {
      console.error("Error fetching teacher assignments by term:", error);
      res.status(500).json({
        success: false,
        message: "Server error while fetching assignments",
        error: error.message
      });
    }
  },

  // ✅ GET TEACHER'S ASSIGNMENT DETAILS
  getMyAssignmentDetails: async (req, res) => {
    try {
      const teacher_id = req.user.teacher_id;
      const { assignment_id } = req.params;

      if (!teacher_id) {
        return res.status(400).json({
          success: false,
          message: "Teacher ID is required"
        });
      }

      const assignment = await Assignment.findOne({
        where: { 
          assignment_id,
          teacher_id,
          is_active: true 
        },
        include: [
          {
            model: Subject,
            as: "assignment_subject",
            attributes: ['subject_id', 'subject_name', 'subject_code', 'subject_type']
          },
          {
            model: Class,
            as: "assignment_class",
            attributes: ['class_id', 'class_name', 'class_level']
          },
          {
            model: Stream,
            as: "assignment_stream",
            attributes: ['stream_id', 'stream_name']
          },
          {
            model: Term,
            as: "assignment_term",
            attributes: ['term_id', 'term_name', 'academic_year']
          }
        ]
      });

      if (!assignment) {
        return res.status(404).json({
          success: false,
          message: "Assignment not found or you don't have permission to access it"
        });
      }

      res.json({
        success: true,
        data: assignment
      });

    } catch (error) {
      console.error("Error fetching assignment details:", error);
      res.status(500).json({
        success: false,
        message: "Server error while fetching assignment details",
        error: error.message
      });
    }
  },

  // ✅ GET TEACHER'S ASSIGNMENT STATISTICS
  getMyAssignmentStats: async (req, res) => {
    try {
      const teacher_id = req.user.teacher_id;
      const { academic_year, term_id } = req.query;

      if (!teacher_id) {
        return res.status(400).json({
          success: false,
          message: "Teacher ID is required"
        });
      }

      const whereClause = { 
        teacher_id,
        is_active: true 
      };
      
      if (academic_year) whereClause.academic_year = academic_year;
      if (term_id) whereClause.term_id = term_id;

      const stats = await Assignment.findAll({
        where: whereClause,
        attributes: [
          'academic_year',
          'term_id',
          [sequelize.fn('COUNT', sequelize.col('assignment_id')), 'total_assignments'],
          [sequelize.fn('COUNT', sequelize.fn('DISTINCT', sequelize.col('subject_id'))), 'total_subjects'],
          [sequelize.fn('COUNT', sequelize.fn('DISTINCT', sequelize.col('class_id'))), 'total_classes']
        ],
        group: ['academic_year', 'term_id'],
        order: [['academic_year', 'DESC'], ['term_id', 'ASC']],
        raw: true
      });

      // Get current term assignments count
      const currentYear = new Date().getFullYear().toString();
      const currentAssignments = await Assignment.count({
        where: {
          teacher_id,
          academic_year: currentYear,
          is_active: true
        }
      });

      res.json({
        success: true,
        data: {
          statistics: stats,
          current_year_assignments: currentAssignments,
          total_career_assignments: stats.reduce((sum, stat) => sum + parseInt(stat.total_assignments), 0)
        }
      });

    } catch (error) {
      console.error("Error fetching teacher assignment statistics:", error);
      res.status(500).json({
        success: false,
        message: "Server error while fetching assignment statistics",
        error: error.message
      });
    }
  },
   getMyTimetable: async (req, res) => {
    try {
      const teacher_id = req.user.teacher_id;
      const { academic_year, term_id } = req.query;

      if (!teacher_id) {
        return res.status(400).json({
          success: false,
          message: "Teacher ID is required"
        });
      }

      if (!academic_year || !term_id) {
        return res.status(400).json({
          success: false,
          message: "Academic year and term ID are required"
        });
      }

      const assignments = await Assignment.findAll({
        where: { 
          teacher_id,
          academic_year,
          term_id,
          is_active: true 
        },
        include: [
          {
            model: Subject,
            as: "assignment_subject",
            attributes: ['subject_id', 'subject_name', 'subject_code', 'subject_type']
          },
          {
            model: Class,
            as: "assignment_class",
            attributes: ['class_id', 'class_name', 'class_level']
          },
          {
            model: Stream,
            as: "assignment_stream",
            attributes: ['stream_id', 'stream_name']
          },
          {
            model: Term,
            as: "assignment_term",
            attributes: ['term_id', 'term_name']
          }
        ],
        order: [
          [Class, 'class_name', 'ASC'],
          [Stream, 'stream_name', 'ASC'],
          [Subject, 'subject_name', 'ASC']
        ]
      });

      // Group assignments by class and stream
      const timetable = {};

      assignments.forEach(assignment => {
        const classKey = `${assignment.assignment_class.class_name}-${assignment.assignment_stream.stream_name}`;
        
        if (!timetable[classKey]) {
          timetable[classKey] = {
            class: assignment.assignment_class,
            stream: assignment.assignment_stream,
            subjects: []
          };
        }

        timetable[classKey].subjects.push({
          subject_id: assignment.assignment_subject.subject_id,
          subject_name: assignment.assignment_subject.subject_name,
          subject_code: assignment.assignment_subject.subject_code,
          subject_type: assignment.assignment_subject.subject_type,
          assignment_id: assignment.assignment_id
        });
      });

      res.json({
        success: true,
        data: {
          academic_year,
          term_id,
          timetable: Object.values(timetable),
          total_classes: Object.keys(timetable).length,
          total_subjects: assignments.length
        }
      });

    } catch (error) {
      console.error("Error fetching teacher timetable:", error);
      res.status(500).json({
        success: false,
        message: "Server error while fetching timetable",
        error: error.message
      });
    }
  },
  getTeacherStats: async (req, res) => {
    try {
      const teacherId = req.params.id;

      const teacher = await Teacher.findByPk(teacherId, {
        include: [
          {
            model: Assignment,
            as: "teacher_assignments",
            attributes: [],
            required: false
          },
          {
            model: Student,
            as: "teacher_students",
            attributes: [],
            required: false
          }
        ],
        attributes: [
          'teacher_id',
          'teacher_code',
          'specialization',
          'is_active',
          [
            sequelize.literal('COUNT(DISTINCT "teacher_assignments"."assignment_id")'),
            'assignment_count'
          ],
          [
            sequelize.literal('COUNT(DISTINCT "teacher_students"."student_id")'),
            'student_count'
          ]
        ],
        group: ['Teacher.teacher_id']
      });

      if (!teacher) {
        return res.status(404).json({
          success: false,
          message: "Teacher not found"
        });
      }

      res.json({
        success: true,
        data: teacher
      });
    } catch (error) {
      console.error("Error fetching teacher stats:", error);
      res.status(500).json({
        success: false,
        message: "Server error while fetching teacher statistics",
        error: error.message,
      });
    }
  },

  getUserStats: async (req, res) => {
    try {
      const stats = await User.findAll({
        attributes: [
          'role',
          [sequelize.fn('COUNT', sequelize.col('user_id')), 'count'],
          [sequelize.fn('SUM', sequelize.cast(sequelize.col('is_active'), 'int')), 'active_count']
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

      res.json({
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
      res.status(500).json({
        success: false,
        message: "Server error while fetching user statistics",
        error: error.message,
      });
    }
  }
};

module.exports = teacherController;
const { Subject, Teacher, User, Assignment, Class, Stream, Student, Score, Term, sequelize } = require("../models");
const { Op } = require("sequelize");

const subjectController = {

  createSubject: async (req, res) => {
    const { subject_name, subject_code, subject_type = 'core' } = req.body;

    if (!subject_name || !subject_code) {
      return res.status(400).json({ 
        success: false,
        message: "Subject name and code are required" 
      });
    }

    let transaction;

    try {
      transaction = await sequelize.transaction();

     
      const existingSubject = await Subject.findOne({
        where: { [Op.or]: [{ subject_name }, { subject_code }] },
        transaction,
      });

      if (existingSubject) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: "Subject name or code already exists"
        });
      }

   
      const subject = await Subject.create(
        { 
          subject_name, 
          subject_code, 
          subject_type 
        },
        { transaction }
      );

      await transaction.commit();

      res.status(201).json({
        success: true,
        message: "✅ Subject created successfully",
        data: subject,
      });

    } catch (error) {
      if (transaction && !transaction.finished) {
        await transaction.rollback();
      }
      console.error("Error creating subject:", error);
      res.status(500).json({ 
        success: false,
        message: error.message || "Server error" 
      });
    }
  },

 
  getSubjects: async (req, res) => {
    try {
      const { subject_type, is_active = true } = req.query;
      
      const whereClause = { is_active: is_active !== 'false' };
      if (subject_type) whereClause.subject_type = subject_type;

      const subjects = await Subject.findAll({
        where: whereClause,
        include: [
          {
            model: Assignment,
            as: "subject_assignments",
            attributes: ['assignment_id'],
            where: { is_active: true },
            required: false,
            include: [
              {
                model: Teacher,
                as: 'assignment_teacher',
                attributes: ['teacher_id', 'teacher_code'],
                include: [
                  {
                    model: User,
                    as: 'user_account',
                    attributes: ['fullname']
                  }
                ]
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
              },
              {
                model: Term,
                as: 'assignment_term',
                attributes: ['term_id', 'term_name']
              }
            ]
          }
        ],
        order: [["subject_name", "ASC"]],
      });


      const formattedSubjects = subjects.map(subject => ({
        ...subject.toJSON(),
        teachers: [...new Set(
          subject.subject_assignments
            .filter(assignment => assignment.assignment_teacher)
            .map(assignment => ({
              teacher_id: assignment.assignment_teacher.teacher_id,
              teacher_code: assignment.assignment_teacher.teacher_code,
              fullname: assignment.assignment_teacher.user_account.fullname,
              classes: subject.subject_assignments
                .filter(a => a.assignment_teacher?.teacher_id === assignment.assignment_teacher.teacher_id)
                .map(a => ({
                  class_name: a.assignment_class.class_name,
                  stream_name: a.assignment_stream.stream_name,
                  term_name: a.assignment_term.term_name
                }))
            }))
        )]
      }));

      res.json({
        success: true,
        data: formattedSubjects,
        count: subjects.length
      });
    } catch (error) {
      console.error("[getSubjects] Error fetching subjects:", error);
      res.status(500).json({ 
        success: false,
        message: "Server error", 
        error: error.message 
      });
    }
  },


  getSubjectById: async (req, res) => {
    try {
      const { subject_id } = req.params;

      const subject = await Subject.findByPk(subject_id, {
        include: [
          {
            model: Assignment,
            as: "subject_assignments",
            where: { is_active: true },
            required: false,
            include: [
              {
                model: Teacher,
                as: 'assignment_teacher',
                attributes: ['teacher_id', 'teacher_code'],
                include: [
                  {
                    model: User,
                    as: 'user_account',
                    attributes: ['fullname', 'email']
                  }
                ]
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
              },
              {
                model: Term,
                as: 'assignment_term',
                attributes: ['term_id', 'term_name', 'academic_year']
              }
            ]
          },
          {
            model: Score,
            as: "subject_scores",
            required: false,
            limit: 10,
            order: [['created_at', 'DESC']],
            include: [
              {
                model: Student,
                as: 'score_student',
                attributes: ['student_id', 'fullname', 'admission_number']
              }
            ]
          }
        ],
      });

      if (!subject) {
        return res.status(404).json({
          success: false,
          message: "Subject not found"
        });
      }

      res.json({
        success: true,
        data: subject
      });
    } catch (error) {
      console.error("[getSubjectById] Error fetching subject:", error);
      res.status(500).json({ 
        success: false,
        message: "Server error", 
        error: error.message 
      });
    }
  },


  updateSubject: async (req, res) => {
    const { subject_id } = req.params;
    const { subject_name, subject_code, subject_type, is_active } = req.body;

    let transaction;
    try {
      transaction = await sequelize.transaction();

      const subject = await Subject.findByPk(subject_id, { transaction });
      if (!subject) {
        await transaction.rollback();
        return res.status(404).json({
          success: false,
          message: "Subject not found"
        });
      }

      
      if (subject_name || subject_code) {
        const whereClause = {
          subject_id: { [Op.ne]: subject_id }
        };

        if (subject_name) whereClause.subject_name = subject_name;
        if (subject_code) whereClause.subject_code = subject_code;

        const existingSubject = await Subject.findOne({
          where: whereClause,
          transaction,
        });

        if (existingSubject) {
          await transaction.rollback();
          return res.status(400).json({
            success: false,
            message: "Subject name or code already exists"
          });
        }
      }

      await subject.update({
        subject_name: subject_name || subject.subject_name,
        subject_code: subject_code || subject.subject_code,
        subject_type: subject_type || subject.subject_type,
        is_active: is_active !== undefined ? is_active : subject.is_active
      }, { transaction });

      await transaction.commit();

      const updatedSubject = await Subject.findByPk(subject_id);
      
      res.json({
        success: true,
        message: "✅ Subject updated successfully",
        data: updatedSubject
      });

    } catch (error) {
      if (transaction && !transaction.finished) {
        await transaction.rollback();
      }
      console.error("Error updating subject:", error);
      res.status(500).json({ 
        success: false,
        message: error.message || "Server error" 
      });
    }
  },

  deleteSubject: async (req, res) => {
    const { subject_id } = req.params;

    let transaction;
    try {
      transaction = await sequelize.transaction();

      const subject = await Subject.findByPk(subject_id, { transaction });
      if (!subject) {
        await transaction.rollback();
        return res.status(404).json({ 
          success: false,
          message: "Subject not found" 
        });
      }

      
      const activeAssignments = await Assignment.count({
        where: { 
          subject_id,
          is_active: true 
        },
        transaction
      });

      if (activeAssignments > 0) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: "Cannot delete subject with active assignments. Remove assignments first.",
          activeAssignments
        });
      }

      const scoresCount = await Score.count({
        where: { 
          '$score_assignment.subject_id$': subject_id 
        },
        include: [
          {
            model: Assignment,
            as: 'score_assignment',
            attributes: []
          }
        ],
        transaction
      });

      if (scoresCount > 0) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: "Cannot delete subject with existing scores.",
          scoresCount
        });
      }

      await subject.update({ is_active: false }, { transaction });

      await transaction.commit();

      return res.json({ 
        success: true, 
        message: "✅ Subject deactivated successfully" 
      });
    } catch (error) {
      if (transaction && !transaction.finished) {
        await transaction.rollback();
      }
      console.error("Error deleting subject:", error);
      return res.status(500).json({ 
        success: false,
        message: error.message || "Server error" 
      });
    }
  },

  reactivateSubject: async (req, res) => {
    try {
      const { subject_id } = req.params;

      const subject = await Subject.findByPk(subject_id);
      if (!subject) {
        return res.status(404).json({ 
          success: false,
          message: "Subject not found" 
        });
      }

      await subject.update({ is_active: true });

      res.json({
        success: true,
        message: "✅ Subject reactivated successfully",
        data: subject
      });
    } catch (error) {
      console.error("Error reactivating subject:", error);
      res.status(500).json({ 
        success: false,
        message: error.message || "Server error" 
      });
    }
  },


  getSubjectStats: async (req, res) => {
    try {
      const { subject_id } = req.params;

      const subject = await Subject.findByPk(subject_id, {
        include: [
          {
            model: Assignment,
            as: "subject_assignments",
            attributes: [],
            required: false
          },
          {
            model: Score,
            as: "subject_scores",
            attributes: [],
            required: false
          }
        ],
        attributes: [
          'subject_id',
          'subject_name',
          'subject_code',
          'subject_type',
          'is_active',
          [
            sequelize.literal('COUNT(DISTINCT "subject_assignments"."assignment_id")'),
            'assignment_count'
          ],
          [
            sequelize.literal('COUNT(DISTINCT "subject_scores"."score_id")'),
            'score_count'
          ],
          [
            sequelize.literal('AVG("subject_scores"."score")'),
            'average_score'
          ]
        ],
        group: ['Subject.subject_id']
      });

      if (!subject) {
        return res.status(404).json({
          success: false,
          message: "Subject not found"
        });
      }

      res.json({
        success: true,
        data: subject
      });
    } catch (error) {
      console.error("Error fetching subject stats:", error);
      res.status(500).json({ 
        success: false,
        message: "Server error", 
        error: error.message 
      });
    }
  },


  getSubjectsByClassStream: async (req, res) => {
    try {
      const { class_id, stream_id } = req.params;
      const { term_id, academic_year } = req.query;

      const whereClause = { 
        class_id, 
        stream_id,
        is_active: true 
      };

      if (term_id) whereClause.term_id = term_id;
      if (academic_year) whereClause.academic_year = academic_year;

      const assignments = await Assignment.findAll({
        where: whereClause,
        include: [
          {
            model: Subject,
            as: "assignment_subject",
            attributes: ["subject_id", "subject_name", "subject_code", "subject_type"],
            where: { is_active: true }
          },
          {
            model: Teacher,
            as: "assignment_teacher",
            attributes: ["teacher_id", "teacher_code"],
            include: [
              {
                model: User,
                as: "user_account",
                attributes: ["fullname"]
              }
            ]
          },
          {
            model: Term,
            as: "assignment_term",
            attributes: ["term_id", "term_name", "academic_year"]
          }
        ],
        order: [[{ model: Subject, as: 'assignment_subject' }, 'subject_name', 'ASC']]
      });


      const subjectsMap = new Map();
      
      assignments.forEach(assignment => {
        const subject = assignment.assignment_subject;
        if (!subjectsMap.has(subject.subject_id)) {
          subjectsMap.set(subject.subject_id, {
            ...subject.toJSON(),
            teachers: []
          });
        }
        
        const subjectData = subjectsMap.get(subject.subject_id);
        subjectData.teachers.push({
          teacher_id: assignment.assignment_teacher.teacher_id,
          teacher_code: assignment.assignment_teacher.teacher_code,
          fullname: assignment.assignment_teacher.user_account.fullname,
          term: assignment.assignment_term.term_name,
          academic_year: assignment.assignment_term.academic_year
        });
      });

      const subjects = Array.from(subjectsMap.values());

      res.json({
        success: true,
        data: subjects,
        count: subjects.length
      });
    } catch (error) {
      console.error("Error fetching subjects by class/stream:", error);
      res.status(500).json({ 
        success: false,
        message: "Server error", 
        error: error.message 
      });
    }
  },

  getAvailableSubjectsForAssignment: async (req, res) => {
    try {
      const { class_id, stream_id, term_id, academic_year } = req.query;

      if (!class_id || !stream_id || !term_id || !academic_year) {
        return res.status(400).json({
          success: false,
          message: "Class ID, Stream ID, Term ID, and Academic Year are required"
        });
      }

      const allSubjects = await Subject.findAll({
        where: { is_active: true },
        attributes: ['subject_id', 'subject_name', 'subject_code', 'subject_type']
      });

      
      const assignedSubjects = await Assignment.findAll({
        where: { 
          class_id, 
          stream_id, 
          term_id, 
          academic_year,
          is_active: true 
        },
        attributes: ['subject_id']
      });

      const assignedSubjectIds = assignedSubjects.map(a => a.subject_id);

    
      const availableSubjects = allSubjects.filter(
        subject => !assignedSubjectIds.includes(subject.subject_id)
      );

      res.json({
        success: true,
        data: availableSubjects,
        count: availableSubjects.length
      });
    } catch (error) {
      console.error("Error fetching available subjects:", error);
      res.status(500).json({ 
        success: false,
        message: "Server error", 
        error: error.message 
      });
    }
  }
};

module.exports = subjectController;
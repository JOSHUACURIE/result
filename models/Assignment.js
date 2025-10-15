const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/db");

const Assignment = sequelize.define(
  "Assignment",
  {
    assignment_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    teacher_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "teachers",
        key: "teacher_id",
      },
    },
    subject_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "subjects",
        key: "subject_id",
      },
    },
    class_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "classes",
        key: "class_id",
      },
    },
    stream_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "streams",
        key: "stream_id",
      },
    },
    academic_year: {
      type: DataTypes.STRING(10),
      allowNull: false,
    },
    term_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "terms",
        key: "term_id",
      },
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    assigned_date: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    }
  },
  {
    tableName: "assignments",
    timestamps: true,
    underscored: true,
    indexes: [
      // Unique constraint to prevent duplicate assignments
      {
        unique: true,
        fields: ['teacher_id', 'subject_id', 'class_id', 'stream_id', 'academic_year', 'term_id']
      },
      // Indexes for common queries
      {
        fields: ['teacher_id', 'academic_year', 'term_id']
      },
      {
        fields: ['class_id', 'stream_id', 'academic_year']
      }
    ]
  }
);

// 🔹 Static Methods for Assignment Management
Assignment.createAssignment = async function (assignmentData) {
  // Check if assignment already exists
  const existingAssignment = await Assignment.findOne({
    where: {
      teacher_id: assignmentData.teacher_id,
      subject_id: assignmentData.subject_id,
      class_id: assignmentData.class_id,
      stream_id: assignmentData.stream_id,
      academic_year: assignmentData.academic_year,
      term_id: assignmentData.term_id
    }
  });

  if (existingAssignment) {
    throw new Error('Assignment already exists for this teacher, subject, class, stream, year, and term');
  }

  return await Assignment.create(assignmentData);
};

Assignment.getTeacherAssignments = async function (teacherId, academicYear = null, termId = null) {
  const { Teacher, Subject, Class, Stream, Term } = require("./index");
  
  const whereClause = { 
    teacher_id: teacherId,
    is_active: true 
  };
  
  if (academicYear) whereClause.academic_year = academicYear;
  if (termId) whereClause.term_id = termId;
  
  return await Assignment.findAll({
    where: whereClause,
    include: [
      { 
        model: Subject,
        attributes: ['subject_id', 'subject_code', 'subject_name', 'subject_type']
      },
      { 
        model: Class,
        attributes: ['class_id', 'class_name']
      },
      { 
        model: Stream,
        attributes: ['stream_id', 'stream_name']
      },
      { 
        model: Term,
        attributes: ['term_id', 'term_name']
      },
      {
        model: Teacher,
        attributes: ['teacher_id', 'teacher_code'],
        include: [
          {
            model: require('./User'),
            as: 'user_account',
            attributes: ['fullname']  // Updated from full_name to fullname
          }
        ]
      }
    ],
    order: [
      [Class, 'class_name', 'ASC'],
      [Stream, 'stream_name', 'ASC'],
      [Subject, 'subject_name', 'ASC']
    ]
  });
};

Assignment.getClassAssignments = async function (classId, streamId, academicYear, termId) {
  const { Teacher, Subject, Class, Stream, Term } = require("./index");
  
  return await Assignment.findAll({
    where: { 
      class_id: classId,
      stream_id: streamId,
      academic_year: academicYear,
      term_id: termId,
      is_active: true 
    },
    include: [
      { 
        model: Subject,
        attributes: ['subject_id', 'subject_code', 'subject_name']
      },
      { 
        model: Teacher,
        attributes: ['teacher_id', 'teacher_code'],
        include: [
          {
            model: require('./User'),
            as: 'user_account',
            attributes: ['fullname']  // Updated from full_name to fullname
          }
        ]
      }
    ],
    order: [
      [Subject, 'subject_name', 'ASC']
    ]
  });
};

Assignment.getAssignmentWithDetails = async function (assignmentId) {
  const { Teacher, Subject, Class, Stream, Term } = require("./index");
  
  return await Assignment.findByPk(assignmentId, {
    include: [
      { 
        model: Subject,
        attributes: ['subject_id', 'subject_code', 'subject_name', 'subject_type']
      },
      { 
        model: Class,
        attributes: ['class_id', 'class_name']
      },
      { 
        model: Stream,
        attributes: ['stream_id', 'stream_name']
      },
      { 
        model: Term,
        attributes: ['term_id', 'term_name']
      },
      {
        model: Teacher,
        attributes: ['teacher_id', 'teacher_code'],
        include: [
          {
            model: require('./User'),
            as: 'user_account',
            attributes: ['fullname', 'email']  // Updated from full_name to fullname
          }
        ]
      }
    ]
  });
};

// Check if teacher is assigned to a specific subject/class/stream
Assignment.isTeacherAssigned = async function (teacherId, subjectId, classId, streamId, academicYear, termId) {
  const assignment = await Assignment.findOne({
    where: {
      teacher_id: teacherId,
      subject_id: subjectId,
      class_id: classId,
      stream_id: streamId,
      academic_year: academicYear,
      term_id: termId,
      is_active: true
    }
  });
  
  return !!assignment;
};

// Empty associations - will be handled in models/index.js
Assignment.setupAssociations = () => {
  console.log('Assignment associations are managed in models/index.js');
};

module.exports = Assignment;
const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/db");

const Comment = sequelize.define(
  "Comment",
  {
    comment_id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    student_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "students", // Reference table name
        key: "student_id",
      },
      onDelete: "CASCADE",
    },
    teacher_id: {  // Changed from user_id to teacher_id
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "teachers", // Reference teachers table
        key: "teacher_id",
      },
    },
    term_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "terms", // Reference table name
        key: "term_id",
      },
      onDelete: "CASCADE",
    },
    comment_text: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    comment_type: {  // Added new field for categorization
      type: DataTypes.ENUM('academic', 'behavioral', 'general', 'recommendation'),
      allowNull: false,
      defaultValue: 'general'
    },
    is_visible_to_parent: {  // Added new field
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    }
  },
  {
    tableName: "comments",
    timestamps: true,
    underscored: true,
    indexes: [
      // Index for common queries
      {
        fields: ['student_id', 'term_id']
      },
      {
        fields: ['teacher_id']
      },
      {
        fields: ['comment_type']
      }
    ]
  }
);

// REMOVED ASSOCIATIONS - They will be handled in models/index.js
// Comment.belongsTo(Student, { foreignKey: "student_id", as: "student" });
// Student.hasMany(Comment, { foreignKey: "student_id", as: "comments" });
// Comment.belongsTo(User, { foreignKey: "user_id", as: "user" });
// User.hasMany(Comment, { foreignKey: "user_id", as: "comments" });
// Comment.belongsTo(Term, { foreignKey: "term_id", as: "term" });
// Term.hasMany(Comment, { foreignKey: "term_id", as: "comments" });

// 🔹 Static Methods for Comment Management
Comment.createComment = async function (commentData) {
  return await Comment.create(commentData);
};

Comment.getStudentComments = async function (studentId, termId = null) {
  const { Student, Teacher, Term } = require("./index");
  
  const whereClause = { student_id: studentId };
  if (termId) whereClause.term_id = termId;
  
  return await Comment.findAll({
    where: whereClause,
    include: [
      {
        model: Teacher,
        attributes: ['teacher_id', 'teacher_code'],
        include: [
          {
            model: require('./User'),
            as: 'user_account',
            attributes: ['fullname']
          }
        ]
      },
      {
        model: Term,
        attributes: ['term_id', 'term_name', 'academic_year']
      }
    ],
    order: [['created_at', 'DESC']]
  });
};

Comment.getTeacherComments = async function (teacherId, termId = null) {
  const { Student, Term } = require("./index");
  
  const whereClause = { teacher_id: teacherId };
  if (termId) whereClause.term_id = termId;
  
  return await Comment.findAll({
    where: whereClause,
    include: [
      {
        model: Student,
        attributes: ['student_id', 'admission_number', 'fullname']
      },
      {
        model: Term,
        attributes: ['term_id', 'term_name', 'academic_year']
      }
    ],
    order: [
      [Student, 'fullname', 'ASC'],
      ['created_at', 'DESC']
    ]
  });
};

Comment.getClassComments = async function (classId, termId) {
  const { Student, Teacher } = require("./index");
  
  return await Comment.findAll({
    include: [
      {
        model: Student,
        where: { class_id: classId },
        attributes: ['student_id', 'admission_number', 'fullname']
      },
      {
        model: Teacher,
        attributes: ['teacher_id', 'teacher_code'],
        include: [
          {
            model: require('./User'),
            as: 'user_account',
            attributes: ['fullname']
          }
        ]
      }
    ],
    where: { term_id: termId },
    order: [
      [Student, 'fullname', 'ASC'],
      ['created_at', 'DESC']
    ]
  });
};

// Empty associations - will be handled in models/index.js
Comment.setupAssociations = () => {
  console.log('Comment associations are managed in models/index.js');
};

module.exports = Comment;
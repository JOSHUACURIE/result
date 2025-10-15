const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/db");

const Score = sequelize.define(
  "Score",
  {
    score_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    score: {  
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
      validate: { min: 0, max: 100 },
    },
    // Removed "grade" field - will be calculated by grading util
    // Removed "teacher_id" - now captured through assignment_id + submitted_by
    assignment_id: {
      type: DataTypes.INTEGER,
      allowNull: false,  // Changed to NOT NULL
      references: {
        model: "assignments",
        key: "assignment_id",
      },
    },
    student_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "students", 
        key: "student_id",
      },
    },
    term_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "terms",
        key: "term_id",
      },
    },
    submitted_by: {  // Added new field - which teacher submitted the score
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "teachers",
        key: "teacher_id",
      },
    },
    // Removed class_id and stream_id - these are already in assignment
  },
  {
    tableName: "scores",
    timestamps: true,
    underscored: true,
    indexes: [
      // Unique constraint to prevent duplicate scores
      {
        unique: true,
        fields: ['assignment_id', 'student_id', 'term_id']
      },
      // Index for common queries
      {
        fields: ['student_id', 'term_id']
      },
      {
        fields: ['assignment_id']
      }
    ]
  }
);

// 🔹 Static Methods for Score Management
Score.submitScores = async function (scoresData, teacherId) {
  const transaction = await sequelize.transaction();
  
  try {
    const scores = [];
    
    for (const scoreData of scoresData) {
      // Verify the assignment belongs to the teacher
      const assignment = await require('./Assignment').findOne({
        where: {
          assignment_id: scoreData.assignment_id,
          teacher_id: teacherId,
          is_active: true
        }
      });
      
      if (!assignment) {
        throw new Error(`Unauthorized: Teacher is not assigned to this subject/class`);
      }
      
      // Create or update score
      const [score, created] = await Score.findOrCreate({
        where: {
          assignment_id: scoreData.assignment_id,
          student_id: scoreData.student_id,
          term_id: scoreData.term_id
        },
        defaults: {
          ...scoreData,
          submitted_by: teacherId
        },
        transaction
      });
      
      if (!created) {
        // Update existing score
        await score.update({
          score: scoreData.score,
          submitted_by: teacherId,
          updated_at: new Date()
        }, { transaction });
      }
      
      scores.push(score);
    }
    
    await transaction.commit();
    return scores;
    
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};

// Get scores for a specific assignment (teacher's view)
Score.getScoresByAssignment = async function (assignmentId, teacherId = null) {
  const { Student, Assignment } = require("./index");
  
  const whereClause = { assignment_id: assignmentId };
  
  // If teacherId provided, verify ownership
  if (teacherId) {
    const assignment = await Assignment.findOne({
      where: { assignment_id: assignmentId, teacher_id: teacherId }
    });
    
    if (!assignment) {
      throw new Error('Unauthorized: Teacher does not have access to this assignment');
    }
  }
  
  return await Score.findAll({
    where: whereClause,
    include: [
      {
        model: Student,
        attributes: ['student_id', 'admission_number', 'fullname']
      },
      {
        model: Assignment,
        attributes: ['assignment_id'],
        include: [
          {
            model: require('../models/Subject'),
            attributes: ['subject_id', 'subject_name']
          },
          {
            model: require('../models/Class'), 
            attributes: ['class_id', 'class_name']
          },
          {
            model: require('../models/Stream'),
            attributes: ['stream_id', 'stream_name']
          }
        ]
      }
    ],
    order: [[Student, 'fullname', 'ASC']]
  });
};

// Empty associations - will be handled in models/index.js
Score.setupAssociations = () => {
  console.log('Score associations are managed in models/index.js');
};

module.exports = Score;
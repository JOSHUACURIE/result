const { sequelize } = require("../config/db");

// Import models
const User = require("./User");
const Teacher = require("./Teacher");
const Subject = require("./Subject");
const Class = require("./Class");
const Stream = require("./Stream");
const Assignment = require("./Assignment"); // Renamed from TeacherSubject
const Student = require("./Student");
const Score = require("./Score");
const Term = require("./Term");
// Removed StudentSubject - not needed since all students take all subjects

// =========================
// 1. USER - TEACHER RELATIONSHIP (One-to-One)
// =========================
User.hasOne(Teacher, { 
  foreignKey: "user_id", 
  as: "teacher_profile",
  onDelete: 'CASCADE'
});
Teacher.belongsTo(User, { 
  foreignKey: "user_id", 
  as: "user_account" 
});

// =========================
// 2. STUDENT RELATIONSHIPS
// =========================
// Student -> Class
Class.hasMany(Student, { 
  foreignKey: "class_id", 
  as: "class_students" 
});
Student.belongsTo(Class, { 
  foreignKey: "class_id", 
  as: "student_class" 
});

// Student -> Stream  
Stream.hasMany(Student, { 
  foreignKey: "stream_id", 
  as: "stream_students" 
});
Student.belongsTo(Stream, { 
  foreignKey: "stream_id", 
  as: "student_stream" 
});

// Student -> Teacher (Class Teacher)
Teacher.hasMany(Student, {
  foreignKey: "class_teacher_id",
  as: "teacher_students"
});
Student.belongsTo(Teacher, {
  foreignKey: "class_teacher_id", 
  as: "class_teacher"
});

// =========================
// 3. ASSIGNMENT RELATIONSHIPS (Core: Teacher + Subject + Class + Stream)
// =========================
// Assignment -> Teacher
Teacher.hasMany(Assignment, {
  foreignKey: "teacher_id",
  as: "teacher_assignments"
});
Assignment.belongsTo(Teacher, {
  foreignKey: "teacher_id",
  as: "assignment_teacher"
});

// Assignment -> Subject
Subject.hasMany(Assignment, {
  foreignKey: "subject_id",
  as: "subject_assignments"
});
Assignment.belongsTo(Subject, {
  foreignKey: "subject_id",
  as: "assignment_subject"
});

// Assignment -> Class
Class.hasMany(Assignment, {
  foreignKey: "class_id",
  as: "class_assignments"
});
Assignment.belongsTo(Class, {
  foreignKey: "class_id",
  as: "assignment_class"
});

// Assignment -> Stream
Stream.hasMany(Assignment, {
  foreignKey: "stream_id",
  as: "stream_assignments"
});
Assignment.belongsTo(Stream, {
  foreignKey: "stream_id",
  as: "assignment_stream"
});

// Assignment -> Term
Term.hasMany(Assignment, {
  foreignKey: "term_id",
  as: "term_assignments"
});
Assignment.belongsTo(Term, {
  foreignKey: "term_id",
  as: "assignment_term"
});

// =========================
// 4. SCORE RELATIONSHIPS (Simplified)
// =========================
// Score -> Assignment (Core relationship)
Assignment.hasMany(Score, {
  foreignKey: "assignment_id",
  as: "assignment_scores"
});
Score.belongsTo(Assignment, {
  foreignKey: "assignment_id",
  as: "score_assignment"
});

// Score -> Student
Student.hasMany(Score, {
  foreignKey: "student_id",
  as: "student_scores"
});
Score.belongsTo(Student, {
  foreignKey: "student_id",
  as: "score_student"
});

// Score -> Term
Term.hasMany(Score, {
  foreignKey: "term_id",
  as: "term_scores"
});
Score.belongsTo(Term, {
  foreignKey: "term_id",
  as: "score_term"
});

// Score -> Teacher (Who submitted the score)
Teacher.hasMany(Score, {
  foreignKey: "submitted_by",
  as: "submitted_scores"
});
Score.belongsTo(Teacher, {
  foreignKey: "submitted_by",
  as: "score_submitter"
});

// =========================
// 5. MANY-TO-MANY THROUGH ASSIGNMENTS
// =========================
// Teacher <-> Subject (through Assignments)
Teacher.belongsToMany(Subject, {
  through: Assignment,
  foreignKey: "teacher_id",
  otherKey: "subject_id",
  as: "teacher_subjects",
});

Subject.belongsToMany(Teacher, {
  through: Assignment,
  foreignKey: "subject_id",
  otherKey: "teacher_id",
  as: "subject_teachers",
});

// Teacher <-> Class (through Assignments)
Teacher.belongsToMany(Class, {
  through: Assignment,
  foreignKey: "teacher_id",
  otherKey: "class_id",
  as: "teacher_classes",
});

Class.belongsToMany(Teacher, {
  through: Assignment,
  foreignKey: "class_id",
  otherKey: "teacher_id",
  as: "class_teachers",
});

// Teacher <-> Stream (through Assignments)
Teacher.belongsToMany(Stream, {
  through: Assignment,
  foreignKey: "teacher_id",
  otherKey: "stream_id",
  as: "teacher_streams",
});

Stream.belongsToMany(Teacher, {
  through: Assignment,
  foreignKey: "stream_id",
  otherKey: "teacher_id",
  as: "stream_teachers",
});

// =========================
// REMOVED: StudentSubject relationships
// Reason: All students take all subjects in their class/stream
// =========================

const syncDatabase = async (options = {}) => {
  try {
    const env = process.env.NODE_ENV || 'development';
    
    const defaultOptions = {
      alter: env === 'development', 
      force: false, 
      logging: env === 'development' ? console.log : false
    };

    const syncOptions = { ...defaultOptions, ...options };

    console.log(`🔄 Syncing database (${env} environment)...`);
    
    if (syncOptions.force) {
      console.warn('⚠️  FORCE SYNC: This will drop all tables and recreate them!');
      console.warn('⚠️  ALL DATA WILL BE LOST!');
    } else if (syncOptions.alter) {
      console.log('🔧 Using ALTER sync: Tables will be updated without data loss');
    } else {
      console.log('🔒 Using safe sync: Only new tables will be created');
    }

    await sequelize.sync(syncOptions);
    
    console.log('✅ Database models synchronized successfully');
    console.log('📊 Available models:', Object.keys(sequelize.models).join(', '));
    
    return true;
  } catch (error) {
    console.error('❌ Database synchronization failed:', error.message);
    console.error('Error details:', error);
    throw error;
  }
};

// Call setupAssociations method if it exists (for models that have it)
const setupModelAssociations = () => {
  const models = [Teacher, Assignment, Stream, Score];
  models.forEach(model => {
    if (typeof model.setupAssociations === 'function') {
      model.setupAssociations();
    }
  });
};

// Initialize associations
setupModelAssociations();

module.exports = {
  sequelize,
  User,
  Teacher,
  Subject,
  Class,
  Stream,
  Student,
  Score,
  Assignment, // Renamed from TeacherSubject
  Term,
  syncDatabase,
};
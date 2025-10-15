const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Student = sequelize.define(
  'Student',
  {
    student_id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    admission_number: {  
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
    },
    fullname: {  // Combined first_name and last_name into fullname
      type: DataTypes.STRING(200),
      allowNull: false,
    },
    date_of_birth: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    gender: {  // Changed to ENUM for consistency
      type: DataTypes.ENUM('male', 'female', 'other'),
      allowNull: true,
    },
    class_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'classes',
        key: 'class_id',
      },
      onDelete: 'CASCADE',
    },
    stream_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'streams',
        key: 'stream_id',
      },
      onDelete: 'CASCADE',
    },
    class_teacher_id: {  // Added new field - references Teachers table
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'teachers',
        key: 'teacher_id',
      },
    },
    guardian_phone: {  // Changed from parent_phone to guardian_phone
      type: DataTypes.STRING(20),
      allowNull: true,
    },
    is_active: {  // Added new field
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    }
  },
  {
    tableName: 'students',
    timestamps: true,
    underscored: true,  // Use this instead of individual createdAt/updatedAt
  }
);

module.exports = Student;
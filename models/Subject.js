const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/db");


const Subject = sequelize.define(
  "Subject",
  {
    subject_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    subject_name: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    subject_code: {
      type: DataTypes.STRING(20),
      allowNull: false,
      unique: true,
    },
    subject_type: { 
      type: DataTypes.ENUM('core', 'elective'),
      allowNull: false,
      defaultValue: 'core',
    },
    is_active: { 
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    }

  },
  {
    tableName: "subjects",
    timestamps: true,
    underscored: true,
  }
);


Subject.getAllActiveSubjects = async function () {
  return await Subject.findAll({
    where: { is_active: true },
    order: [['subject_name', 'ASC']]
  });
};

Subject.getSubjectsByType = async function (type) {
  return await Subject.findAll({
    where: { 
      subject_type: type,
      is_active: true 
    },
    order: [['subject_name', 'ASC']]
  });
};

Subject.getSubjectWithAssignments = async function (subjectId) {
  const { Assignment, Teacher, Class, Stream } = require("./index");
  
  return await Subject.findByPk(subjectId, {
    include: [
      {
        model: Assignment,
        attributes: ['assignment_id', 'academic_year'],
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
            model: Class,
            attributes: ['class_id', 'class_name']
          },
          {
            model: Stream,
            attributes: ['stream_id', 'stream_name']
          }
        ]
      }
    ]
  });
};


Subject.setupAssociations = () => {
  console.log('Subject associations are managed in models/index.js');
};

module.exports = Subject;
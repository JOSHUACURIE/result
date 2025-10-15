const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/db");
const User=require('./User')
const Teacher = sequelize.define(
  "Teacher",
  {
    teacher_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      unique: true,  
      references: { model: "users", key: "user_id" },
    },
    teacher_code: {  
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
    },
    phone_number: {
      type: DataTypes.STRING(20),  
      allowNull: true,
    },
    specialization: {  
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    employment_date: {  
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    is_active: { 
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    }
  },
  {
    tableName: "teachers",
    timestamps: true,
    underscored: true,
  }
);


Teacher.createTeacherWithUser = async function (teacherData) {
  const transaction = await sequelize.transaction();
  
  try {
   
    const user = await User.create({
      fullname: teacherData.fullname, 
      email: teacherData.email,
      password_hash: teacherData.password,  
      role: 'teacher'  
    }, { transaction });

   
    const teacher = await Teacher.create({
      user_id: user.user_id,
      teacher_code: teacherData.teacher_code,  
      phone_number: teacherData.phone_number,
    }, { transaction });

    await transaction.commit();
    
    
    return {
      teacher: teacher.toJSON(),
      user: {
        user_id: user.user_id,
        email: user.email,
        role: user.role  
      }
    };
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};

Teacher.getAllTeachersWithUser = async function () {
  return await Teacher.findAll({
    include: [
      { 
        model: User, 
        as: 'user_account',
        attributes: ['fullname', 'email', 'role', 'created_at']  
      }
    ],
    order: [['created_at', 'DESC']]
  });
};

Teacher.getTeacherWithDetails = async function (teacherId) {
  return await Teacher.findByPk(teacherId, {
    include: [
      { 
        model: User, 
        as: 'user_account',
        attributes: ['fullname', 'email', 'role', 'created_at']  
      }
     
    ]
  });
};

module.exports = Teacher;
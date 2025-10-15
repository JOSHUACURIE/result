const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/db");

const Class = sequelize.define(
  "Class",
  {
    class_id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    class_name: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
    },
    class_level: {  // Added new field
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    is_active: {  // Added new field
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    }
  },
  {
    tableName: "classes",
    timestamps: true,  // Changed to true to track creation/updates
    underscored: true,
  }
);

module.exports = Class;
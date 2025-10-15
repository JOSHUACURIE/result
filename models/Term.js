const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/db");

const Term = sequelize.define(
  "Term",
  {
    term_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    term_name: {  // Changed from "name" to "term_name"
      type: DataTypes.STRING(50),
      allowNull: false,
      validate: {
        isIn: [["Term 1", "Term 2", "Term 3"]],
      },
    },
    term_number: {  // Added new field for sorting
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        isInt: true,
        min: 1,
        max: 3
      },
    },
    academic_year: {  // Changed from "year" to "academic_year" and made string
      type: DataTypes.STRING(10),
      allowNull: false,
    },
    start_date: {
      type: DataTypes.DATEONLY,  // Changed to DATEONLY for just the date
      allowNull: false,
    },
    end_date: {
      type: DataTypes.DATEONLY,  // Changed to DATEONLY for just the date
      allowNull: false,
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,  // Changed to true by default
    },
  },
  {
    tableName: "terms",
    timestamps: true,
    underscored: true,
    indexes: [
      // Unique constraint for term per academic year
      {
        unique: true,
        fields: ['term_number', 'academic_year']
      },
      // Index for active terms
      {
        fields: ['is_active']
      }
    ]
  }
);

// 🔹 Static Methods for Term Management
Term.getCurrentTerm = async function () {
  return await Term.findOne({
    where: { is_active: true },
    order: [['academic_year', 'DESC'], ['term_number', 'DESC']]
  });
};

Term.getTermsByAcademicYear = async function (academicYear) {
  return await Term.findAll({
    where: { academic_year: academicYear },
    order: [['term_number', 'ASC']]
  });
};

Term.createTerm = async function (termData) {
  // Check if term already exists for this academic year
  const existingTerm = await Term.findOne({
    where: {
      term_number: termData.term_number,
      academic_year: termData.academic_year
    }
  });

  if (existingTerm) {
    throw new Error(`Term ${termData.term_number} already exists for academic year ${termData.academic_year}`);
  }

  return await Term.create(termData);
};

// Activate a term and deactivate others (only one active term at a time)
Term.activateTerm = async function (termId) {
  const transaction = await sequelize.transaction();
  
  try {
    // Deactivate all terms
    await Term.update(
      { is_active: false },
      { where: {}, transaction }
    );
    
    // Activate the specified term
    const term = await Term.findByPk(termId, { transaction });
    if (!term) {
      throw new Error('Term not found');
    }
    
    await term.update({ is_active: true }, { transaction });
    await transaction.commit();
    
    return term;
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};

module.exports = Term;
const Term = require("../models/Term");
const Assignment = require("../models/Assignment");
const Score = require("../models/Score");
const { sequelize } = require("../models");

// Create a new term
exports.createTerm = async (req, res) => {
  try {
    const { term_name, term_number, academic_year, start_date, end_date } = req.body;

    // Validate required fields
    if (!term_name || !term_number || !academic_year || !start_date || !end_date) {
      return res.status(400).json({ 
        success: false,
        message: "Term name, term number, academic year, start date, and end date are required" 
      });
    }

    // Validate term number range
    if (term_number < 1 || term_number > 3) {
      return res.status(400).json({ 
        success: false,
        message: "Term number must be between 1 and 3" 
      });
    }

    // Check if term already exists for this academic year
    const existingTerm = await Term.findOne({ 
      where: { 
        term_number, 
        academic_year 
      } 
    });
    
    if (existingTerm) {
      return res.status(400).json({ 
        success: false,
        message: `Term ${term_number} already exists for academic year ${academic_year}` 
      });
    }

    const term = await Term.createTerm({
      term_name,
      term_number,
      academic_year,
      start_date,
      end_date,
    });

    res.status(201).json({
      success: true,
      message: "✅ Term created successfully",
      data: term,
    });
  } catch (error) {
    console.error("Error creating term:", error);
    res.status(500).json({ 
      success: false,
      message: "Server error while creating term",
      error: error.message 
    });
  }
};

// Get all terms
exports.getTerms = async (req, res) => {
  try {
    const { academic_year, is_active, include_inactive = false } = req.query;
    
    const whereClause = {};
    if (academic_year) whereClause.academic_year = academic_year;
    if (!include_inactive) whereClause.is_active = true;
    if (is_active !== undefined) whereClause.is_active = is_active === 'true';

    const terms = await Term.findAll({
      where: whereClause,
      order: [
        ["academic_year", "DESC"], 
        ["term_number", "ASC"]
      ],
    });

    res.json({
      success: true,
      data: terms,
      count: terms.length
    });
  } catch (error) {
    console.error("Error fetching terms:", error);
    res.status(500).json({ 
      success: false,
      message: "Server error while fetching terms",
      error: error.message 
    });
  }
};

// Get term by ID
exports.getTermById = async (req, res) => {
  try {
    const term = await Term.findByPk(req.params.id, {
      include: [
        {
          model: Assignment,
          as: "term_assignments",
          attributes: ['assignment_id'],
          where: { is_active: true },
          required: false,
          include: [
            {
              model: require('./Subject'),
              as: 'assignment_subject',
              attributes: ['subject_name']
            },
            {
              model: require('./Teacher'),
              as: 'assignment_teacher',
              attributes: ['teacher_code'],
              include: [
                {
                  model: require('./User'),
                  as: 'user_account',
                  attributes: ['fullname']
                }
              ]
            }
          ]
        },
        {
          model: Score,
          as: "term_scores",
          attributes: ['score_id'],
          required: false,
          limit: 10 // Limit for performance
        }
      ]
    });
    
    if (!term) {
      return res.status(404).json({ 
        success: false,
        message: "Term not found" 
      });
    }
    
    res.json({
      success: true,
      data: term
    });
  } catch (error) {
    console.error("Error fetching term:", error);
    res.status(500).json({ 
      success: false,
      message: "Server error while fetching term",
      error: error.message 
    });
  }
};

// Update term
exports.updateTerm = async (req, res) => {
  try {
    const { term_name, term_number, academic_year, start_date, end_date, is_active } = req.body;
    
    const term = await Term.findByPk(req.params.id);
    if (!term) {
      return res.status(404).json({ 
        success: false,
        message: "Term not found" 
      });
    }

    // Validate term number if provided
    if (term_number && (term_number < 1 || term_number > 3)) {
      return res.status(400).json({ 
        success: false,
        message: "Term number must be between 1 and 3" 
      });
    }

    // Check for duplicate term number in same academic year if changing
    if ((term_number && term_number !== term.term_number) || 
        (academic_year && academic_year !== term.academic_year)) {
      
      const finalTermNumber = term_number || term.term_number;
      const finalAcademicYear = academic_year || term.academic_year;

      const existingTerm = await Term.findOne({ 
        where: { 
          term_number: finalTermNumber, 
          academic_year: finalAcademicYear,
          term_id: { [sequelize.Sequelize.Op.ne]: term.term_id }
        } 
      });

      if (existingTerm) {
        return res.status(400).json({ 
          success: false,
          message: `Term ${finalTermNumber} already exists for academic year ${finalAcademicYear}` 
        });
      }
    }

    await term.update({
      term_name: term_name || term.term_name,
      term_number: term_number || term.term_number,
      academic_year: academic_year || term.academic_year,
      start_date: start_date || term.start_date,
      end_date: end_date || term.end_date,
      is_active: is_active !== undefined ? is_active : term.is_active
    });

    res.json({
      success: true,
      message: "✅ Term updated successfully",
      data: term
    });
  } catch (error) {
    console.error("Error updating term:", error);
    res.status(500).json({ 
      success: false,
      message: "Server error while updating term",
      error: error.message 
    });
  }
};

// Delete term (soft delete)
exports.deleteTerm = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const term = await Term.findByPk(req.params.id, { transaction });
    if (!term) {
      await transaction.rollback();
      return res.status(404).json({ 
        success: false,
        message: "Term not found" 
      });
    }

    // Check if term has active assignments
    const activeAssignments = await Assignment.count({
      where: { 
        term_id: term.term_id,
        is_active: true 
      },
      transaction
    });

    if (activeAssignments > 0) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: "Cannot delete term with active assignments. Remove assignments first.",
        active_assignments: activeAssignments
      });
    }

    // Check if term has scores
    const scoresCount = await Score.count({
      where: { 
        term_id: term.term_id 
      },
      transaction
    });

    if (scoresCount > 0) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: "Cannot delete term with existing scores.",
        scores_count: scoresCount
      });
    }

    // Soft delete by setting is_active to false
    await term.update({ is_active: false }, { transaction });

    await transaction.commit();

    res.json({ 
      success: true, 
      message: "✅ Term deactivated successfully" 
    });
  } catch (error) {
    await transaction.rollback();
    console.error("Error deleting term:", error);
    res.status(500).json({ 
      success: false,
      message: "Server error while deleting term",
      error: error.message 
    });
  }
};

// Activate term (deactivate others in same academic year)
exports.activateTerm = async (req, res) => {
  try {
    const term = await Term.findByPk(req.params.id);
    if (!term) {
      return res.status(404).json({ 
        success: false,
        message: "Term not found" 
      });
    }

    // Use the model's static method to activate term
    const activatedTerm = await Term.activateTerm(req.params.id);

    res.json({
      success: true,
      message: `✅ Activated ${activatedTerm.term_name} for ${activatedTerm.academic_year}`,
      data: activatedTerm
    });
  } catch (error) {
    console.error("Error activating term:", error);
    res.status(500).json({ 
      success: false,
      message: "Server error while activating term",
      error: error.message 
    });
  }
};

// Reactivate term
exports.reactivateTerm = async (req, res) => {
  try {
    const term = await Term.findByPk(req.params.id);
    if (!term) {
      return res.status(404).json({ 
        success: false,
        message: "Term not found" 
      });
    }

    await term.update({ is_active: true });

    res.json({
      success: true,
      message: "✅ Term reactivated successfully",
      data: term
    });
  } catch (error) {
    console.error("Error reactivating term:", error);
    res.status(500).json({ 
      success: false,
      message: "Server error while reactivating term",
      error: error.message 
    });
  }
};

// Get current active term
exports.getCurrentTerm = async (req, res) => {
  try {
    const currentTerm = await Term.getCurrentTerm();
    
    if (!currentTerm) {
      return res.status(404).json({ 
        success: false,
        message: "No active term found" 
      });
    }

    res.json({
      success: true,
      data: currentTerm
    });
  } catch (error) {
    console.error("Error fetching current term:", error);
    res.status(500).json({ 
      success: false,
      message: "Server error while fetching current term",
      error: error.message 
    });
  }
};

// Get terms by academic year
exports.getTermsByAcademicYear = async (req, res) => {
  try {
    const { academic_year } = req.params;

    const terms = await Term.getTermsByAcademicYear(academic_year);

    res.json({
      success: true,
      data: terms,
      count: terms.length
    });
  } catch (error) {
    console.error("Error fetching terms by academic year:", error);
    res.status(500).json({ 
      success: false,
      message: "Server error while fetching terms",
      error: error.message 
    });
  }
};

// Get term statistics
exports.getTermStats = async (req, res) => {
  try {
    const { id } = req.params;

    const term = await Term.findByPk(id, {
      include: [
        {
          model: Assignment,
          as: "term_assignments",
          attributes: [],
          required: false
        },
        {
          model: Score,
          as: "term_scores",
          attributes: [],
          required: false
        }
      ],
      attributes: [
        'term_id',
        'term_name',
        'term_number',
        'academic_year',
        'start_date',
        'end_date',
        'is_active',
        [
          sequelize.literal('COUNT(DISTINCT "term_assignments"."assignment_id")'),
          'assignment_count'
        ],
        [
          sequelize.literal('COUNT(DISTINCT "term_scores"."score_id")'),
          'score_count'
        ],
        [
          sequelize.literal('AVG("term_scores"."score")'),
          'average_score'
        ]
      ],
      group: ['Term.term_id']
    });

    if (!term) {
      return res.status(404).json({ 
        success: false,
        message: "Term not found" 
      });
    }

    res.json({
      success: true,
      data: term
    });
  } catch (error) {
    console.error("Error fetching term statistics:", error);
    res.status(500).json({ 
      success: false,
      message: "Server error while fetching term statistics",
      error: error.message 
    });
  }
};
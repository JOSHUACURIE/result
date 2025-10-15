const Comment = require("../models/Comment");
const Student = require("../models/Student");
const Teacher = require("../models/Teacher");
const Term = require("../models/Term");

// Create a new comment
const createComment = async (req, res) => {
  try {
    const { student_id, teacher_id, term_id, comment_text, comment_type, is_visible_to_parent } = req.body;

    // Validate required fields
    if (!student_id || !teacher_id || !term_id || !comment_text) {
      return res.status(400).json({ 
        success: false,
        message: "Student, teacher, term, and comment text are required" 
      });
    }

    const newComment = await Comment.createComment({
      student_id,
      teacher_id,
      term_id,
      comment_text,
      comment_type: comment_type || 'general',
      is_visible_to_parent: is_visible_to_parent || false
    });

    res.status(201).json({
      success: true,
      message: "✅ Comment created successfully",
      data: newComment,
    });
  } catch (error) {
    console.error("❌ Error creating comment:", error.message);
    res.status(500).json({ 
      success: false,
      message: "Server error while creating comment" 
    });
  }
};

// Get comments for a specific student
const getStudentComments = async (req, res) => {
  try {
    const { studentId } = req.params;
    const { termId, comment_type } = req.query;

    const comments = await Comment.getStudentComments(studentId, termId);

    if (!comments || comments.length === 0) {
      return res.status(404).json({ 
        success: false,
        message: "No comments found for this student",
        data: []
      });
    }

    // Filter by comment type if specified
    let filteredComments = comments;
    if (comment_type) {
      filteredComments = comments.filter(comment => comment.comment_type === comment_type);
    }

    res.status(200).json({
      success: true,
      data: filteredComments,
      count: filteredComments.length
    });
  } catch (error) {
    console.error("❌ Error fetching student comments:", error.message);
    res.status(500).json({ 
      success: false,
      message: "Server error while fetching comments" 
    });
  }
};

// Get comments by a specific teacher
const getTeacherComments = async (req, res) => {
  try {
    const { teacherId } = req.params;
    const { termId, comment_type } = req.query;

    const comments = await Comment.getTeacherComments(teacherId, termId);

    if (!comments || comments.length === 0) {
      return res.status(404).json({ 
        success: false,
        message: "No comments found for this teacher",
        data: []
      });
    }

    // Filter by comment type if specified
    let filteredComments = comments;
    if (comment_type) {
      filteredComments = comments.filter(comment => comment.comment_type === comment_type);
    }

    res.status(200).json({
      success: true,
      data: filteredComments,
      count: filteredComments.length
    });
  } catch (error) {
    console.error("❌ Error fetching teacher comments:", error.message);
    res.status(500).json({ 
      success: false,
      message: "Server error while fetching teacher comments" 
    });
  }
};

// Get comments for an entire class
const getClassComments = async (req, res) => {
  try {
    const { classId, termId } = req.params;
    const { comment_type } = req.query;

    const comments = await Comment.getClassComments(classId, termId);

    if (!comments || comments.length === 0) {
      return res.status(404).json({ 
        success: false,
        message: "No comments found for this class",
        data: []
      });
    }

    // Filter by comment type if specified
    let filteredComments = comments;
    if (comment_type) {
      filteredComments = comments.filter(comment => comment.comment_type === comment_type);
    }

    res.status(200).json({
      success: true,
      data: filteredComments,
      count: filteredComments.length
    });
  } catch (error) {
    console.error("❌ Error fetching class comments:", error.message);
    res.status(500).json({ 
      success: false,
      message: "Server error while fetching class comments" 
    });
  }
};

// Update a comment
const updateComment = async (req, res) => {
  try {
    const { id } = req.params;
    const { comment_text, comment_type, is_visible_to_parent } = req.body;

    const comment = await Comment.findByPk(id);
    if (!comment) {
      return res.status(404).json({ 
        success: false,
        message: "Comment not found" 
      });
    }

    // Build update object
    const updateData = {};
    if (comment_text !== undefined) updateData.comment_text = comment_text;
    if (comment_type !== undefined) updateData.comment_type = comment_type;
    if (is_visible_to_parent !== undefined) updateData.is_visible_to_parent = is_visible_to_parent;

    await comment.update(updateData);

    res.status(200).json({
      success: true,
      message: "✅ Comment updated successfully",
      data: comment
    });
  } catch (error) {
    console.error("❌ Error updating comment:", error.message);
    res.status(500).json({ 
      success: false,
      message: "Server error while updating comment" 
    });
  }
};

// Delete a comment (soft delete by setting is_active to false)
const deleteComment = async (req, res) => {
  try {
    const { id } = req.params;

    const comment = await Comment.findByPk(id);
    if (!comment) {
      return res.status(404).json({ 
        success: false,
        message: "Comment not found" 
      });
    }

    // Soft delete - you could add an is_active field to Comment model if needed
    await comment.destroy();

    res.status(200).json({ 
      success: true,
      message: "🗑️ Comment deleted successfully" 
    });
  } catch (error) {
    console.error("❌ Error deleting comment:", error.message);
    res.status(500).json({ 
      success: false,
      message: "Server error while deleting comment" 
    });
  }
};

// Get all comments for Principal/DOS dashboard
const getAllComments = async (req, res) => {
  try {
    const { termId, comment_type, page = 1, limit = 20 } = req.query;
    
    const { Teacher, Student, Term } = require("../models");
    
    const whereClause = {};
    if (termId) whereClause.term_id = termId;
    if (comment_type) whereClause.comment_type = comment_type;

    const offset = (page - 1) * limit;

    const comments = await Comment.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: Student,
          as: 'score_student',
          attributes: ['student_id', 'admission_number', 'fullname'],
          required: true
        },
        {
          model: Teacher,
          as: 'score_submitter',
          attributes: ['teacher_id', 'teacher_code'],
          include: [
            {
              model: require('./User'),
              as: 'user_account',
              attributes: ['fullname', 'email']
            }
          ],
          required: true
        },
        {
          model: Term,
          as: 'score_term',
          attributes: ['term_id', 'term_name', 'academic_year'],
          required: true
        }
      ],
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    const response = {
      success: true,
      data: comments.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: comments.count,
        pages: Math.ceil(comments.count / limit)
      }
    };

    res.status(200).json(response);
  } catch (error) {
    console.error("❌ Error fetching all comments:", error.message);
    res.status(500).json({ 
      success: false,
      message: "Server error while fetching comments" 
    });
  }
};

// Toggle comment visibility to parents
const toggleCommentVisibility = async (req, res) => {
  try {
    const { id } = req.params;

    const comment = await Comment.findByPk(id);
    if (!comment) {
      return res.status(404).json({ 
        success: false,
        message: "Comment not found" 
      });
    }

    const newVisibility = !comment.is_visible_to_parent;
    await comment.update({ is_visible_to_parent: newVisibility });

    res.status(200).json({
      success: true,
      message: `✅ Comment ${newVisibility ? 'made visible' : 'hidden'} from parents`,
      data: {
        comment_id: comment.comment_id,
        is_visible_to_parent: newVisibility
      }
    });
  } catch (error) {
    console.error("❌ Error toggling comment visibility:", error.message);
    res.status(500).json({ 
      success: false,
      message: "Server error while updating comment visibility" 
    });
  }
};

module.exports = {
  createComment,
  getStudentComments,
  getTeacherComments,
  getClassComments,
  updateComment,
  deleteComment,
  getAllComments,
  toggleCommentVisibility
};
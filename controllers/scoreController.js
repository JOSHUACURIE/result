const Score = require("../models/Score");
const Student = require("../models/Student");
const Assignment = require("../models/Assignment");
const Term = require("../models/Term");
const { gradeSubject, gradeTotal } = require("../services/gradingService");

// ===============================
// Submit Scores (Bulk - Teacher Dashboard)
// ===============================
const submitScores = async (req, res) => {
  try {
    const { assignment_id, term_id, scores } = req.body;
    const teacher_id = req.user.teacher_id; // Assuming teacher_id is in the token

    if (!assignment_id || !term_id || !scores || !Array.isArray(scores)) {
      return res.status(400).json({ 
        success: false,
        message: "Assignment ID, Term ID, and scores array are required" 
      });
    }

    // Verify assignment exists and teacher ownership
    const assignment = await Assignment.findOne({
      where: { 
        assignment_id: assignment_id,
        teacher_id: teacher_id,
        is_active: true 
      },
      include: [
        {
          model: require('../models/Subject'),
          as: 'assignment_subject',
          attributes: ['subject_name']
        },
        {
          model: require('../models/Class'),
          as: 'assignment_class',
          attributes: ['class_name']
        },
        {
          model: require('../models/Stream'),
          as: 'assignment_stream',
          attributes: ['stream_name']
        }
      ]
    });

    if (!assignment) {
      return res.status(403).json({ 
        success: false,
        message: "You are not assigned to this subject/class/stream or assignment not found" 
      });
    }

    // Prepare score data with validation
    const scoreData = scores.map(score => ({
      assignment_id,
      student_id: score.student_id,
      term_id,
      score: parseFloat(score.score),
      submitted_by: teacher_id
    }));

    // Validate scores are within range
    for (const score of scoreData) {
      if (score.score < 0 || score.score > 100) {
        return res.status(400).json({
          success: false,
          message: `Score for student ${score.student_id} must be between 0 and 100`
        });
      }
    }

    // Use the model's static method for bulk submission
    const submittedScores = await Score.submitScores(scoreData, teacher_id);

    res.status(201).json({
      success: true,
      message: `✅ ${submittedScores.length} scores submitted successfully for ${assignment.assignment_subject.subject_name}`,
      data: {
        assignment: {
          subject: assignment.assignment_subject.subject_name,
          class: assignment.assignment_class.class_name,
          stream: assignment.assignment_stream.stream_name
        },
        scores_count: submittedScores.length
      }
    });
  } catch (error) {
    console.error("Error submitting scores:", error);
    res.status(500).json({ 
      success: false,
      message: "Failed to submit scores",
      error: error.message 
    });
  }
};

// ===============================
// Get Scores by Assignment (Teacher View)
// ===============================
const getScoresByAssignment = async (req, res) => {
  try {
    const { assignment_id } = req.params;
    const teacher_id = req.user.teacher_id;

    const scores = await Score.getScoresByAssignment(assignment_id, teacher_id);

    res.status(200).json({
      success: true,
      data: scores,
      count: scores.length
    });
  } catch (error) {
    console.error("Error fetching assignment scores:", error);
    res.status(500).json({ 
      success: false,
      message: "Failed to fetch scores",
      error: error.message 
    });
  }
};

// ===============================
// Get Scores by Student & Term
// ===============================
const getScoresByStudent = async (req, res) => {
  try {
    const { student_id, term_id } = req.params;

    const scores = await Score.findAll({
      where: { student_id, term_id },
      include: [
        {
          model: Assignment,
          as: "score_assignment",
          attributes: ['assignment_id'],
          include: [
            {
              model: require('./Subject'),
              as: 'assignment_subject',
              attributes: ['subject_id', 'subject_name', 'subject_code']
            },
            {
              model: require('./Teacher'),
              as: 'assignment_teacher',
              attributes: ['teacher_id', 'teacher_code'],
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
          model: Student,
          as: "score_student",
          attributes: ['student_id', 'admission_number', 'fullname']
        },
        {
          model: Term,
          as: "score_term",
          attributes: ['term_id', 'term_name', 'academic_year']
        }
      ],
      order: [[{ model: require('./Subject'), as: 'assignment_subject' }, 'subject_name', 'ASC']],
    });

    if (!scores.length) {
      return res.status(404).json({ 
        success: false,
        message: "No scores found for this student in this term",
        data: []
      });
    }

    // Calculate grades for each score
    const scoresWithGrades = scores.map(score => ({
      ...score.toJSON(),
      grade: gradeSubject(score.score)
    }));

    res.status(200).json({
      success: true,
      data: scoresWithGrades,
      count: scores.length
    });
  } catch (error) {
    console.error("Error fetching student scores:", error);
    res.status(500).json({ 
      success: false,
      message: "Failed to fetch student scores",
      error: error.message 
    });
  }
};

// ===============================
// Update Single Score
// ===============================
const updateScore = async (req, res) => {
  try {
    const { score_id } = req.params;
    const { score: newScore } = req.body;
    const teacher_id = req.user.teacher_id;

    if (newScore === undefined || newScore < 0 || newScore > 100) {
      return res.status(400).json({ 
        success: false,
        message: "Valid score between 0 and 100 is required" 
      });
    }

    const existingScore = await Score.findByPk(score_id, {
      include: [
        {
          model: Assignment,
          as: 'score_assignment',
          attributes: ['teacher_id']
        }
      ]
    });

    if (!existingScore) {
      return res.status(404).json({ 
        success: false,
        message: "Score not found" 
      });
    }

    // Verify teacher owns this score
    if (existingScore.score_assignment.teacher_id !== teacher_id) {
      return res.status(403).json({ 
        success: false,
        message: "You can only update scores for your own assignments" 
      });
    }

    await existingScore.update({
      score: newScore,
      submitted_by: teacher_id,
      updated_at: new Date()
    });

    res.status(200).json({
      success: true,
      message: "✅ Score updated successfully",
      data: existingScore
    });
  } catch (error) {
    console.error("Error updating score:", error);
    res.status(500).json({ 
      success: false,
      message: "Failed to update score",
      error: error.message 
    });
  }
};

// ===============================
// Delete a Score
// ===============================
const deleteScore = async (req, res) => {
  try {
    const { score_id } = req.params;
    const teacher_id = req.user.teacher_id;

    const score = await Score.findByPk(score_id, {
      include: [
        {
          model: Assignment,
          as: 'score_assignment',
          attributes: ['teacher_id']
        }
      ]
    });

    if (!score) {
      return res.status(404).json({ 
        success: false,
        message: "Score not found" 
      });
    }

    // Verify teacher owns this score
    if (score.score_assignment.teacher_id !== teacher_id) {
      return res.status(403).json({ 
        success: false,
        message: "You can only delete scores for your own assignments" 
      });
    }

    await score.destroy();

    res.status(200).json({ 
      success: true,
      message: "🗑️ Score deleted successfully" 
    });
  } catch (error) {
    console.error("Error deleting score:", error);
    res.status(500).json({ 
      success: false,
      message: "Failed to delete score",
      error: error.message 
    });
  }
};

// ===============================
// Calculate Student Performance Summary
// ===============================
const getStudentPerformance = async (req, res) => {
  try {
    const { student_id, term_id } = req.params;

    const scores = await Score.findAll({
      where: { student_id, term_id },
      include: [
        {
          model: Assignment,
          as: 'score_assignment',
          attributes: ['assignment_id'],
          include: [
            {
              model: require('./Subject'),
              as: 'assignment_subject',
              attributes: ['subject_name']
            }
          ]
        }
      ]
    });

    if (!scores.length) {
      return res.status(404).json({ 
        success: false,
        message: "No scores found for this student",
        data: null
      });
    }

    // Calculate performance metrics
    const subjectScores = scores.map(score => ({
      subject: score.score_assignment.assignment_subject.subject_name,
      score: score.score,
      grade: gradeSubject(score.score)
    }));

    const totalScore = scores.reduce((sum, s) => sum + parseFloat(s.score || 0), 0);
    const averageScore = totalScore / scores.length;
    const overallGrade = gradeTotal(averageScore);

    // Count grades
    const gradeDistribution = {};
    subjectScores.forEach(subject => {
      gradeDistribution[subject.grade] = (gradeDistribution[subject.grade] || 0) + 1;
    });

    const performance = {
      student_id: parseInt(student_id),
      term_id: parseInt(term_id),
      total_score: totalScore,
      average_score: averageScore.toFixed(2),
      overall_grade: overallGrade,
      subject_count: scores.length,
      subject_scores: subjectScores,
      grade_distribution: gradeDistribution,
      strengths: subjectScores.filter(s => s.score >= 70).map(s => s.subject),
      areas_for_improvement: subjectScores.filter(s => s.score < 50).map(s => s.subject)
    };

    res.status(200).json({
      success: true,
      data: performance
    });
  } catch (error) {
    console.error("Error calculating performance:", error);
    res.status(500).json({ 
      success: false,
      message: "Failed to calculate performance",
      error: error.message 
    });
  }
};

// ===============================
// Get Class Performance Summary
// ===============================
const getClassPerformance = async (req, res) => {
  try {
    const { class_id, stream_id, term_id } = req.params;

    const students = await Student.findAll({
      where: { 
        class_id,
        ...(stream_id && { stream_id }),
        is_active: true 
      },
      include: [
        {
          model: Score,
          as: 'student_scores',
          where: { term_id },
          required: false
        }
      ]
    });

    const classPerformance = {
      class_id: parseInt(class_id),
      stream_id: stream_id ? parseInt(stream_id) : null,
      term_id: parseInt(term_id),
      total_students: students.length,
      students_with_scores: students.filter(s => s.student_scores && s.student_scores.length > 0).length,
      average_class_performance: 0,
      subject_performance: {},
      grade_distribution: {}
    };

    // Calculate class averages and performance
    let totalAverage = 0;
    let studentCount = 0;

    students.forEach(student => {
      const scores = student.student_scores || [];
      if (scores.length > 0) {
        const studentTotal = scores.reduce((sum, score) => sum + parseFloat(score.score || 0), 0);
        const studentAverage = studentTotal / scores.length;
        totalAverage += studentAverage;
        studentCount++;

        const grade = gradeTotal(studentAverage);
        classPerformance.grade_distribution[grade] = (classPerformance.grade_distribution[grade] || 0) + 1;
      }
    });

    classPerformance.average_class_performance = studentCount > 0 ? (totalAverage / studentCount).toFixed(2) : 0;

    res.status(200).json({
      success: true,
      data: classPerformance
    });
  } catch (error) {
    console.error("Error fetching class performance:", error);
    res.status(500).json({ 
      success: false,
      message: "Failed to fetch class performance",
      error: error.message 
    });
  }
};

module.exports = {
  submitScores,
  getScoresByAssignment,
  getScoresByStudent,
  updateScore,
  deleteScore,
  getStudentPerformance,
  getClassPerformance
};
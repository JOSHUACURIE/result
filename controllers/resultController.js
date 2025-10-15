const { exportResultsToExcel, exportIndividualResultToWord } = require("../services/exportService");
const Student = require("../models/Student"); 
const Score = require("../models/Score");     
const Subject = require("../models/Subject");
const Assignment = require("../models/Assignment");
const Class = require("../models/Class");
const Stream = require("../models/Stream");
const Term = require("../models/Term");
const Comment = require("../models/Comment");

// Export all results for a specific term and class/stream
exports.exportAllResults = async (req, res) => {
  try {
    const { term_id, class_id, stream_id, academic_year } = req.query;

    // Validate required parameters
    if (!term_id || !class_id || !academic_year) {
      return res.status(400).json({ 
        success: false,
        message: "Term ID, Class ID, and Academic Year are required" 
      });
    }

    // Get students with their scores for the specified term
    const students = await Student.findAll({
      where: { 
        class_id: class_id,
        ...(stream_id && { stream_id: stream_id }),
        is_active: true 
      },
      include: [
        {
          model: Class,
          as: 'student_class',
          attributes: ['class_name']
        },
        {
          model: Stream,
          as: 'student_stream',
          attributes: ['stream_name']
        },
        {
          model: Score,
          as: 'student_scores',
          where: { term_id: term_id },
          required: false,
          include: [
            {
              model: Assignment,
              as: 'score_assignment',
              attributes: ['assignment_id'],
              include: [
                {
                  model: Subject,
                  as: 'assignment_subject',
                  attributes: ['subject_name']
                }
              ]
            }
          ]
        }
      ],
      order: [['fullname', 'ASC']]
    });

    if (!students || students.length === 0) {
      return res.status(404).json({ 
        success: false,
        message: "No students found for the specified criteria" 
      });
    }

    // Calculate totals and format data
    const formatted = await Promise.all(students.map(async (student) => {
      // Calculate total score and average
      const scores = student.student_scores || [];
      const totalScore = scores.reduce((sum, score) => sum + parseFloat(score.score || 0), 0);
      const averageScore = scores.length > 0 ? totalScore / scores.length : 0;
      
      // Get subject details
      const subjectScores = scores.map(score => ({
        subject: score.score_assignment?.assignment_subject?.subject_name || 'Unknown',
        score: score.score,
        grade: calculateGrade(score.score) // You'll need to implement calculateGrade
      }));

      return {
        admission_number: student.admission_number,
        fullname: student.fullname,
        class_name: student.student_class?.class_name || 'Unknown',
        stream_name: student.student_stream?.stream_name || 'Unknown',
        total_score: totalScore,
        average_score: averageScore.toFixed(2),
        grade: calculateGrade(averageScore), // You'll need to implement calculateGrade
        subject_count: scores.length,
        subject_scores: subjectScores
      };
    }));

    // Calculate ranks
    const rankedStudents = calculateRanks(formatted);

    const filePath = await exportResultsToExcel(rankedStudents);

    res.download(filePath, `results_${class_id}_${stream_id || 'all'}_${academic_year}.xlsx`, (err) => {
      if (err) {
        console.error("Download error:", err);
        res.status(500).json({ 
          success: false,
          message: "Error downloading file" 
        });
      }
    });
  } catch (error) {
    console.error("Error exporting results:", error);
    res.status(500).json({ 
      success: false,
      message: "Failed to export results" 
    });
  }
};
exports.getSubmittedResults = async (req, res) => {
  try {
    const { term_id, class_id, stream_id, academic_year } = req.query;

    if (!term_id || !class_id || !academic_year) {
      return res.status(400).json({
        success: false,
        message: "Term ID, Class ID, and Academic Year are required"
      });
    }

    const students = await Student.findAll({
      where: {
        class_id,
        ...(stream_id && { stream_id }),
        is_active: true
      },
      include: [
        {
          model: Class,
          as: 'student_class',
          attributes: ['class_name']
        },
        {
          model: Stream,
          as: 'student_stream',
          attributes: ['stream_name']
        },
        {
          model: Score,
          as: 'student_scores',
          where: { term_id },
          required: false,
          include: [
            {
              model: Assignment,
              as: 'score_assignment',
              include: [
                {
                  model: Subject,
                  as: 'assignment_subject',
                  attributes: ['subject_name', 'subject_code']
                }
              ]
            }
          ]
        }
      ],
      order: [['fullname', 'ASC']]
    });

    if (!students || students.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No students found for the specified filters"
      });
    }

    // Format results
    const formatted = students.map(student => {
      const scores = student.student_scores || [];
      const total = scores.reduce((sum, s) => sum + parseFloat(s.score || 0), 0);
      const average = scores.length ? total / scores.length : 0;

      const subjectScores = scores.map(s => ({
        subject_name: s.score_assignment?.assignment_subject?.subject_name || 'Unknown',
        subject_code: s.score_assignment?.assignment_subject?.subject_code || 'N/A',
        score: s.score,
        grade: calculateGrade(s.score)
      }));

      return {
        student_id: student.student_id,
        admission_number: student.admission_number,
        fullname: student.fullname,
        class_name: student.student_class?.class_name || 'Unknown',
        stream_name: student.student_stream?.stream_name || 'Unknown',
        academic_year,
        total_score: total,
        average_score: average.toFixed(2),
        grade: calculateGrade(average),
        subject_count: subjectScores.length,
        subject_scores: subjectScores
      };
    });

    // Calculate ranks
    const rankedStudents = calculateRanks(formatted);

    res.status(200).json({
      success: true,
      count: rankedStudents.length,
      data: rankedStudents
    });
  } catch (error) {
    console.error("Error fetching submitted results:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve submitted results"
    });
  }
};
// Export individual student result
exports.exportStudentResult = async (req, res) => {
  try {
    const { studentId } = req.params;
    const { term_id, academic_year } = req.query;

    if (!term_id || !academic_year) {
      return res.status(400).json({ 
        success: false,
        message: "Term ID and Academic Year are required" 
      });
    }

    // Get student with detailed information
    const student = await Student.findByPk(studentId, {
      include: [
        {
          model: Class,
          as: 'student_class',
          attributes: ['class_name']
        },
        {
          model: Stream,
          as: 'student_stream',
          attributes: ['stream_name']
        },
        {
          model: Score,
          as: 'student_scores',
          where: { term_id: term_id },
          required: false,
          include: [
            {
              model: Assignment,
              as: 'score_assignment',
              attributes: ['assignment_id'],
              include: [
                {
                  model: Subject,
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
            }
          ]
        },
        {
          model: Comment,
          as: 'student_comments',
          where: { term_id: term_id },
          required: false,
          include: [
            {
              model: require('./Teacher'),
              as: 'score_submitter',
              attributes: ['teacher_id'],
              include: [
                {
                  model: require('./User'),
                  as: 'user_account',
                  attributes: ['fullname']
                }
              ]
            }
          ]
        }
      ]
    });

    if (!student) {
      return res.status(404).json({ 
        success: false,
        message: "Student not found" 
      });
    }

    // Calculate overall performance
    const scores = student.student_scores || [];
    const totalScore = scores.reduce((sum, score) => sum + parseFloat(score.score || 0), 0);
    const averageScore = scores.length > 0 ? totalScore / scores.length : 0;
    const overallGrade = calculateGrade(averageScore);

    // Format subject scores
    const subjects = scores.map(score => ({
      name: score.score_assignment?.assignment_subject?.subject_name || 'Unknown',
      code: score.score_assignment?.assignment_subject?.subject_code || 'N/A',
      score: score.score,
      grade: calculateGrade(score.score),
      teacher: score.score_assignment?.assignment_teacher?.user_account?.fullname || 'N/A'
    }));

    // Get comments
    const comments = {
      principal: student.student_comments?.find(c => c.comment_type === 'recommendation')?.comment_text || "",
      class_teacher: student.student_comments?.find(c => c.comment_type === 'general')?.comment_text || "",
      academic: student.student_comments?.filter(c => c.comment_type === 'academic').map(c => c.comment_text) || [],
      behavioral: student.student_comments?.filter(c => c.comment_type === 'behavioral').map(c => c.comment_text) || []
    };

    // Get term information
    const term = await Term.findByPk(term_id);

    const studentData = {
      school_name: process.env.SCHOOL_NAME || "School Management System",
      admission_number: student.admission_number,
      fullname: student.fullname,
      class_name: student.student_class?.class_name || 'Unknown',
      stream_name: student.student_stream?.stream_name || 'Unknown',
      term_name: term?.term_name || 'Unknown',
      academic_year: academic_year,
      total_score: totalScore,
      average_score: averageScore.toFixed(2),
      grade: overallGrade,
      subject_count: scores.length
    };

    const filePath = await exportIndividualResultToWord(studentData, subjects, comments);

    res.download(filePath, `result_${student.admission_number}_${academic_year}.docx`, (err) => {
      if (err) {
        console.error("Download error:", err);
        res.status(500).json({ 
          success: false,
          message: "Error downloading file" 
        });
      }
    });
  } catch (error) {
    console.error("Error exporting student result:", error);
    res.status(500).json({ 
      success: false,
      message: "Failed to export student result" 
    });
  }
};

// Generate result summary for dashboard
exports.getResultSummary = async (req, res) => {
  try {
    const { class_id, stream_id, term_id, academic_year } = req.query;

    const students = await Student.findAll({
      where: { 
        class_id: class_id,
        ...(stream_id && { stream_id: stream_id }),
        is_active: true 
      },
      include: [
        {
          model: Score,
          as: 'student_scores',
          where: { term_id: term_id },
          required: false
        }
      ]
    });

    const summary = {
      total_students: students.length,
      students_with_scores: students.filter(s => s.student_scores && s.student_scores.length > 0).length,
      average_performance: 0,
      grade_distribution: {}
    };

    // Calculate averages and grade distribution
    let totalAverage = 0;
    let studentCount = 0;

    students.forEach(student => {
      const scores = student.student_scores || [];
      if (scores.length > 0) {
        const studentTotal = scores.reduce((sum, score) => sum + parseFloat(score.score || 0), 0);
        const studentAverage = studentTotal / scores.length;
        totalAverage += studentAverage;
        studentCount++;

        const grade = calculateGrade(studentAverage);
        summary.grade_distribution[grade] = (summary.grade_distribution[grade] || 0) + 1;
      }
    });

    summary.average_performance = studentCount > 0 ? (totalAverage / studentCount).toFixed(2) : 0;

    res.status(200).json({
      success: true,
      data: summary
    });
  } catch (error) {
    console.error("Error generating result summary:", error);
    res.status(500).json({ 
      success: false,
      message: "Failed to generate result summary" 
    });
  }
};

// Helper function to calculate grade based on score
function calculateGrade(score) {
  if (score >= 80) return 'A';
  if (score >= 75) return 'A-';
  if (score >= 70) return 'B+';
  if (score >= 65) return 'B';
  if (score >= 60) return 'B-';
  if (score >= 55) return 'C+';
  if (score >= 50) return 'C';
  if (score >= 45) return 'C-';
  if (score >= 40) return 'D+';
  if (score >= 35) return 'D';
  if (score >= 30) return 'D-';
  return 'E';
}

// Helper function to calculate ranks
function calculateRanks(students) {
  // Sort by average score descending
  const sortedStudents = [...students].sort((a, b) => b.average_score - a.average_score);
  
  // Assign ranks
  let currentRank = 1;
  let previousScore = null;
  let skipCount = 0;

  return sortedStudents.map((student, index) => {
    if (previousScore !== null && student.average_score < previousScore) {
      currentRank += 1 + skipCount;
      skipCount = 0;
    } else if (previousScore !== null && student.average_score === previousScore) {
      skipCount++;
    }

    previousScore = student.average_score;
    
    return {
      ...student,
      class_rank: currentRank,
      stream_rank: currentRank // You might want different logic for stream rank
    };
  });
}

module.exports = exports;
const { sendSMS } = require("../services/smsService");
const Student = require("../models/Student");
const Teacher = require("../models/Teacher");
const Score = require("../models/Score");
const Term = require("../models/Term");
const Class = require("../models/Class");
const Stream = require("../models/Stream");

// ===============================
// Send Single SMS
// ===============================
const sendSingleSMS = async (req, res) => {
  try {
    const { phone, message } = req.body;

    if (!phone || !message) {
      return res.status(400).json({ 
        success: false,
        message: "Phone number and message are required" 
      });
    }

    const result = await sendSMS(phone, message);

    res.status(200).json({
      success: true,
      message: "SMS sent successfully",
      data: {
        phone: phone,
        sid: result.sid,
        status: result.status
      }
    });
  } catch (error) {
    console.error("Error sending single SMS:", error);
    res.status(500).json({ 
      success: false,
      message: "Failed to send SMS",
      error: error.message 
    });
  }
};

// ===============================
// Send Bulk SMS to Students
// ===============================
const sendBulkSMS = async (req, res) => {
  try {
    const { phones, message, class_id, stream_id } = req.body;

    // Validate input
    if (!message) {
      return res.status(400).json({ 
        success: false,
        message: "Message is required" 
      });
    }

    let targetPhones = phones;

    // If class_id is provided, get student phones
    if (class_id) {
      const whereClause = { 
        class_id: class_id,
        is_active: true 
      };
      
      if (stream_id) {
        whereClause.stream_id = stream_id;
      }

      const students = await Student.findAll({
        where: whereClause,
        attributes: ['student_id', 'fullname', 'guardian_phone']
      });

      targetPhones = students
        .map(student => student.guardian_phone)
        .filter(phone => phone && phone.trim() !== '');

      if (targetPhones.length === 0) {
        return res.status(404).json({ 
          success: false,
          message: "No valid phone numbers found for the specified class/stream" 
        });
      }
    }

    if (!targetPhones || !Array.isArray(targetPhones) || targetPhones.length === 0) {
      return res.status(400).json({ 
        success: false,
        message: "Phones array is required and must not be empty" 
      });
    }

    // Send SMS to all phones
    const results = [];
    const failed = [];

    for (let phone of targetPhones) {
      try {
        const response = await sendSMS(phone, message);
        results.push({ 
          phone, 
          sid: response.sid,
          status: 'sent'
        });
      } catch (error) {
        failed.push({ 
          phone, 
          error: error.message,
          status: 'failed'
        });
      }
    }

    res.status(200).json({
      success: true,
      message: `Bulk SMS completed. ${results.length} sent, ${failed.length} failed`,
      data: {
        total: targetPhones.length,
        sent: results.length,
        failed: failed.length,
        results: results,
        failures: failed
      }
    });
  } catch (error) {
    console.error("Error sending bulk SMS:", error);
    res.status(500).json({ 
      success: false,
      message: "Failed to send bulk SMS",
      error: error.message 
    });
  }
};

// ===============================
// Send Results SMS to Class/Stream
// ===============================
const sendResultsSMS = async (req, res) => {
  try {
    const { class_id, stream_id, term_id } = req.body;

    if (!class_id || !term_id) {
      return res.status(400).json({ 
        success: false,
        message: "Class ID and Term ID are required" 
      });
    }

    // Get term information
    const term = await Term.findByPk(term_id);
    if (!term) {
      return res.status(404).json({ 
        success: false,
        message: "Term not found" 
      });
    }

    // Get class and stream information
    const classInfo = await Class.findByPk(class_id);
    const streamInfo = stream_id ? await Stream.findByPk(stream_id) : null;

    // Get students with their scores
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

    if (students.length === 0) {
      return res.status(404).json({ 
        success: false,
        message: "No students found for the specified criteria" 
      });
    }

    const results = [];
    const failed = [];

    for (const student of students) {
      try {
        if (!student.guardian_phone) {
          failed.push({
            student: student.fullname,
            phone: 'No phone number',
            error: 'Missing guardian phone number',
            status: 'failed'
          });
          continue;
        }

        // Calculate student performance
        const scores = student.student_scores || [];
        const totalScore = scores.reduce((sum, score) => sum + parseFloat(score.score || 0), 0);
        const averageScore = scores.length > 0 ? totalScore / scores.length : 0;
        
        // Simple grade calculation (you can use your grading service)
        const grade = calculateGrade(averageScore);

        const message = `Dear Parent/Guardian, ${student.fullname}'s ${term.term_name} ${term.academic_year} results: Average ${averageScore.toFixed(1)} (${grade}). ${classInfo.class_name}${streamInfo ? ` ${streamInfo.stream_name}` : ''}. Login to portal for details.`;

        const smsResult = await sendSMS(student.guardian_phone, message);
        
        results.push({
          student: student.fullname,
          phone: student.guardian_phone,
          average_score: averageScore.toFixed(1),
          grade: grade,
          sid: smsResult.sid,
          status: 'sent'
        });
      } catch (error) {
        failed.push({
          student: student.fullname,
          phone: student.guardian_phone,
          error: error.message,
          status: 'failed'
        });
      }
    }

    res.status(200).json({
      success: true,
      message: `Results SMS completed. ${results.length} sent, ${failed.length} failed`,
      data: {
        term: `${term.term_name} ${term.academic_year}`,
        class: classInfo.class_name,
        stream: streamInfo?.stream_name || 'All Streams',
        total_students: students.length,
        sent: results.length,
        failed: failed.length,
        results: results,
        failures: failed
      }
    });
  } catch (error) {
    console.error("Error sending results SMS:", error);
    res.status(500).json({ 
      success: false,
      message: "Failed to send results SMS",
      error: error.message 
    });
  }
};

// ===============================
// Send Attendance SMS
// ===============================
const sendAttendanceSMS = async (req, res) => {
  try {
    const { class_id, stream_id, message, date } = req.body;

    if (!class_id || !message) {
      return res.status(400).json({ 
        success: false,
        message: "Class ID and message are required" 
      });
    }

    const students = await Student.findAll({
      where: { 
        class_id: class_id,
        ...(stream_id && { stream_id: stream_id }),
        is_active: true 
      },
      attributes: ['student_id', 'fullname', 'guardian_phone']
    });

    if (students.length === 0) {
      return res.status(404).json({ 
        success: false,
        message: "No students found for the specified class/stream" 
      });
    }

    const results = [];
    const failed = [];

    for (const student of students) {
      try {
        if (!student.guardian_phone) {
          failed.push({
            student: student.fullname,
            phone: 'No phone number',
            error: 'Missing guardian phone number',
            status: 'failed'
          });
          continue;
        }

        // Personalize message with student name
        const personalizedMessage = message.replace(/\[name\]/gi, student.fullname);

        const smsResult = await sendSMS(student.guardian_phone, personalizedMessage);
        
        results.push({
          student: student.fullname,
          phone: student.guardian_phone,
          sid: smsResult.sid,
          status: 'sent'
        });
      } catch (error) {
        failed.push({
          student: student.fullname,
          phone: student.guardian_phone,
          error: error.message,
          status: 'failed'
        });
      }
    }

    res.status(200).json({
      success: true,
      message: `Attendance SMS completed. ${results.length} sent, ${failed.length} failed`,
      data: {
        total_students: students.length,
        sent: results.length,
        failed: failed.length,
        results: results,
        failures: failed
      }
    });
  } catch (error) {
    console.error("Error sending attendance SMS:", error);
    res.status(500).json({ 
      success: false,
      message: "Failed to send attendance SMS",
      error: error.message 
    });
  }
};

// ===============================
// Send Emergency Alert
// ===============================
const sendEmergencyAlert = async (req, res) => {
  try {
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ 
        success: false,
        message: "Emergency message is required" 
      });
    }

    // Get all active students with guardian phones
    const students = await Student.findAll({
      where: { is_active: true },
      attributes: ['student_id', 'fullname', 'guardian_phone']
    });

    const validStudents = students.filter(s => s.guardian_phone && s.guardian_phone.trim() !== '');

    if (validStudents.length === 0) {
      return res.status(404).json({ 
        success: false,
        message: "No valid phone numbers found in the system" 
      });
    }

    const emergencyMessage = `🚨 EMERGENCY ALERT: ${message} - ${process.env.SCHOOL_NAME || 'School Management System'}`;

    const results = [];
    const failed = [];

    for (const student of validStudents) {
      try {
        const smsResult = await sendSMS(student.guardian_phone, emergencyMessage);
        
        results.push({
          student: student.fullname,
          phone: student.guardian_phone,
          sid: smsResult.sid,
          status: 'sent'
        });
      } catch (error) {
        failed.push({
          student: student.fullname,
          phone: student.guardian_phone,
          error: error.message,
          status: 'failed'
        });
      }
    }

    res.status(200).json({
      success: true,
      message: `Emergency alert sent. ${results.length} delivered, ${failed.length} failed`,
      data: {
        total_recipients: validStudents.length,
        delivered: results.length,
        failed: failed.length,
        results: results.slice(0, 10), // Return first 10 to avoid huge response
        failures: failed.slice(0, 10)
      }
    });
  } catch (error) {
    console.error("Error sending emergency alert:", error);
    res.status(500).json({ 
      success: false,
      message: "Failed to send emergency alert",
      error: error.message 
    });
  }
};

// ===============================
// Helper Functions
// ===============================
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

module.exports = {
  sendSingleSMS,
  sendBulkSMS,
  sendResultsSMS,
  sendAttendanceSMS,
  sendEmergencyAlert
};
const Stream = require("../models/Stream");
const Student = require("../models/Student");
const Assignment = require("../models/Assignment");

// Create a new stream
const createStream = async (req, res) => {
  try {
    const { stream_name, class_id } = req.body;

if (!stream_name || !class_id) {
  return res.status(400).json({
    success: false,
    message: "Stream name and class ID are required",
  });
}

const newStream = await Stream.createStream(stream_name, class_id);


    res.status(201).json({
      success: true,
      message: "✅ Stream created successfully",
      data: newStream,
    });
  } catch (error) {
    console.error("❌ Error creating stream:", error);
    
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({
        success: false,
        message: "Stream name already exists"
      });
    }
    
    res.status(500).json({ 
      success: false,
      message: "Server error while creating stream",
      error: error.message 
    });
  }
};

// Get all streams (active only by default)
const getAllStreams = async (req, res) => {
  try {
    const { include_inactive = false } = req.query;
    
    const whereClause = {};
    if (!include_inactive) {
      whereClause.is_active = true;
    }

    const streams = await Stream.findAll({
      where: whereClause,
      order: [["stream_name", "ASC"]],
    });

    res.status(200).json({
      success: true,
      data: streams,
      count: streams.length
    });
  } catch (error) {
    console.error("❌ Error fetching streams:", error);
    res.status(500).json({ 
      success: false,
      message: "Server error while fetching streams",
      error: error.message 
    });
  }
};

// Get stream by ID with detailed information
const getStreamById = async (req, res) => {
  try {
    const { stream_id } = req.params;

    const stream = await Stream.findByPk(stream_id, {
      include: [
        {
          model: Student,
          as: 'stream_students',
          attributes: ['student_id', 'admission_number', 'fullname'],
          where: { is_active: true },
          required: false
        },
        {
          model: Assignment,
          as: 'stream_assignments',
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
              model: require('../models/Class'),
              as: 'assignment_class',
              attributes: ['class_name']
            }
          ]
        }
      ]
    });

    if (!stream) {
      return res.status(404).json({ 
        success: false,
        message: "Stream not found" 
      });
    }

    res.status(200).json({
      success: true,
      data: stream
    });
  } catch (error) {
    console.error("❌ Error fetching stream:", error);
    res.status(500).json({ 
      success: false,
      message: "Server error while fetching stream",
      error: error.message 
    });
  }
};

// Update a stream
const updateStream = async (req, res) => {
  try {
    const { stream_id } = req.params;
    const { stream_name, is_active } = req.body;

    if (!stream_name) {
      return res.status(400).json({ 
        success: false,
        message: "Stream name is required" 
      });
    }

    const stream = await Stream.findByPk(stream_id);
    if (!stream) {
      return res.status(404).json({ 
        success: false,
        message: "Stream not found" 
      });
    }

    await stream.update({ 
      stream_name,
      ...(is_active !== undefined && { is_active })
    });

    res.status(200).json({
      success: true,
      message: "✅ Stream updated successfully",
      data: stream
    });
  } catch (error) {
    console.error("❌ Error updating stream:", error);
    
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({
        success: false,
        message: "Stream name already exists"
      });
    }
    
    res.status(500).json({ 
      success: false,
      message: "Server error while updating stream",
      error: error.message 
    });
  }
};

// Delete a stream (soft delete)
const deleteStream = async (req, res) => {
  try {
    const { stream_id } = req.params;

    const stream = await Stream.findByPk(stream_id);
    if (!stream) {
      return res.status(404).json({ 
        success: false,
        message: "Stream not found" 
      });
    }

    // Check if stream has active students
    const activeStudents = await Student.count({
      where: { 
        stream_id: stream_id,
        is_active: true 
      }
    });

    if (activeStudents > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete stream with ${activeStudents} active students. Reassign students first.`
      });
    }

    // Check if stream has active assignments
    const activeAssignments = await Assignment.count({
      where: { 
        stream_id: stream_id,
        is_active: true 
      }
    });

    if (activeAssignments > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete stream with ${activeAssignments} active assignments. Update assignments first.`
      });
    }

    // Soft delete by setting is_active to false
    await stream.update({ is_active: false });

    res.status(200).json({ 
      success: true,
      message: "✅ Stream deactivated successfully" 
    });
  } catch (error) {
    console.error("❌ Error deleting stream:", error);
    res.status(500).json({ 
      success: false,
      message: "Server error while deleting stream",
      error: error.message 
    });
  }
};

// Reactivate a stream
const reactivateStream = async (req, res) => {
  try {
    const { stream_id } = req.params;

    const stream = await Stream.findByPk(stream_id);
    if (!stream) {
      return res.status(404).json({ 
        success: false,
        message: "Stream not found" 
      });
    }

    await stream.update({ is_active: true });

    res.status(200).json({
      success: true,
      message: "✅ Stream reactivated successfully",
      data: stream
    });
  } catch (error) {
    console.error("❌ Error reactivating stream:", error);
    res.status(500).json({ 
      success: false,
      message: "Server error while reactivating stream",
      error: error.message 
    });
  }
};

// Get stream statistics
const getStreamStats = async (req, res) => {
  try {
    const { stream_id } = req.params;

    const stream = await Stream.findByPk(stream_id, {
      include: [
        {
          model: Student,
          as: 'stream_students',
          attributes: [],
          where: { is_active: true },
          required: false
        },
        {
          model: Assignment,
          as: 'stream_assignments',
          attributes: [],
          where: { is_active: true },
          required: false
        }
      ],
      attributes: [
        'stream_id',
        'stream_name',
        'is_active',
        [
          Student.sequelize.literal('COUNT(DISTINCT "stream_students"."student_id")'),
          'student_count'
        ],
        [
          Student.sequelize.literal('COUNT(DISTINCT "stream_assignments"."assignment_id")'),
          'assignment_count'
        ]
      ],
      group: ['Stream.stream_id']
    });

    if (!stream) {
      return res.status(404).json({ 
        success: false,
        message: "Stream not found" 
      });
    }

    res.status(200).json({
      success: true,
      data: stream
    });
  } catch (error) {
    console.error("❌ Error fetching stream stats:", error);
    res.status(500).json({ 
      success: false,
      message: "Server error while fetching stream statistics",
      error: error.message 
    });
  }
};

// Get streams with class combinations (for assignment purposes)
const getStreamsWithClasses = async (req, res) => {
  try {
    const { Student, Class } = require("../models");
    
    // Get all active streams
    const streams = await Stream.findAll({
      where: { is_active: true },
      order: [["stream_name", "ASC"]]
    });

    // For each stream, find which classes have students in that stream
    const streamsWithClasses = await Promise.all(
      streams.map(async (stream) => {
        const classesWithStudents = await Student.findAll({
          where: { 
            stream_id: stream.stream_id,
            is_active: true 
          },
          attributes: ['class_id'],
          include: [
            {
              model: Class,
              as: 'student_class',
              attributes: ['class_id', 'class_name']
            }
          ],
          group: ['class_id', 'student_class.class_id', 'student_class.class_name'],
          raw: true
        });

        const uniqueClasses = [...new Map(
          classesWithStudents
            .filter(item => item['student_class.class_id'])
            .map(item => [
              item['student_class.class_id'], 
              {
                class_id: item['student_class.class_id'],
                class_name: item['student_class.class_name']
              }
            ])
        ).values()];

        return {
          stream_id: stream.stream_id,
          stream_name: stream.stream_name,
          classes: uniqueClasses
        };
      })
    );

    res.status(200).json({
      success: true,
      data: streamsWithClasses
    });
  } catch (error) {
    console.error("❌ Error fetching streams with classes:", error);
    res.status(500).json({ 
      success: false,
      message: "Server error while fetching streams with classes",
      error: error.message 
    });
  }
};

module.exports = {
  createStream,
  getAllStreams,
  getStreamById,
  updateStream,
  deleteStream,
  reactivateStream,
  getStreamStats,
  getStreamsWithClasses
};
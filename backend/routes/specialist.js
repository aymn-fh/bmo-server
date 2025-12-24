const express = require('express');
const router = express.Router();
const Child = require('../models/Child');
const User = require('../models/User');
const Progress = require('../models/Progress');
const { protect, authorize } = require('../middleware/auth');

// @route   GET /api/specialists/pending-requests
// @desc    Get children with pending specialist requests
// @access  Private (Specialist)
router.get('/pending-requests', protect, authorize('specialist'), async (req, res) => {
  try {
    const children = await Child.find({ specialistRequestStatus: 'pending' })
      .populate('parent', 'name email phone');

    res.json({
      success: true,
      count: children.length,
      children
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   POST /api/specialists/accept-child/:childId
// @desc    Accept child assignment
// @access  Private (Specialist)
router.post('/accept-child/:childId', protect, authorize('specialist'), async (req, res) => {
  try {
    const child = await Child.findById(req.params.childId);

    if (!child) {
      return res.status(404).json({
        success: false,
        message: 'Child not found'
      });
    }

    if (child.specialistRequestStatus !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'No pending request for this child'
      });
    }

    child.assignedSpecialist = req.user.id;
    child.specialistRequestStatus = 'approved';
    await child.save();

    // Add child to specialist's assigned children
    await User.findByIdAndUpdate(req.user.id, {
      $addToSet: { assignedChildren: child._id }
    });

    res.json({
      success: true,
      message: 'Child assignment accepted',
      child
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   POST /api/specialists/reject-child/:childId
// @desc    Reject child assignment
// @access  Private (Specialist)
router.post('/reject-child/:childId', protect, authorize('specialist'), async (req, res) => {
  try {
    const child = await Child.findById(req.params.childId);

    if (!child) {
      return res.status(404).json({
        success: false,
        message: 'Child not found'
      });
    }

    child.specialistRequestStatus = 'rejected';
    await child.save();

    res.json({
      success: true,
      message: 'Child assignment rejected',
      child
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   POST /api/specialists/set-duration/:childId
// @desc    Set daily play duration for child
// @access  Private (Specialist)
router.post('/set-duration/:childId', protect, authorize('specialist'), async (req, res) => {
  try {
    const { dailyPlayDuration, sessionStructure } = req.body;

    const child = await Child.findById(req.params.childId);

    if (!child) {
      return res.status(404).json({
        success: false,
        message: 'Child not found'
      });
    }

    if (!child.assignedSpecialist || child.assignedSpecialist.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized'
      });
    }

    if (dailyPlayDuration) child.dailyPlayDuration = dailyPlayDuration;
    if (sessionStructure) child.sessionStructure = sessionStructure;

    await child.save();

    res.json({
      success: true,
      message: 'Settings updated successfully',
      child
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   POST /api/specialists/create-parent
// @desc    Create a parent account
// @access  Private (Specialist)
router.post('/create-parent', protect, authorize('specialist'), async (req, res) => {
  try {
    const { name, email, password, phone } = req.body;

    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User already exists with this email'
      });
    }

    // Create parent account
    const parent = await User.create({
      name,
      email,
      password,
      role: 'parent',
      phone,
      emailVerified: true // Auto-verify since created by specialist
    });

    res.status(201).json({
      success: true,
      message: 'Parent account created successfully',
      parent: {
        id: parent._id,
        name: parent.name,
        email: parent.email,
        phone: parent.phone
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   POST /api/specialists/create-child
// @desc    Create a child account and assign to parent
// @access  Private (Specialist)
router.post('/create-child', protect, authorize('specialist'), async (req, res) => {
  try {
    const { parentId, name, age, gender, targetLetters, targetWords, difficultyLevel } = req.body;

    // Verify parent exists and is a parent
    const parent = await User.findById(parentId);
    if (!parent) {
      return res.status(404).json({
        success: false,
        message: 'Parent not found'
      });
    }

    if (parent.role !== 'parent') {
      return res.status(400).json({
        success: false,
        message: 'User is not a parent'
      });
    }

    // Create child and assign specialist automatically
    const child = await Child.create({
      name,
      age,
      gender,
      parent: parentId,
      assignedSpecialist: req.user.id,
      specialistRequestStatus: 'approved',
      targetLetters: targetLetters || [],
      targetWords: targetWords || [],
      difficultyLevel: difficultyLevel || 'beginner'
    });

    // Add child to specialist's assigned children
    await User.findByIdAndUpdate(req.user.id, {
      $addToSet: { assignedChildren: child._id }
    });

    // Initialize progress tracking
    await Progress.create({ child: child._id });

    res.status(201).json({
      success: true,
      message: 'Child account created and assigned successfully',
      child
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   GET /api/specialists/parents
// @desc    Get all parent accounts
// @access  Private (Specialist)
router.get('/parents', protect, authorize('specialist'), async (req, res) => {
  try {
    const parents = await User.find({ role: 'parent' })
      .select('name email phone createdAt');

    res.json({
      success: true,
      count: parents.length,
      parents
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;

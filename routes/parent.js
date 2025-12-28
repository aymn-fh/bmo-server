const express = require('express');
const router = express.Router();
const User = require('../models/User');
const LinkRequest = require('../models/LinkRequest');
const Notification = require('../models/Notification');
const { protect, authorize } = require('../middleware/auth');

// @route   GET /api/parents/search-specialists
// @desc    Search for specialists by name or specialization
// @access  Private (Parent)
router.get('/search-specialists', protect, authorize('parent'), async (req, res) => {
    try {
        const { query } = req.query;
        const parent = await User.findById(req.user.id);

        // Build search query
        let searchQuery = {
            role: 'specialist'
        };

        // Exclude already linked specialist - REMOVED to allow parents to see all
        // if (parent.linkedSpecialist) {
        //     searchQuery._id = { $ne: parent.linkedSpecialist };
        // }

        // If query is provided, search by name or specialization
        if (query && query.trim()) {
            searchQuery.$or = [
                { name: { $regex: query, $options: 'i' } },
                { specialization: { $regex: query, $options: 'i' } }
            ];
        }

        const specialists = await User.find(searchQuery)
            .select('_id name email phone specialization profilePhoto bio')
            .limit(30);

        res.json({
            success: true,
            count: specialists.length,
            specialists
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// @route   GET /api/parents/search-centers
// @desc    Search for centers by name or address
// @access  Private (Parent)
router.get('/search-centers', protect, authorize('parent'), async (req, res) => {
    try {
        const { query } = req.query;
        const Center = require('../models/Center'); // Ensure Center model is imported

        // Build search query
        let searchQuery = {
            isActive: true
        };

        // If query is provided, search by name or address
        if (query && query.trim()) {
            searchQuery.$or = [
                { name: { $regex: query, $options: 'i' } },
                { address: { $regex: query, $options: 'i' } },
                { description: { $regex: query, $options: 'i' } }
            ];
        }

        const centers = await Center.find(searchQuery)
            .select('name address phone email description specialists')
            .populate('specialists', 'name specialization profilePhoto')
            .limit(30);

        res.json({
            success: true,
            count: centers.length,
            centers
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// @route   POST /api/parents/send-link-request
// @desc    Send a link request to a specialist
// @access  Private (Parent)
router.post('/send-link-request', protect, authorize('parent'), async (req, res) => {
    try {
        const { specialistId, message } = req.body;

        if (!specialistId) {
            return res.status(400).json({
                success: false,
                message: 'Specialist ID is required'
            });
        }

        // Check if parent is already linked to a specialist
        const parent = await User.findById(req.user.id);
        if (parent.linkedSpecialist) {
            return res.status(400).json({
                success: false,
                message: 'You are already linked to a specialist'
            });
        }

        // Check if specialist exists
        const specialist = await User.findById(specialistId);
        if (!specialist || specialist.role !== 'specialist') {
            return res.status(404).json({
                success: false,
                message: 'Specialist not found'
            });
        }

        // Check if there's already a pending request
        const existingRequest = await LinkRequest.findOne({
            from: req.user.id,
            to: specialistId,
            status: 'pending'
        });

        if (existingRequest) {
            return res.status(400).json({
                success: false,
                message: 'You already have a pending request to this specialist'
            });
        }

        // Create the link request
        const linkRequest = await LinkRequest.create({
            from: req.user.id,
            to: specialistId,
            message: message || ''
        });

        // Populate the response
        await linkRequest.populate('to', 'name email specialization');

        res.status(201).json({
            success: true,
            message: 'Link request sent successfully',
            request: linkRequest
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// @route   GET /api/parents/my-requests
// @desc    Get all link requests sent by the parent
// @access  Private (Parent)
router.get('/my-requests', protect, authorize('parent'), async (req, res) => {
    try {
        const requests = await LinkRequest.find({ from: req.user.id })
            .populate('to', 'name email specialization phone')
            .sort('-createdAt');

        res.json({
            success: true,
            count: requests.length,
            requests
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// @route   DELETE /api/parents/cancel-request/:requestId
// @desc    Cancel a pending link request
// @access  Private (Parent)
router.delete('/cancel-request/:requestId', protect, authorize('parent'), async (req, res) => {
    try {
        const request = await LinkRequest.findById(req.params.requestId);

        if (!request) {
            return res.status(404).json({
                success: false,
                message: 'Request not found'
            });
        }

        // Check ownership
        if (request.from.toString() !== req.user.id) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized'
            });
        }

        // Can only cancel pending requests
        if (request.status !== 'pending') {
            return res.status(400).json({
                success: false,
                message: 'Can only cancel pending requests'
            });
        }

        await LinkRequest.findByIdAndDelete(req.params.requestId);

        res.json({
            success: true,
            message: 'Request cancelled successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// @route   GET /api/parents/my-specialist
// @desc    Get the specialist linked to the parent (alias for auth/my-specialist)
// @access  Private (Parent)
router.get('/my-specialist', protect, authorize('parent'), async (req, res) => {
    try {
        const user = await User.findById(req.user.id)
            .populate('linkedSpecialist', 'name email phone specialization');

        if (!user.linkedSpecialist) {
            return res.status(404).json({
                success: false,
                message: 'No specialist linked'
            });
        }

        res.json({
            success: true,
            specialist: user.linkedSpecialist
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// @route   GET /api/parents/notifications
// @desc    Get all notifications for the parent
// @access  Private (Parent)
router.get('/notifications', protect, authorize('parent'), async (req, res) => {
    try {
        const notifications = await Notification.find({ recipient: req.user.id })
            .sort('-createdAt')
            .limit(50);

        res.json({
            success: true,
            count: notifications.length,
            notifications
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// @route   PUT /api/parents/notifications/:id/read
// @desc    Mark a notification as read
// @access  Private (Parent)
router.put('/notifications/:id/read', protect, authorize('parent'), async (req, res) => {
    try {
        const notification = await Notification.findById(req.params.id);

        if (!notification) {
            return res.status(404).json({
                success: false,
                message: 'Notification not found'
            });
        }

        // Check ownership
        if (notification.recipient.toString() !== req.user.id) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized'
            });
        }

        notification.read = true;
        await notification.save();

        res.json({
            success: true,
            message: 'Notification marked as read',
            notification
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// @route   GET /api/parents/notifications/unread/count
// @desc    Get count of unread notifications
// @access  Private (Parent)
router.get('/notifications/unread/count', protect, authorize('parent'), async (req, res) => {
    try {
        const count = await Notification.countDocuments({
            recipient: req.user.id,
            read: false
        });

        res.json({
            success: true,
            count
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// @route   DELETE /api/parents/unlink-specialist
// @desc    Unlink the current specialist
// @access  Private (Parent)
router.delete('/unlink-specialist', protect, authorize('parent'), async (req, res) => {
    try {
        const parent = await User.findById(req.user.id);

        if (!parent.linkedSpecialist) {
            return res.status(400).json({
                success: false,
                message: 'You are not linked to any specialist'
            });
        }

        const specialistId = parent.linkedSpecialist;

        // 1. Remove from parent's linkedSpecialist
        parent.linkedSpecialist = null;
        await parent.save();

        // 2. Remove from specialist's linkedParents
        await User.findByIdAndUpdate(specialistId, {
            $pull: { linkedParents: req.user.id }
        });

        res.json({
            success: true,
            message: 'Unlinked from specialist successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

module.exports = router;

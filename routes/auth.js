const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const { protect } = require('../middleware/auth');
const { sendVerificationEmail, sendPasswordResetEmail } = require('../services/emailService');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure uploads directory exists
const uploadDir = 'uploads';
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

// Multer Config
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/');
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: function (req, file, cb) {
        const filetypes = /jpeg|jpg|png|gif/;
        const mimetype = filetypes.test(file.mimetype);
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());

        if (mimetype && extname) {
            return cb(null, true);
        }
        cb(new Error('Only images are allowed!'));
    }
});


// Generate JWT token
const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRE
    });
};

// @route   POST /api/auth/register
// @desc    Register new user (parent or specialist)
// @access  Public
router.post('/register', async (req, res) => {
    try {
        const { name, email, password, role, phone, specialization, licenseNumber } = req.body;

        // Check if user exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: 'User already exists'
            });
        }

        // Generate 6-digit verification code
        const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();

        // Create user
        const user = await User.create({
            name,
            email,
            password,
            role,
            phone,
            specialization: role === 'specialist' ? specialization : undefined,
            licenseNumber: role === 'specialist' ? licenseNumber : undefined,
            verificationToken: verificationCode
        });

        // Send verification email
        try {
            await sendVerificationEmail(user.email, verificationCode);
            console.log('✅ Verification email sent successfully to:', user.email);
        } catch (emailError) {
            console.error('❌ Email sending failed during registration:', emailError.message);
            // Don't fail registration if email fails, but log it and continue
            // User can still resend verification later
        }

        const token = generateToken(user._id);

        res.status(201).json({
            success: true,
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                emailVerified: user.emailVerified
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// @route   POST /api/auth/login
// @desc    Login user
// @access  Public
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Please provide email and password'
            });
        }

        const user = await User.findOne({ email: email.toLowerCase() }).select('+password');

        if (!user || !(await user.comparePassword(password))) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }

        const token = generateToken(user._id);

        res.json({
            success: true,
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// @route   GET /api/auth/me
// @desc    Get current user
// @access  Private
router.get('/me', protect, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).populate('assignedChildren');
        res.json({
            success: true,
            user
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// @route   PUT /api/auth/profile
// @desc    Update user profile
// @access  Private
router.put('/profile', protect, upload.single('photo'), async (req, res) => {
    try {
        const { name, email, phone } = req.body;
        console.log('Update Profile Body:', req.body);
        console.log('Update Profile File:', req.file);

        const user = await User.findById(req.user.id);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Check if email is being changed and if it's already taken
        if (email && email !== user.email) {
            const existingUser = await User.findOne({ email });
            if (existingUser) {
                return res.status(400).json({
                    success: false,
                    message: 'Email already in use'
                });
            }
            user.email = email;
            user.emailVerified = false; // Require re-verification for new email
        }

        if (name) user.name = name;
        if (phone !== undefined) user.phone = phone;

        // Handle File Upload (save to profilePhoto)
        if (req.file) {
            // Store relative path (normalized to forward slashes)
            user.profilePhoto = req.file.path.replace(/\\/g, "/");
        }

        await user.save();

        res.json({
            success: true,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                phone: user.phone,
                emailVerified: user.emailVerified,
                profilePhoto: user.profilePhoto
            }
        });
    } catch (error) {
        console.error('Profile update error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// @route   PUT /api/auth/change-password
// @desc    Change user password
// @access  Private
router.put('/change-password', protect, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({
                success: false,
                message: 'Please provide current and new password'
            });
        }

        const user = await User.findById(req.user.id).select('+password');

        if (!(await user.comparePassword(currentPassword))) {
            return res.status(400).json({
                success: false,
                message: 'Current password is incorrect'
            });
        }

        user.password = newPassword;
        await user.save();

        res.json({
            success: true,
            message: 'Password changed successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// @route   POST /api/auth/forgot-password
// @desc    Send password reset email with 6-digit code
// @access  Public
router.post('/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({
                success: false,
                message: 'Please provide email'
            });
        }

        const user = await User.findOne({ email });

        if (!user) {
            // Don't reveal if email exists or not for security
            return res.json({
                success: true,
                message: 'If an account with that email exists, a password reset code has been sent'
            });
        }

        // Generate 6-digit reset code
        const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
        user.resetPasswordToken = resetCode;
        user.resetPasswordExpire = Date.now() + 10 * 60 * 1000; // 10 minutes

        await user.save();

        // Send reset email with code
        try {
            await sendPasswordResetEmail(user.email, resetCode);
            console.log('✅ Password reset email sent successfully to:', user.email);
        } catch (emailError) {
            console.error('❌ Email sending failed during password reset:', emailError.message);
            user.resetPasswordToken = undefined;
            user.resetPasswordExpire = undefined;
            await user.save();
            return res.status(500).json({
                success: false,
                message: 'Email could not be sent'
            });
        }

        res.json({
            success: true,
            message: 'Password reset code sent to your email'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// 🔑 @route POST /api/auth/verify-reset-token
// @desc    Verify if the 6-digit password reset token is valid and not expired
// @access  Public
router.post('/verify-reset-token', async (req, res) => {
    try {
        const { token } = req.body;

        if (!token) {
            return res.status(400).json({
                success: false,
                message: 'Reset token is required'
            });
        }

        const user = await User.findOne({
            resetPasswordToken: token,
            resetPasswordExpire: { $gt: Date.now() } // تحقق من عدم انتهاء الصلاحية
        });

        if (!user) {
            return res.status(400).json({
                success: false,
                message: 'Invalid or expired code.'
            });
        }

        // إذا تم العثور على المستخدم والرمز صالح:
        res.json({
            success: true,
            message: 'Token verified successfully.'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// @route   PUT /api/auth/reset-password
// @desc    Reset password with 6-digit code
// @access  Public
router.put('/reset-password', async (req, res) => {
    try {
        const { token, newPassword } = req.body;

        if (!token || !newPassword) {
            return res.status(400).json({
                success: false,
                message: 'Please provide code and new password'
            });
        }

        const user = await User.findOne({
            resetPasswordToken: token,
            resetPasswordExpire: { $gt: Date.now() }
        });

        if (!user) {
            // ملاحظة: هذا المسار لا يجب أن ينجح إذا تم بالفعل التحقق من الرمز في الخطوة السابقة، 
            // ولكن نتركه كفحص أمان أخير.
            return res.status(400).json({
                success: false,
                message: 'Invalid or expired code'
            });
        }

        user.password = newPassword;
        user.resetPasswordToken = undefined;
        user.resetPasswordExpire = undefined;
        await user.save();

        res.json({
            success: true,
            message: 'Password reset successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// @route   POST /api/auth/verify-email
// @desc    Verify email address
// @access  Public
router.post('/verify-email', async (req, res) => {
    try {
        const { token } = req.body;

        if (!token) {
            return res.status(400).json({
                success: false,
                message: 'Verification token is required'
            });
        }

        const user = await User.findOne({ verificationToken: token });

        if (!user) {
            return res.status(400).json({
                success: false,
                message: 'Invalid verification token'
            });
        }

        user.emailVerified = true;
        user.verificationToken = undefined;
        await user.save();

        res.json({
            success: true,
            message: 'Email verified successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// @route   POST /api/auth/resend-verification
// @desc    Resend verification email
// @access  Private
router.post('/resend-verification', protect, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        if (user.emailVerified) {
            return res.status(400).json({
                success: false,
                message: 'Email already verified'
            });
        }

        // Generate new 6-digit verification code
        const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
        user.verificationToken = verificationCode;
        await user.save();

        // Send verification email
        try {
            await sendVerificationEmail(user.email, verificationCode);
            console.log('✅ Verification email resent successfully to:', user.email);
        } catch (emailError) {
            console.error('❌ Email sending failed during resend:', emailError.message);
            return res.status(500).json({
                success: false,
                message: 'Email could not be sent'
            });
        }

        res.json({
            success: true,
            message: 'Verification email sent'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// @route   POST /api/auth/refresh-token
// @desc    Refresh JWT token
// @access  Private
router.post('/refresh-token', protect, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        const token = generateToken(user._id);

        res.json({
            success: true,
            token
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// @route   GET /api/auth/my-specialist
// @desc    Get linked specialist for the current parent
// @access  Private (Parent only)
router.get('/my-specialist', protect, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).populate({
            path: 'linkedSpecialist',
            select: 'name email phone specialization profilePhoto center',
            populate: {
                path: 'center',
                select: 'name_ar name_en'
            }
        });

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        if (!user.linkedSpecialist) {
            return res.status(404).json({
                success: false,
                message: 'No specialist linked to this account'
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

module.exports = router;
const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

function generateToken(userId) {
    return jwt.sign(
        { id: userId },
        process.env.JWT_SECRET,
        { expiresIn: "1d" }
    );
}

async function registerUser(req, res, next) {
    try {
        const { name, email, password, studentId } = req.body;

        if (
            typeof name !== "string" ||
            !name.trim() ||
            typeof email !== "string" ||
            !email.trim() ||
            typeof password !== "string" ||
            password.length < 8 ||
            typeof studentId !== "string" ||
            !studentId.trim()
        ) {
            return res.status(400).json({
                success: false,
                message: "Name, email, password (at least 8 characters), and student ID are required"
            });
        }

        const normalizedEmail = email.trim().toLowerCase();
        const normalizedStudentId = studentId.trim();

        const existingUser = await User.findOne({
            $or: [
                { email: normalizedEmail },
                { studentId: normalizedStudentId }
            ]
        });

        if (existingUser) {
            return res.status(409).json({
                success: false,
                message: "Email or student ID is already registered"
            });
        }

        const hashedPassword = await bcrypt.hash(password, 12);

        const user = await User.create({
            name: name.trim(),
            email: normalizedEmail,
            password: hashedPassword,
            studentId: normalizedStudentId,
            role: "student"
        });

        return res.status(201).json({
            success: true,
            message: "Student registered successfully",
            token: generateToken(user._id),
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                studentId: user.studentId,
                role: user.role
            }
        });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({
                success: false,
                message: "Email or student ID is already registered"
            });
        }

        return next(error);
    }
}

module.exports = registerUser;

const User = require("../models/User");
const bcrypt = require("bcryptjs");

async function createFacultyAccount(req, res, next) {
    try {
        const { name, email, password } = req.body;

        if (
            typeof name !== "string" ||
            !name.trim() ||
            typeof email !== "string" ||
            !email.trim() ||
            typeof password !== "string" ||
            password.length < 8
        ) {
            return res.status(400).json({
                success: false,
                message: "Name, email, and a password of at least 8 characters are required"
            });
        }

        const normalizedEmail = email.trim().toLowerCase();

        const existingUser = await User.findOne({
            email: normalizedEmail
        });

        if (existingUser) {
            return res.status(409).json({
                success: false,
                message: "This email is already registered"
            });
        }

        const hashedPassword = await bcrypt.hash(password, 12); // we selected the cost factor of salt as 12

        const faculty = await User.create({
            name: name.trim(),
            email: normalizedEmail,
            password: hashedPassword,
            role: "faculty",
            studentId: null
        });

        return res.status(201).json({
            success: true,
            message: "Faculty account created successfully",
            faculty: {
                id: faculty._id,
                name: faculty.name,
                email: faculty.email,
                role: faculty.role,
                isActive: faculty.isActive
            }
        });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({
                success: false,
                message: "This email is already registered"
            });
        }

        return next(error);
    }
}

async function getAllFaculty(req, res, next) {
    try {
        const facultyMembers = await User.find({
            role: "faculty"
        })
            .select("name email role isActive")
            .sort({ name: 1 });

        return res.status(200).json({
            success: true,
            count: facultyMembers.length,
            facultyMembers
        });
    } catch (error) {
        return next(error);
    }
}

module.exports = {
    createFacultyAccount,
    getAllFaculty
};

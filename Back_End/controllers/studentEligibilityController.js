const mongoose = require("mongoose");
const User = require("../models/User");

async function getAllStudents(req, res, next) {
    try {
        const students = await User.find({
            role: "student"
        })
            .select("name email studentId role isActive transportEligibility")
            .sort({ name: 1 });

        return res.status(200).json({
            success: true,
            count: students.length,
            students
        });
    } catch (error) {
        return next(error);
    }
}

async function updateStudentEligibility(req, res, next) {
    try {
        const { id } = req.params;
        const { isEligible, semester } = req.body;

        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid student ID"
            });
        }

        if (typeof isEligible !== "boolean") {
            return res.status(400).json({
                success: false,
                message: "Eligibility status must be true or false"
            });
        }

        if (
            typeof semester !== "string" ||
            !semester.trim()
        ) {
            return res.status(400).json({
                success: false,
                message: "Semester is required"
            });
        }

        const student = await User.findOne({
            _id: id,
            role: "student"
        });

        if (!student) {
            return res.status(404).json({
                success: false,
                message: "Student not found"
            });
        }

        student.transportEligibility = {
            isEligible: isEligible,
            semester: semester.trim(),
            validUntil: null
        };

        await student.save();

        return res.status(200).json({
            success: true,
            message: isEligible
                ? "Student transport eligibility approved successfully"
                : "Student transport eligibility marked as not eligible",
            student: {
                id: student._id,
                name: student.name,
                email: student.email,
                studentId: student.studentId,
                transportEligibility: student.transportEligibility
            }
        });
    } catch (error) {
        return next(error);
    }
}

module.exports = {
    getAllStudents,
    updateStudentEligibility
};
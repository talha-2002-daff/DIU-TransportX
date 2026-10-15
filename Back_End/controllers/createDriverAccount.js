const User = require("../models/User");
const bcrypt = require("bcryptjs");

async function createDriverAccount(req, res, next) {
    try {
        const { name, email, password } = req.body;

        if (
            typeof name !== "string" ||
            !name.trim() ||
            typeof email !== "string" ||
            !email.trim() ||
            typeof password !== "string" ||
            password.length < 8 ||
            !/[A-Za-z]/.test(password) ||
            !/[0-9]/.test(password) ||
            !/[^A-Za-z0-9\s]/.test(password)
        ) {
            return res.status(400).json({
                success: false,
                message: "Provide a name, valid email, and password with at least 8 characters, one letter, one number, and one special character."
            });
        }

        const normalizedEmail = email.trim().toLowerCase();

        const existingUser = await User.findOne({
            email: normalizedEmail
        });

        if (existingUser) {
            return res.status(409).json({
                success: false,
                message: "This email is already registered."
            });
        }

        const hashedPassword = await bcrypt.hash(password, 12);

        const driver = await User.create({
            name: name.trim(),
            email: normalizedEmail,
            password: hashedPassword,
            studentId: null,
            role: "driver"
        });

        return res.status(201).json({
            success: true,
            message: "Driver account created successfully.",
            driver: {
                id: driver._id,
                name: driver.name,
                email: driver.email,
                studentId: driver.studentId,
                role: driver.role
            }
        });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({
                success: false,
                message: "This email is already registered."
            });
        }

        return next(error);
    }
}

module.exports = createDriverAccount;
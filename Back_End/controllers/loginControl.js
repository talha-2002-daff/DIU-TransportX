
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

async function loginUser(req, res, next) {
    try {
        const { email, password } = req.body;
        const errors = {};

        if (typeof email !== "string" || !email.trim()) {
            errors.email = "Email is required";
        }

        if (typeof password !== "string" || !password) {
            errors.password = "Password is required";
        }

        if (Object.keys(errors).length > 0) {
            return res.status(400).json({
                success: false,
                message: "Validation failed",
                errors: errors
            });
        }

        const normalizedEmail = email.trim().toLowerCase();

        const user = await User.findOne({
            email: normalizedEmail
        }).select("+password");

        if (
            !user ||
            !(await bcrypt.compare(password, user.password))
        ) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password"
            });
        }

        if (!user.isActive) {
            return res.status(403).json({
                success: false,
                message: "This account is inactive"
            });
        }

        const token = generateToken(user._id); // the tocken is here

        res.cookie("transportx_token", token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production", // not in the localStrorage, rather in the cookie
            sameSite: "lax",
            maxAge: 24 * 60 * 60 * 1000,
            path: "/"
        });

        return res.status(200).json({
            success: true,
            message: "Login successful",
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                studentId: user.studentId,
                role: user.role
            }
        });
    } catch (error) {
        return next(error);
    }
}

module.exports = loginUser;

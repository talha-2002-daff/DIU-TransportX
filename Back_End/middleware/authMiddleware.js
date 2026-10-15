
const jwt = require("jsonwebtoken");
const User = require("../models/User");

async function authMiddleware(req, res, next) {
    try {
        const token = req.cookies?.transportx_token;

        if (!token) {
            return res.status(401).json({
                success: false,
                message: "Authentication cookie is required"
            });
        }

        let decoded;

        try {
            decoded = jwt.verify(token, process.env.JWT_SECRET);
        } catch (error) {
            return res.status(401).json({
                success: false,
                message: "Invalid or expired token"
            });
        }

        const user = await User.findById(decoded.id);

        if (!user) {
            return res.status(401).json({
                success: false,
                message: "User account not found"
            });
        }

        if (!user.isActive) {
            return res.status(403).json({
                success: false,
                message: "This account is inactive"
            });
        }

        req.user = {
            id: user._id,
            name: user.name,
            email: user.email,
            studentId: user.studentId,
            role: user.role
        };

        return next();
    } catch (error) {
        return next(error);
    }
}

module.exports = authMiddleware;

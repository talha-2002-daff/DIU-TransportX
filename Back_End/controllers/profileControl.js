const getCurrentUser = (req, res) => {
    return res.status(200).json({
        success: true,
        message: "Authenticated user retrieved successfully",
        user: req.user
    });
};

module.exports = getCurrentUser;
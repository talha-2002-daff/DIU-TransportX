
function logoutUser(req, res) {
    res.clearCookie("transportx_token", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/"
    });

    return res.status(200).json({
        success: true,
        message: "Logout successful"
    });
}

module.exports = logoutUser;

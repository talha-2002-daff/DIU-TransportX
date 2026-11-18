
const getStudentDashboard = (req, res) => {
    return res.status(200).json({
        success: true,
        message: "Student dashboard accessed successfully",
        user: req.user
    });
};

const getDriverDashboard = (req, res) => {
    return res.status(200).json({
        success: true,
        message: "Driver dashboard accessed successfully",
        user: req.user
    });
};

const getAdminDashboard = (req, res) => {
    return res.status(200).json({
        success: true,
        message: "Transport admin dashboard accessed successfully",
        user: req.user
    });
};

const getFacultyDashboard = (req, res) => {
    return res.status(200).json({
        success: true,
        message: "Faculty dashboard accessed successfully",
        user: req.user
    });
};

module.exports = {
    getStudentDashboard,
    getDriverDashboard,
    getAdminDashboard,
    getFacultyDashboard
};

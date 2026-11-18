
const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

const {
    getStudentDashboard,
    getDriverDashboard,
    getAdminDashboard,
    getFacultyDashboard
} = require("../controllers/dashboardControl");

router.get("/student", authMiddleware, roleMiddleware("student"), getStudentDashboard);

router.get("/driver", authMiddleware, roleMiddleware("driver"), getDriverDashboard);

router.get("/admin", authMiddleware, roleMiddleware("admin"), getAdminDashboard);

router.get("/faculty", authMiddleware, roleMiddleware("faculty"), getFacultyDashboard);

module.exports = router;

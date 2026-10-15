
const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

const {
    createBus,
    getAllBuses,
    getBusById,
    updateBus,
    deactivateBus
} = require("../controllers/busController"); // admin functionality

const {
    assignDriver,
    updateBusLocation,
    getAssignedBus
} = require("../controllers/driverController"); // admin functionality

const {
    getStudentBusInformation
} = require("../controllers/studentController");

function allowStudentOrFaculty(req, res, next) {
    if (req.user.role !== "student" && req.user.role !== "faculty") {
        return res.status(403).json({
            success: false,
            message: "Access denied. Student or faculty access is required."
        });
    }

    return next();
}

router.post(
    "/",
    authMiddleware,
    roleMiddleware("admin"),
    createBus
);

router.get(
    "/",
    authMiddleware,
    getAllBuses
);

router.patch(
    "/:id/assign-driver",
    authMiddleware,
    roleMiddleware("admin"),
    assignDriver
);

router.patch(
    "/:id/location",
    authMiddleware,
    roleMiddleware("driver"),
    updateBusLocation
);

router.get(
    "/driver/assigned-bus",
    authMiddleware,
    roleMiddleware("driver"),
    getAssignedBus
);

router.get(
    "/student/information",
    authMiddleware,
    allowStudentOrFaculty,
    getStudentBusInformation
);

router.patch(
    "/:id",
    authMiddleware,
    roleMiddleware("admin"),
    updateBus
);

router.patch(
    "/:id/deactivate",
    authMiddleware,
    roleMiddleware("admin"),
    deactivateBus
);

router.get(
    "/:id",
    authMiddleware,
    getBusById
);

module.exports = router;

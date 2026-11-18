const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

const {
    getAllStudents,
    updateStudentEligibility
} = require("../controllers/studentEligibilityController");

router.get(
    "/students",
    authMiddleware,
    roleMiddleware("admin"),
    getAllStudents
);

router.patch(
    "/students/:id/transport-eligibility",
    authMiddleware,
    roleMiddleware("admin"),
    updateStudentEligibility 
);

module.exports = router;
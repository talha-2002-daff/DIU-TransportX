
const express = require("express");
const router = express.Router();

const registerUser = require("../controllers/registrationControl");
const loginUser = require("../controllers/loginControl");
const logoutUser = require("../controllers/logoutControl");
const getCurrentUser = require("../controllers/profileControl");

const {
    createDriverAccount,
    getAllDrivers
} = require("../controllers/driverAccountController");

const {
    createFacultyAccount,
    getAllFaculty
} = require("../controllers/facultyAccountController");

const validateRegistration = require("../middleware/validateRegistration");
const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

router.post(
    "/register",
    validateRegistration,
    registerUser
);

router.post(
    "/login",
    loginUser
);

router.post(
    "/logout",
    logoutUser
);

router.get(
    "/me",
    authMiddleware,
    getCurrentUser
);

router.get(
    "/drivers",
    authMiddleware,
    roleMiddleware("admin"),
    getAllDrivers
);

router.post(
    "/drivers",
    authMiddleware,
    roleMiddleware("admin"),
    createDriverAccount
);

router.get(
    "/faculty",
    authMiddleware,
    roleMiddleware("admin"),
    getAllFaculty
);

router.post(
    "/faculty",
    authMiddleware,
    roleMiddleware("admin"),
    createFacultyAccount
);

module.exports = router;

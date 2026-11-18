require("dotenv").config();

const mongoose = require("mongoose");
const User = require("../models/User");
const connectDB = require("../config/db");

const createDriver = async () => {
    try {
        await connectDB();

        const email = process.env.DRIVER_EMAIL;

        if (!email) {
            throw new Error("DRIVER_EMAIL is missing from .env");
        }

        const user = await User.findOne({
            email: email.trim().toLowerCase()
        });

        if (!user) {
            throw new Error("User not found. Register the account first.");
        }

        if (user.role === "admin") {
            throw new Error("Cannot change an admin account to a driver.");
        }

        user.role = "driver";
        user.studentId = null;

        await user.save();

        console.log("Driver role assigned successfully");
    } catch (error) {
        console.error(error.message);
        process.exitCode = 1;
    } finally {
        await mongoose.disconnect();
    }
};

createDriver();
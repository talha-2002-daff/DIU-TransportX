require("dotenv").config();

const mongoose = require("mongoose");
const User = require("../models/User");
const connectDB = require("../config/db");

const createAdmin = async () => {
    try {
        await connectDB();

        const email = process.env.ADMIN_EMAIL;

        if (!email) {
            throw new Error("Admin email is missing from .env");
        }

        const user = await User.findOne({
            email: email.toLowerCase()
        });

        if (!user) {
            throw new Error(
                "User not found. Register this account first."
            );
        }

        user.role = "admin";
        await user.save();

        console.log("Admin role assigned successfully");
    } catch (error) {
        console.error(error.message);
    } finally {
        await mongoose.disconnect();
    }
};

createAdmin();
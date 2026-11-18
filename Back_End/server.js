const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const dotenv = require("dotenv");

const connectDB = require("./config/db");

const authRoutes = require("./routers/authRoutes");
const dashboardRoutes = require("./routers/dashboardRoutes");
const busRoutes = require("./routers/busRoutes");
const destinationRoutes = require("./routers/destinationRoutes");
const adminRoutes = require("./routers/adminRoutes");

dotenv.config();

const app = express();

app.use(
    cors({
        origin: "http://localhost:5173",
        credentials: true
    })
);

app.use(express.json());
app.use(cookieParser());

app.use("/api/auth", authRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/buses", busRoutes);
app.use("/api/destinations", destinationRoutes);
app.use("/api/admin", adminRoutes);

app.use(function (req, res) {
    res.status(404).json({
        success: false,
        message: "API route not found"
    });
});

app.use(function (error, req, res, next) {
    console.error(error);

    const statusCode = error.statusCode || 500;

    res.status(statusCode).json({
        success: false,
        message: error.message || "Internal server error"
    });
});

const PORT = process.env.PORT || 5000;

async function startServer() {
    try {
        await connectDB();

        app.listen(PORT, function () {
            console.log(`Server is running on port ${PORT}`);
        });
    } catch (error) {
        console.error("Failed to start server:", error.message);
        process.exit(1);
    }
}

startServer();
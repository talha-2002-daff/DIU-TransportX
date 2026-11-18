
require("dotenv").config();

const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const mongoose = require("mongoose");
const crypto = require("crypto");
const Bus = require("../models/Bus");

async function generateBusQrTokens() {
    try {
        await mongoose.connect(process.env.MONGO_URI);

        console.log("MongoDB connected successfully");

        const buses = await Bus.find({
            $or: [
                { qrToken: { $exists: false } },
                { qrToken: null },
                { qrToken: "" }
            ]
        }).select("+qrToken");

        if (buses.length === 0) {
            console.log("All buses already have QR tokens");
            return;
        }

        for (const bus of buses) {
            bus.qrToken = crypto.randomBytes(32).toString("hex");

            await bus.save();

            console.log(
                `QR token generated successfully for bus: ${bus.busNumber}`
            );
        }

        console.log("--------------------------------");
        console.log(`Total buses updated: ${buses.length}`);
        console.log("QR token generation completed successfully");

    } catch (error) {
        console.error("QR token generation failed:", error.message);

    } finally {
        if (mongoose.connection.readyState !== 0) {
            await mongoose.disconnect();
            console.log("MongoDB disconnected");
        }
    }
}

generateBusQrTokens();
// As the previous busses have to token so i made this to get the access of the Db and generte token for all busses
const mongoose = require("mongoose");
const Bus = require("../models/Bus");
const User = require("../models/User");

const VALID_BAYS = [
    "A1", "A2", "A3", "A4", "A5",
    "B1", "B2", "B3", "B4", "B5",
    "C1", "C2", "C3", "C4", "C5"
];

async function assignDriver(req, res, next) {
    try {
        const busId = req.params.id;
        const driverId = req.body.driverId;

        if (!mongoose.Types.ObjectId.isValid(busId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid bus ID."
            });
        }

        if (!driverId || !mongoose.Types.ObjectId.isValid(driverId)) {
            return res.status(400).json({
                success: false,
                message: "A valid driver ID is required."
            });
        }

        const bus = await Bus.findOne({
            _id: busId,
            isActive: true
        });

        if (!bus) {
            return res.status(404).json({
                success: false,
                message: "Active bus not found."
            });
        }

        const driver = await User.findOne({
            _id: driverId,
            role: "driver",
            isActive: true
        });

        if (!driver) {
            return res.status(404).json({
                success: false,
                message: "Active driver not found."
            });
        }

        bus.assignedDriver = driver._id;
        await bus.save();

        return res.status(200).json({
            success: true,
            message: "Driver assigned successfully.",
            bus: bus
        });
    } catch (error) {
        return next(error);
    }
}

async function updateBusLocation(req, res, next) {
    try {
        const busId = req.params.id;
        const currentLocation = req.body.currentLocation;
        const mapLocation = req.body.mapLocation;

        if (!mongoose.Types.ObjectId.isValid(busId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid bus ID."
            });
        }

        if (
            typeof currentLocation !== "string" ||
            !currentLocation.trim()
        ) {
            return res.status(400).json({
                success: false,
                message: "Current location is required."
            });
        }

        if (!mapLocation || typeof mapLocation !== "object") {
            return res.status(400).json({
                success: false,
                message: "A parking bay selection is required."
            });
        }

        if (
            typeof mapLocation.bayId !== "string" ||
            !VALID_BAYS.includes(mapLocation.bayId.trim().toUpperCase())
        ) {
            return res.status(400).json({
                success: false,
                message: "Select a valid parking bay from A1 to C5."
            });
        }

        const bayId = mapLocation.bayId.trim().toUpperCase();

        const bus = await Bus.findOne({
            _id: busId,
            isActive: true,
            assignedDriver: req.user.id
        });

        if (!bus) {
            return res.status(404).json({
                success: false,
                message: "No active bus assigned to your driver account was found."
            });
        }

        const existingBus = await Bus.findOne({
            _id: { $ne: bus._id },
            isActive: true,
            "mapLocation.bayId": bayId
        });

        if (existingBus) {
            return res.status(409).json({
                success: false,
                message: `Parking bay ${bayId} is already assigned to bus ${existingBus.busNumber}.`
            });
        }

        if (!bus.mapLocation) {
            bus.mapLocation = {};
        }

        bus.currentLocation = currentLocation.trim();
        bus.mapLocation.bayId = bayId;
        bus.mapLocation.x = null;
        bus.mapLocation.y = null;
        bus.mapLocation.label = `Parking Bay ${bayId}`;
        bus.mapLocation.updatedAt = new Date();

        await bus.save();

        return res.status(200).json({
            success: true,
            message: `Bus location updated to parking bay ${bayId}.`,
            bus: bus
        });
    } catch (error) {
        return next(error);
    }
}

async function getAssignedBus(req, res, next) {
    try {
        const bus = await Bus.findOne({
            assignedDriver: req.user.id,
            isActive: true
        });

        if (!bus) {
            return res.status(404).json({
                success: false,
                message: "No active bus is assigned to your account."
            });
        }

        return res.status(200).json({
            success: true,
            bus: bus
        });
    } catch (error) {
        return next(error);
    }
}

module.exports = {
    assignDriver,
    updateBusLocation,
    getAssignedBus
};
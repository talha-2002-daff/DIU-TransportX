
const mongoose = require("mongoose");
const Bus = require("../models/Bus");
const User = require("../models/User");
const Boarding = require("../models/Boarding");

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


// map location controlling machinism
async function updateBusLocation(req, res, next) {
    try {
        const busId = req.params.id;
        const mapLocation = req.body.mapLocation;

        if (!mongoose.Types.ObjectId.isValid(busId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid bus ID."
            });
        }

        if (!mapLocation || typeof mapLocation !== "object") {
            return res.status(400).json({
                success: false,
                message: "Location information is required."
            });
        }

        if (typeof mapLocation.isLocationSharing !== "boolean") {
            return res.status(400).json({
                success: false,
                message: "Location sharing status is required."
            });
        }

        const bus = await Bus.findOne({
            _id: busId,
            isActive: true,
            assignedDriver: req.user.id
        }).populate("destination", "name");

        if (!bus) {
            return res.status(404).json({
                success: false,
                message: "No active bus assigned to your driver account was found."
            });
        }

        if (!bus.mapLocation) {
            bus.mapLocation = {};
        }

        if (!mapLocation.isLocationSharing) {
            bus.mapLocation.status = "offline";
            bus.mapLocation.direction = null;
            bus.mapLocation.isLocationSharing = false;
            bus.mapLocation.updatedAt = new Date();
            bus.currentLocation = "Location sharing stopped";

            await bus.save();

            return res.status(200).json({
                success: true,
                message: "Bus location sharing stopped.",
                bus: bus
            });
        }

        const latitude = Number(mapLocation.latitude);
        const longitude = Number(mapLocation.longitude);
        const status = mapLocation.status;
        const direction = mapLocation.direction;

        if (
            mapLocation.latitude === undefined ||
            mapLocation.latitude === null ||
            mapLocation.longitude === undefined ||
            mapLocation.longitude === null ||
            !Number.isFinite(latitude) ||
            !Number.isFinite(longitude) ||
            latitude < -90 ||
            latitude > 90 ||
            longitude < -180 ||
            longitude > 180
        ) {
            return res.status(400).json({
                success: false,
                message: "Valid GPS coordinates are required."
            });
        }

        if (!["parked", "on_route"].includes(status)) {
            return res.status(400).json({
                success: false,
                message: "Status must be parked or on_route."
            });
        }

        if (
            status === "on_route" &&
            !["to_diu", "from_diu"].includes(direction)
        ) {
            return res.status(400).json({
                success: false,
                message: "Select a valid route direction."
            });
        }

        if (
            status === "parked" &&
            direction !== null &&
            direction !== undefined &&
            !["to_diu", "from_diu"].includes(direction)
        ) {
            return res.status(400).json({
                success: false,
                message: "Invalid route direction."
            });
        }

        bus.mapLocation.latitude = latitude;
        bus.mapLocation.longitude = longitude;
        bus.mapLocation.status = status;
        bus.mapLocation.direction = direction || null;
        bus.mapLocation.isLocationSharing = true;
        bus.mapLocation.bayId = null;
        bus.mapLocation.x = null;
        bus.mapLocation.y = null;

        if (status === "parked") {
            bus.mapLocation.label = "Bus parked at current GPS location";
        } else if (direction === "to_diu") {
            bus.mapLocation.label = "Bus travelling towards DIU";
        } else {
            bus.mapLocation.label = "Bus travelling from DIU";
        }

        bus.mapLocation.updatedAt = new Date();
        bus.currentLocation = bus.mapLocation.label;

        await bus.save();

        return res.status(200).json({
            success: true,
            message: "Bus GPS location updated successfully.",
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
        }).populate("destination", "name");

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


// Boarding is controlled here for the driver account
async function getDriverBoardings(req, res, next) {
    try {
        const bus = await Bus.findOne({
            assignedDriver: req.user.id,
            isActive: true
        }).select("_id busNumber busName studentOccupancy totalSeats reservedSeats");

        if (!bus) {
            return res.status(404).json({
                success: false,
                message: "No active bus is assigned to your account."
            });
        }

        const boardings = await Boarding.find({
            bus: bus._id
        })
            .populate("student", "name studentId")
            .sort({ boardedAt: -1 });

        return res.status(200).json({
            success: true,
            bus: bus,
            count: boardings.length,
            boardings: boardings.map(function (boarding) {
                return {
                    id: boarding._id,
                    studentName: boarding.student.name,
                    studentId: boarding.student.studentId,
                    boardedAt: boarding.boardedAt
                };
            })
        });
    } catch (error) {
        return next(error);
    }
}


// The driver can clear the completed trip before starting the next one.
async function clearDriverBoardings(req, res, next) {
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

        // Only remove boarding records belonging to this driver's assigned bus.
        const result = await Boarding.deleteMany({
            bus: bus._id
        });

        // The next trip starts with an empty student seat count.
        bus.studentOccupancy = 0;
        await bus.save();

        return res.status(200).json({
            success: true,
            message: "Boarding records cleared successfully.",
            deletedCount: result.deletedCount,
            bus: bus
        });
    } catch (error) {
        return next(error);
    }
}

module.exports = {
    assignDriver,
    updateBusLocation,
    getAssignedBus,
    getDriverBoardings,
    clearDriverBoardings
};

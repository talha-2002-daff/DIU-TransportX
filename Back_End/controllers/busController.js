const mongoose = require("mongoose");
const Bus = require("../models/Bus");

async function createBus(req, res, next) {
    try {
        const {
            busNumber,
            busName,
            route,
            pickupPoints,
            departureTime,
            totalSeats,
            assignedDriver,
            currentLocation
        } = req.body;

        if (
            typeof busNumber !== "string" ||
            !busNumber.trim() ||
            typeof busName !== "string" ||
            !busName.trim() ||
            typeof route !== "string" ||
            !route.trim() ||
            typeof departureTime !== "string" ||
            !departureTime.trim() ||
            !Number.isInteger(totalSeats) ||
            totalSeats < 7
        ) {
            return res.status(400).json({
                success: false,
                message: "Please provide valid bus details"
            });
        }

        if (
            pickupPoints !== undefined &&
            (!Array.isArray(pickupPoints) ||
                !pickupPoints.every(function (point) {
                    return typeof point === "string" && point.trim();
                }))
        ) {
            return res.status(400).json({
                success: false,
                message: "Pickup points must be an array of non-empty strings"
            });
        }

        const bus = await Bus.create({
            busNumber: busNumber.trim(),
            busName: busName.trim(),
            route: route.trim(),
            pickupPoints: (pickupPoints || []).map(function (point) {
                return point.trim();
            }),
            departureTime: departureTime.trim(),
            totalSeats,
            currentLocation:
                typeof currentLocation === "string" && currentLocation.trim()
                    ? currentLocation.trim()
                    : "Location not updated"
        });

        return res.status(201).json({
            success: true,
            message: "Bus created successfully",
            bus
        });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({
                success: false,
                message: "A bus with this bus number already exists"
            });
        }

        if (error.name === "ValidationError") {
            return res.status(400).json({
                success: false,
                message: "Bus validation failed",
                errors: Object.values(error.errors).map(function (item) {
                    return item.message;
                })
            });
        }

        return next(error);
    }
}

async function getAllBuses(req, res, next) {
    try {
        const buses = await Bus.find({ isActive: true })
            .populate("assignedDriver", "name email")
            .sort({ busNumber: 1 });

        return res.status(200).json({
            success: true,
            count: buses.length,
            buses
        });
    } catch (error) {
        return next(error);
    }
}

async function getBusById(req, res, next) {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid bus ID"
            });
        }

        const bus = await Bus.findOne({
            _id: req.params.id,
            isActive: true
        }).populate("assignedDriver", "name email");

        if (!bus) {
            return res.status(404).json({
                success: false,
                message: "Bus not found"
            });
        }

        return res.status(200).json({
            success: true,
            bus
        });
    } catch (error) {
        return next(error);
    }
}

async function updateBus(req, res, next) {
    try {
        const { id } = req.params;

        const allowedFields = [
            "busNumber",
            "busName",
            "route",
            "pickupPoints",
            "departureTime",
            "totalSeats"
        ];

        const updates = {};

        for (const field of allowedFields) {
            if (Object.prototype.hasOwnProperty.call(req.body, field)) {
                updates[field] = req.body[field];
            }
        }

        if (Object.keys(updates).length === 0) {
            return res.status(400).json({
                success: false,
                message: "Please provide at least one valid field to update"
            });
        }

        if (
            updates.busNumber !== undefined &&
            (typeof updates.busNumber !== "string" ||
                !updates.busNumber.trim())
        ) {
            return res.status(400).json({
                success: false,
                message: "Please provide a valid bus number"
            });
        }

        if (
            updates.busName !== undefined &&
            (typeof updates.busName !== "string" ||
                !updates.busName.trim())
        ) {
            return res.status(400).json({
                success: false,
                message: "Please provide a valid bus name"
            });
        }

        if (
            updates.route !== undefined &&
            (typeof updates.route !== "string" ||
                !updates.route.trim())
        ) {
            return res.status(400).json({
                success: false,
                message: "Please provide a valid route"
            });
        }

        if (
            updates.departureTime !== undefined &&
            (typeof updates.departureTime !== "string" ||
                !updates.departureTime.trim())
        ) {
            return res.status(400).json({
                success: false,
                message: "Please provide a valid departure time"
            });
        }

        if (
            updates.pickupPoints !== undefined &&
            (!Array.isArray(updates.pickupPoints) ||
                !updates.pickupPoints.every(function (point) {
                    return typeof point === "string" && point.trim();
                }))
        ) {
            return res.status(400).json({
                success: false,
                message: "Pickup points must be an array of non-empty strings"
            });
        }

        if (
            updates.totalSeats !== undefined &&
            (!Number.isInteger(updates.totalSeats) ||
                updates.totalSeats < 7)
        ) {
            return res.status(400).json({
                success: false,
                message: "Total seats must be a whole number of at least 7"
            });
        }

        for (const field of Object.keys(updates)) {
            if (typeof updates[field] === "string") {
                updates[field] = updates[field].trim();
            }
        }

        if (updates.pickupPoints !== undefined) {
            updates.pickupPoints = updates.pickupPoints.map(
                function (point) {
                    return point.trim();
                }
            );
        }

        const bus = await Bus.findOne({
            _id: id,
            isActive: true
        });

        if (!bus) {
            return res.status(404).json({
                success: false,
                message: "Bus not found"
            });
        }

        if (
            updates.totalSeats !== undefined &&
            updates.totalSeats - bus.reservedSeats < bus.studentOccupancy
        ) {
            return res.status(400).json({
                success: false,
                message: "Total seats cannot be lower than current occupancy plus reserved seats"
            });
        }

        Object.assign(bus, updates);

        await bus.save();

        return res.status(200).json({
            success: true,
            message: "Bus information updated successfully",
            bus
        });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({
                success: false,
                message: "A bus with this bus number already exists"
            });
        }

        if (error.name === "ValidationError") {
            return res.status(400).json({
                success: false,
                message: "Bus validation failed",
                errors: Object.values(error.errors).map(function (item) {
                    return item.message;
                })
            });
        }

        return next(error);
    }
}

async function deactivateBus(req, res, next) {
    try {
        const { id } = req.params;

        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid bus ID"
            });
        }

        const bus = await Bus.findOne({
            _id: id,
            isActive: true
        });

        if (!bus) {
            return res.status(404).json({
                success: false,
                message: "Active bus not found"
            });
        }

        bus.isActive = false;

        await bus.save();

        return res.status(200).json({
            success: true,
            message: "Bus deactivated successfully",
            bus
        });
    } catch (error) {
        return next(error);
    }
}

module.exports = {
    createBus,
    getAllBuses,
    getBusById,
    updateBus,
    deactivateBus
};
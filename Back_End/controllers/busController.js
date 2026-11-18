
const mongoose = require("mongoose");
const QRCode = require("qrcode");
const Bus = require("../models/Bus");
const Destination = require("../models/Destination");
const User = require("../models/User");
const Boarding = require("../models/Boarding");

async function createBus(req, res, next) {
    try {
        const {
            busNumber,
            busName,
            destination,
            pickupPoints,
            departureTime,
            totalSeats,
            currentLocation
        } = req.body;

        if (
            typeof busNumber !== "string" ||
            !busNumber.trim() ||
            typeof busName !== "string" ||
            !busName.trim() ||
            typeof destination !== "string" ||
            !mongoose.isValidObjectId(destination) ||
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

        const selectedDestination = await Destination.findOne({
            _id: destination,
            isActive: true
        });

        if (!selectedDestination) {
            return res.status(404).json({
                success: false,
                message: "Selected destination was not found or is inactive"
            });
        }

        const bus = await Bus.create({
            busNumber: busNumber.trim(),
            busName: busName.trim(),
            destination: selectedDestination._id,
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

        await bus.populate("destination", "name");

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
            .populate("destination", "name")
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
        })
            .populate("assignedDriver", "name email")
            .populate("destination", "name");

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

async function getBusQrCode(req, res, next) {
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
        }).select("+qrToken");

        if (!bus) {
            return res.status(404).json({
                success: false,
                message: "Active bus not found"
            });
        }

        if (!bus.qrToken) {
            return res.status(404).json({
                success: false,
                message: "QR token not found for this bus"
            });
        }

        const qrCodeImage = await QRCode.toDataURL(bus.qrToken); // generating the image receiving the token

        return res.status(200).json({
            success: true,
            message: "Bus QR code generated successfully",
            busNumber: bus.busNumber,
            qrCode: qrCodeImage
        });
    } catch (error) {
        return next(error);
    }
}

async function verifyBusQrToken(req, res, next) { // for the varification when the student scan the QR code
    let occupancyUpdated = false;
    let busId = null;

    try {
        const { token } = req.body;

        if (
            typeof token !== "string" ||
            !/^[a-f0-9]{64}$/i.test(token.trim())
        ) {
            return res.status(400).json({
                success: false,
                message: "Invalid QR code"
            });
        }

        const bus = await Bus.findOne({
            qrToken: token.trim(),
            isActive: true
        })
            .select("_id busNumber busName destination totalSeats reservedSeats studentOccupancy")
            .populate("destination", "name");

        if (!bus) {
            return res.status(404).json({
                success: false,
                message: "Invalid QR code or inactive bus"
            });
        }

        busId = bus._id;

        const student = await User.findById(req.user.id)
            .select("name studentId transportEligibility");

        if (!student) {
            return res.status(404).json({
                success: false,
                message: "Student account not found"
            });
        }

        const eligibility = student.transportEligibility;

        if (!eligibility || !eligibility.isEligible) {
            return res.status(403).json({
                success: false,
                message: "Your transport registration has not been approved by the admin"
            });
        }

        if (
            eligibility.validUntil &&
            new Date(eligibility.validUntil).getTime() < Date.now()
        ) {
            return res.status(403).json({
                success: false,
                message: "Your transport eligibility has expired. Please contact the transport admin"
            });
        }

        // Creating a boarding record after successful QR and eligibility verification
        const boarding = await Boarding.create({
            student: student._id,
            bus: bus._id
        });

        // Updating occupancy only when student seats are available
        const updatedBus = await Bus.findOneAndUpdate(
            {
                _id: bus._id,
                isActive: true,
                $expr: {
                    $lt: [
                        "$studentOccupancy",
                        {
                            $subtract: [
                                "$totalSeats",
                                "$reservedSeats"
                            ]
                        }
                    ]
                }
            },
            {
                $inc: {
                    studentOccupancy: 1
                }
            },
            {
                new: true
            }
        ).populate("destination", "name");

        if (!updatedBus) {
            await Boarding.findByIdAndDelete(boarding._id);

            return res.status(409).json({
                success: false,
                message: "No student seats are available on this bus"
            });
        }

        occupancyUpdated = true;

        return res.status(200).json({
            success: true,
            message: "Boarding verified successfully",
            bus: updatedBus,
            boarding: {
                id: boarding._id,
                studentName: student.name,
                boardedAt: boarding.boardedAt
            },
            occupancy: {
                studentCapacity:
                    updatedBus.totalSeats - updatedBus.reservedSeats,
                studentOccupancy: updatedBus.studentOccupancy,
                availableStudentSeats: Math.max(
                    0,
                    updatedBus.totalSeats -
                    updatedBus.reservedSeats -
                    updatedBus.studentOccupancy
                )
            },
            eligibility: {
                isEligible: eligibility.isEligible,
                semester: eligibility.semester,
                validUntil: eligibility.validUntil
            }
        });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({
                success: false,
                message: "You have already boarded this bus"
            });
        }

        if (occupancyUpdated && busId) {
            await Bus.updateOne(
                { _id: busId },
                { $inc: { studentOccupancy: -1 } }
            );
        }

        return next(error);
    }
}

async function updateBus(req, res, next) {
    try {
        const { id } = req.params;

        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid bus ID"
            });
        }

        const allowedFields = [
            "busNumber",
            "busName",
            "destination",
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

        if (updates.destination !== undefined) {
            if (
                typeof updates.destination !== "string" ||
                !mongoose.isValidObjectId(updates.destination)
            ) {
                return res.status(400).json({
                    success: false,
                    message: "Please select a valid destination"
                });
            }

            const selectedDestination = await Destination.findOne({
                _id: updates.destination,
                isActive: true
            });

            if (!selectedDestination) {
                return res.status(404).json({
                    success: false,
                    message: "Selected destination was not found or is inactive"
                });
            }

            updates.destination = selectedDestination._id;
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

        await bus.populate("assignedDriver", "name email");
        await bus.populate("destination", "name");

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
    getBusQrCode,
    verifyBusQrToken,
    updateBus,
    deactivateBus
};

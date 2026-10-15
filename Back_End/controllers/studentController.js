const Bus = require("../models/Bus");

async function getStudentBusInformation(req, res, next) {
    try {
        const buses = await Bus.find({ isActive: true })
            .select(
                "busNumber busName route pickupPoints departureTime totalSeats reservedSeats studentOccupancy currentLocation mapLocation"
            )
            .sort({ departureTime: 1 });

        return res.status(200).json({
            success: true,
            message: "Bus information retrieved successfully",
            count: buses.length,
            buses
        });
    } catch (error) {
        return next(error);
    }
}

module.exports = {
    getStudentBusInformation
};

const Bus = require("../models/Bus");

async function getStudentBusInformation(req, res, next) {
    try {
        const buses = await Bus.find({ isActive: true })
            .select(
                "busNumber busName route pickupPoints departureTime totalSeats reservedSeats studentOccupancy currentLocation mapLocation latitude longitude status direction isLocationSharing"
            )
            .sort({ departureTime: 1 });

        const busInformation = buses.map(function (bus) {
            const studentCapacity = Math.max(
                0,
                bus.totalSeats - bus.reservedSeats
            );

            const availableStudentSeats = Math.max(
                0,
                studentCapacity - bus.studentOccupancy
            );

            return {
                ...bus.toJSON(),
                studentCapacity,
                availableStudentSeats
            };
        });

        return res.status(200).json({
            success: true,
            message: "Bus information retrieved successfully",
            count: busInformation.length,
            buses: busInformation
        });
    } catch (error) {
        return next(error);
    }
}

module.exports = {
    getStudentBusInformation
};

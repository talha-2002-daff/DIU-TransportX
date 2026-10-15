// const mongoose = require("mongoose");
// const Bus = require("../models/Bus");
// const User = require("../models/User");

// const createBus = async (req, res, next) => {
//     try {
//         const {
//             busNumber,
//             busName,
//             route,
//             pickupPoints,
//             departureTime,
//             totalSeats,
//             assignedDriver,
//             currentLocation
//         } = req.body;

//         if (
//             typeof busNumber !== "string" ||
//             !busNumber.trim() ||
//             typeof busName !== "string" ||
//             !busName.trim() ||
//             typeof route !== "string" ||
//             !route.trim() ||
//             typeof departureTime !== "string" ||
//             !departureTime.trim() ||
//             !Number.isInteger(totalSeats) ||
//             totalSeats < 7
//         ) {
//             return res.status(400).json({
//                 success: false,
//                 message: "Please provide valid bus details"
//             });
//         }

//         if (
//             pickupPoints !== undefined &&
//             (!Array.isArray(pickupPoints) ||
//                 !pickupPoints.every(
//                     point =>
//                         typeof point === "string" && point.trim()
//                 ))
//         ) {
//             return res.status(400).json({
//                 success: false,
//                 message: "Pickup points must be an array of non-empty strings"
//             });
//         }

//         let driverId = null;

//         if (assignedDriver) {
//             if (!mongoose.isValidObjectId(assignedDriver)) {
//                 return res.status(400).json({
//                     success: false,
//                     message: "Invalid driver ID"
//                 });
//             }

//             const driver = await User.findOne({
//                 _id: assignedDriver,
//                 role: "driver",
//                 isActive: true
//             });

//             if (!driver) {
//                 return res.status(400).json({
//                     success: false,
//                     message: "An active driver account is required"
//                 });
//             }

//             driverId = driver._id;
//         }

//         const bus = await Bus.create({
//             busNumber: busNumber.trim(),
//             busName: busName.trim(),
//             route: route.trim(),
//             pickupPoints: (pickupPoints || []).map(point => point.trim()),
//             departureTime: departureTime.trim(),
//             totalSeats,
//             assignedDriver: driverId,
//             currentLocation:
//                 typeof currentLocation === "string" && currentLocation.trim()
//                     ? currentLocation.trim()
//                     : "Location not updated"
//         });

//         return res.status(201).json({
//             success: true,
//             message: "Bus created successfully",
//             bus
//         });
//     } catch (error) {
//         if (error.code === 11000) {
//             return res.status(409).json({
//                 success: false,
//                 message: "A bus with this bus number already exists"
//             });
//         }

//         if (error.name === "ValidationError") {
//             return res.status(400).json({
//                 success: false,
//                 message: "Bus validation failed",
//                 errors: Object.values(error.errors).map(item => item.message)
//             });
//         }

//         return next(error);
//     }
// };

// const getAllBuses = async (req, res, next) => {
//     try {
//         const buses = await Bus.find({ isActive: true })
//             .populate("assignedDriver", "name email")
//             .sort({ busNumber: 1 });

//         return res.status(200).json({
//             success: true,
//             count: buses.length,
//             buses
//         });
//     } catch (error) {
//         return next(error);
//     }
// };

// const getBusById = async (req, res, next) => {
//     try {
//         if (!mongoose.isValidObjectId(req.params.id)) {
//             return res.status(400).json({
//                 success: false,
//                 message: "Invalid bus ID"
//             });
//         }

//         const bus = await Bus.findOne({
//             _id: req.params.id,
//             isActive: true
//         }).populate("assignedDriver", "name email");

//         if (!bus) {
//             return res.status(404).json({
//                 success: false,
//                 message: "Bus not found"
//             });
//         }

//         return res.status(200).json({
//             success: true,
//             bus
//         });
//     } catch (error) {
//         return next(error);
//     }
// };

// const assignDriver = async (req, res, next) => {
//     try {
//         const { id } = req.params;
//         const { assignedDriver } = req.body;

//         if (!mongoose.isValidObjectId(id)) {
//             return res.status(400).json({
//                 success: false,
//                 message: "Invalid bus ID"
//             });
//         }

//         if (
//             !req.body ||
//             !Object.prototype.hasOwnProperty.call(req.body, "assignedDriver")
//         ) {
//             return res.status(400).json({
//                 success: false,
//                 message: "Please provide a driver ID"
//             });
//         }

//         const bus = await Bus.findOne({
//             _id: id,
//             isActive: true
//         });

//         if (!bus) {
//             return res.status(404).json({
//                 success: false,
//                 message: "Bus not found"
//             });
//         }

//         if (assignedDriver === null) {
//             bus.assignedDriver = null;
//             await bus.save();

//             return res.status(200).json({
//                 success: true,
//                 message: "Driver unassigned successfully",
//                 bus
//             });
//         }

//         if (
//             typeof assignedDriver !== "string" ||
//             !mongoose.isValidObjectId(assignedDriver)
//         ) {
//             return res.status(400).json({
//                 success: false,
//                 message: "Invalid driver ID"
//             });
//         }

//         const driver = await User.findOne({
//             _id: assignedDriver,
//             role: "driver",
//             isActive: true
//         });

//         if (!driver) {
//             return res.status(400).json({
//                 success: false,
//                 message: "An active driver account is required"
//             });
//         }

//         bus.assignedDriver = driver._id;
//         await bus.save();
//         await bus.populate("assignedDriver", "name email");

//         return res.status(200).json({
//             success: true,
//             message: "Driver assigned successfully",
//             bus
//         });
//     } catch (error) {
//         return next(error);
//     }
// };

// const updateBusLocation = async (req, res, next) => {
//     try {
//         const { id } = req.params;
//         const { currentLocation } = req.body;

//         if (!mongoose.isValidObjectId(id)) {
//             return res.status(400).json({
//                 success: false,
//                 message: "Invalid bus ID"
//             });
//         }

//         if (
//             typeof currentLocation !== "string" ||
//             !currentLocation.trim()
//         ) {
//             return res.status(400).json({
//                 success: false,
//                 message: "Please provide a valid bus location"
//             });
//         }

//         const bus = await Bus.findOne({
//             _id: id,
//             assignedDriver: req.user.id,
//             isActive: true
//         });

//         if (!bus) {
//             return res.status(404).json({
//                 success: false,
//                 message: "Assigned bus not found"
//             });
//         }

//         bus.currentLocation = currentLocation.trim();
//         await bus.save();

//         return res.status(200).json({
//             success: true,
//             message: "Bus location updated successfully",
//             bus
//         });
//     } catch (error) {
//         return next(error);
//     }
// };

// async function getAssignedBus(req, res, next) {
//     try {
//         const bus = await Bus.findOne({
//             assignedDriver: req.user.id,
//             isActive: true
//         }).populate("assignedDriver", "name email");

//         if (!bus) {
//             return res.status(404).json({
//                 success: false,
//                 message: "No bus is currently assigned to you"
//             });
//         }

//         return res.status(200).json({
//             success: true,
//             message: "Assigned bus retrieved successfully",
//             bus
//         });
//     } catch (error) {
//         return next(error);
//     }
// }

// async function getStudentBusInformation(req, res, next) {
//     try {
//         const buses = await Bus.find({ isActive: true })
//             .select(
//                 "busNumber busName route pickupPoints departureTime totalSeats reservedSeats studentOccupancy currentLocation"
//             )
//             .sort({ departureTime: 1 });

//         return res.status(200).json({
//             success: true,
//             message: "Bus information retrieved successfully",
//             count: buses.length,
//             buses
//         });
//     } catch (error) {
//         return next(error);
//     }
// }

// module.exports = {
//     createBus,
//     getAllBuses,
//     getBusById,
//     assignDriver,
//      updateBusLocation,
//      getAssignedBus,
//      getStudentBusInformation

    
// };
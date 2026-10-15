const mongoose = require("mongoose");

const validParkingBays = [
    "A1", "A2", "A3", "A4", "A5",
    "B1", "B2", "B3", "B4", "B5",
    "C1", "C2", "C3", "C4", "C5"
];

const busSchema = new mongoose.Schema(
    {
        busNumber: {
            type: String,
            required: [true, "Bus number is required"],
            unique: true,
            trim: true,
            uppercase: true
        },
        busName: {
            type: String,
            required: [true, "Bus name is required"],
            trim: true
        },
        route: {
            type: String,
            required: [true, "Bus route is required"],
            trim: true
        },
        pickupPoints: {
            type: [String],
            default: []
        },
        departureTime: {
            type: String,
            required: [true, "Departure time is required"],
            trim: true,
            match: [
                /^(0?[1-9]|1[0-2]):[0-5][0-9]\s?(AM|PM)$/i,
                "Departure time must be in a format like 08:30 AM"
            ]
        },
        totalSeats: {
            type: Number,
            required: [true, "Total seats are required"],
            min: [7, "Total seats must be at least 7"],
            validate: {
                validator: Number.isInteger,
                message: "Total seats must be a whole number"
            }
        },
        reservedSeats: {
            type: Number,
            default: 6,
            immutable: true
        },
        studentOccupancy: {
            type: Number,
            default: 0,
            min: 0
        },
        assignedDriver: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null
        },
        currentLocation: {
            type: String,
            default: "Location not updated",
            trim: true
        },
        mapLocation: {
            bayId: {
                type: String,
                enum: {
                    values: validParkingBays,
                    message: "Invalid parking bay"
                },
                default: null
            },
            x: {
                type: Number,
                min: 0,
                max: 100,
                default: null
            },
            y: {
                type: Number,
                min: 0,
                max: 100,
                default: null
            },
            label: {
                type: String,
                trim: true,
                default: ""
            },
            updatedAt: {
                type: Date,
                default: null
            }
        },
        isActive: {
            type: Boolean,
            default: true
        }
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true }
    }
);

busSchema.virtual("studentCapacity").get(function () {
    return this.totalSeats - this.reservedSeats;
});

busSchema.virtual("availableStudentSeats").get(function () {
    return Math.max(
        0,
        this.studentCapacity - this.studentOccupancy
    );
});

const Bus = mongoose.model("Bus", busSchema);

module.exports = Bus;
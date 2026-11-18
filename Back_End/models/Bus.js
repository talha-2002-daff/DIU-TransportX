
const mongoose = require("mongoose");
const crypto = require("crypto");  //crypto	Node.js built-in module for generating secure random values

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
        destination: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Destination",
            default: null
        },
        qrToken: {            //crypto	Node.js built-in module for generating secure random values
            type: String,
            unique: true,
            sparse: true,  //MongoDB allows older bus documents without a token while enforcing uniqueness for existing values.
            select: false
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
            latitude: {
                type: Number,
                min: -90,
                max: 90,
                default: null
            },
            longitude: {
                type: Number,
                min: -180,
                max: 180,
                default: null
            },
            status: {
                type: String,
                enum: ["parked", "on_route", "offline"],
                default: "offline"
            },
            direction: {
                type: String,
                enum: ["to_diu", "from_diu"],
                default: null
            },
            isLocationSharing: {
                type: Boolean,
                default: false
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

busSchema.pre("validate", function () {  //when a new bus is created first oif all it checks whether there is exixting token or not
                                             //This is not the QR image. It is the secret information that will be encoded inside the QR image.
    if (!this.qrToken) {
        this.qrToken = crypto.randomBytes(32).toString("hex");  //crypto.randomBytes(32) generates 32 random bytes, and .toString("hex") converts them into a hexadecimal string.
    }
});

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

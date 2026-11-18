
const mongoose = require("mongoose");

const destinationSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, "Destination name is required"],
            trim: true
        },
        normalizedName: {
            type: String,
            required: true,
            unique: true,
            select: false
        },
        isActive: {
            type: Boolean,
            default: true
        }
    },
    {
        timestamps: true
    }
);

const Destination = mongoose.model("Destination", destinationSchema);

module.exports = Destination;

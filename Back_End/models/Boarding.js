
const mongoose = require("mongoose");

const boardingSchema = new mongoose.Schema(
    {
        student: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },
        bus: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Bus",
            required: true
        },
        boardedAt: {
            type: Date,
            default: Date.now
        }
    },
    {
        timestamps: true
    }
);

boardingSchema.index(
    { student: 1, bus: 1 },
    { unique: true }
);

const Boarding = mongoose.model("Boarding", boardingSchema);

module.exports = Boarding;

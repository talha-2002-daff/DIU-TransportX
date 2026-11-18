
const mongoose = require("mongoose");
const Destination = require("../models/Destination");

async function createDestination(req, res, next) {
    try {
        const { name } = req.body;

        if (typeof name !== "string" || !name.trim()) {
            return res.status(400).json({
                success: false,
                message: "Destination name is required"
            });
        }

        const trimmedName = name.trim();
        const normalizedName = trimmedName.toLowerCase();

        const existingDestination = await Destination.findOne({
            normalizedName
        });

        if (existingDestination) {
            return res.status(409).json({
                success: false,
                message: "This destination already exists"
            });
        }

        const destination = await Destination.create({
            name: trimmedName,
            normalizedName
        });

        return res.status(201).json({
            success: true,
            message: "Destination created successfully",
            destination
        });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({
                success: false,
                message: "This destination already exists"
            });
        }

        return next(error);
    }
}

async function getAllDestinations(req, res, next) {
    try {
        const destinations = await Destination.find({
            isActive: true
        }).sort({ name: 1 });

        return res.status(200).json({
            success: true,
            count: destinations.length,
            destinations
        });
    } catch (error) {
        return next(error);
    }
}

async function updateDestination(req, res, next) {
    try {
        const { id } = req.params;
        const { name } = req.body;

        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid destination ID"
            });
        }

        if (typeof name !== "string" || !name.trim()) {
            return res.status(400).json({
                success: false,
                message: "Please provide a valid destination name"
            });
        }

        const destination = await Destination.findOne({
            _id: id,
            isActive: true
        });

        if (!destination) {
            return res.status(404).json({
                success: false,
                message: "Active destination not found"
            });
        }

        const trimmedName = name.trim();
        const normalizedName = trimmedName.toLowerCase();

        const existingDestination = await Destination.findOne({
            normalizedName,
            _id: { $ne: id }
        });

        if (existingDestination) {
            return res.status(409).json({
                success: false,
                message: "Another destination with this name already exists"
            });
        }

        destination.name = trimmedName;
        destination.normalizedName = normalizedName;

        await destination.save();

        return res.status(200).json({
            success: true,
            message: "Destination updated successfully",
            destination
        });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({
                success: false,
                message: "This destination already exists"
            });
        }

        return next(error);
    }
}

async function deactivateDestination(req, res, next) {
    try {
        const { id } = req.params;

        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid destination ID"
            });
        }

        const destination = await Destination.findOne({
            _id: id,
            isActive: true
        });

        if (!destination) {
            return res.status(404).json({
                success: false,
                message: "Active destination not found"
            });
        }

        destination.isActive = false;

        await destination.save();

        return res.status(200).json({
            success: true,
            message: "Destination deactivated successfully",
            destination
        });
    } catch (error) {
        return next(error);
    }
}

module.exports = {
    createDestination,
    getAllDestinations,
    updateDestination,
    deactivateDestination
};

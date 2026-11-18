
const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

const {
    createDestination,
    getAllDestinations,
    updateDestination,
    deactivateDestination
} = require("../controllers/destinationController");

router.use(authMiddleware);
router.use(roleMiddleware("admin"));

router.post("/", createDestination);
router.get("/", getAllDestinations);
router.patch("/:id", updateDestination);
router.patch("/:id/deactivate", deactivateDestination);

module.exports = router;

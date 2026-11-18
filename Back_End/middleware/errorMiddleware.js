function errorMiddleware(error, req, res, next) {
    console.error(error);

    if (res.headersSent) {
        return next(error);
    }

    return res.status(500).json({
        success: false,
        message: "Internal server error"
    });
}

module.exports = errorMiddleware;
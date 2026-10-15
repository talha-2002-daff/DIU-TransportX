
function validateRegistration(req, res, next) {
    const { name, email, password, studentId } = req.body;

    const errors = {};

    if (typeof name !== "string" || !name.trim()) {
        errors.name = "Name is required";
    }

    if (typeof email !== "string" || !email.trim()) {
        errors.email = "Email is required";
    } else if (
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
    ) {
        errors.email = "Please enter a valid email address";
    }

    if (typeof password !== "string" || !password) {
        errors.password = "Password is required";
    } else {
        if (password.length < 8) {
            errors.password = "Password must be at least 8 characters";
        } else {
            if (!/[A-Za-z]/.test(password)) {
                errors.password =
                    "Password must contain at least one letter";
            }

            if (!/[0-9]/.test(password)) {
                errors.password =
                    "Password must contain at least one number";
            }

            if (!/[^A-Za-z0-9\s]/.test(password)) {
                errors.password =
                    "Password must contain at least one special character";
            }
        }
    }

    if (
        studentId !== undefined &&
        studentId !== null &&
        (typeof studentId !== "string" || !studentId.trim())
    ) {
        errors.studentId = "Student ID must be a non-empty string";
    }

    if (Object.keys(errors).length > 0) {
        return res.status(400).json({
            success: false,
            message: "Validation failed",
            errors: errors
        });
    }

    return next();
}

module.exports = validateRegistration;

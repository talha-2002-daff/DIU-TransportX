import { apiRequest } from "./api.js";

const allowedRoles = ["student", "driver", "admin", "faculty"];

async function loginUser(email, password) {
    const result = await apiRequest("/auth/login", {
        method: "POST",
        body: JSON.stringify({
            email: email,
            password: password
        })
    });

    if (!result.success) {
        throw new Error(result.message || "Login failed");
    }

    if (!result.user || !allowedRoles.includes(result.user.role)) {
        throw new Error("Invalid account role. Please contact the administrator.");
    }

    localStorage.removeItem("token");
    localStorage.setItem("user", JSON.stringify(result.user));

    return result;
}

async function logoutUser() {
    try {
        await apiRequest("/auth/logout", {
            method: "POST"
        });
    } finally {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
    }
}

function getCurrentUser() {
    const user = localStorage.getItem("user");

    if (!user) {
        return null;
    }

    try {
        return JSON.parse(user);
    } catch {
        localStorage.removeItem("user");
        localStorage.removeItem("token");
        return null;
    }
}

export {
    loginUser,
    logoutUser,
    getCurrentUser
};
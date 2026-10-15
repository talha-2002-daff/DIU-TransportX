
import { useEffect, useState } from "react";
import "./App.css";

import Login from "./pages/login/Login.jsx";


import Register from "./pages/register/Register.jsx";
import StudentDashboard from "./pages/student/StudentDashboard.jsx";
import DriverDashboard from "./pages/driver/DriverDashboard.jsx";
import AdminDashboard from "./pages/admin/AdminDashboard.jsx";
import FacultyDashboard from "./pages/faculty/FacultyDashboard.jsx";

import {
    getCurrentUser,
    logoutUser
} from "./services/authService.js";

import { apiRequest } from "./services/api.js";

function App() {
    const [user, setUser] = useState(null);
    const [authPage, setAuthPage] = useState("login");
    const [loading, setLoading] = useState(true);

    useEffect(function () {
        async function checkSession() {
            try {
                const result = await apiRequest("/auth/me");

                if (result.success && result.user) {
                    setUser(result.user);
                    localStorage.setItem("user", JSON.stringify(result.user));
                } else {
                    setUser(null);
                    localStorage.removeItem("user");
                }
            } catch (error) {
                setUser(null);
                localStorage.removeItem("user");
            } finally {
                setLoading(false);
            }
        }

        checkSession();
    }, []);

    function handleLogin(newUser) {
        const normalizedUser = {
            ...newUser,
            role: typeof newUser.role === "string"
                ? newUser.role.trim().toLowerCase()
                : newUser.role
        };

        localStorage.setItem("user", JSON.stringify(normalizedUser));
        setUser(normalizedUser);
    }

    function handleRegister(newUser) {
        handleLogin(newUser);
    }

    async function handleLogout() {
        try {
            await logoutUser();
        } catch (error) {
            console.error("Logout failed:", error.message);
        } finally {
            localStorage.removeItem("user");
            localStorage.removeItem("token");
            setUser(null);
            setAuthPage("login");
        }
    }

    if (loading) {
        return (
            <main className="app">
                <p>Loading DIU TransportX...</p>
            </main>
        );
    }

    if (!user) {
        if (authPage === "register") {
            return (
                <Register
                    onRegister={handleRegister}
                    onNavigateToLogin={function () {
                        setAuthPage("login");
                    }}
                />
            );
        }

        return (
            <Login
                onLogin={handleLogin}
                onNavigateToRegister={function () {
                    setAuthPage("register");
                }}
            />
        );
    }

    const role = typeof user.role === "string"
        ? user.role.trim().toLowerCase()
        : "";

    if (role === "student") {
        return (
            <StudentDashboard
                user={user}
                onLogout={handleLogout}
            />
        );
    }

    if (role === "driver") {
        return (
            <div className="app">
                <header className="topbar">
                    <div className="brand">
                        <div className="brand-icon">T</div>
                        <div>
                            <h2>DIU TransportX</h2>
                            <p>Driver Portal</p>
                        </div>
                    </div>

                    <div className="user-actions">
                        <span className="user-label">
                            {user.name || "Driver"}
                        </span>

                        <button
                            type="button"
                            className="logout-button"
                            onClick={handleLogout}
                        >
                            Logout
                        </button>
                    </div>
                </header>

                <DriverDashboard />

                <footer className="footer">
                    DIU TransportX · Smarter campus transportation
                </footer>
            </div>
        );
    }

    if (role === "admin") {
        return (
            <div className="app">
                <header className="topbar">
                    <div className="brand">
                        <div className="brand-icon">T</div>
                        <div>
                            <h2>DIU TransportX</h2>
                            <p>Transport Administration</p>
                        </div>
                    </div>

                    <div className="user-actions">
                        <span className="user-label">
                            {user.name || "Admin"}
                        </span>

                        <button
                            type="button"
                            className="logout-button"
                            onClick={handleLogout}
                        >
                            Logout
                        </button>
                    </div>
                </header>

                <AdminDashboard />

                <footer className="footer">
                    DIU TransportX · Smarter campus transportation
                </footer>
            </div>
        );
    }

    if (role === "faculty") {
        return (
            <div className="app">
                <header className="topbar">
                    <div className="brand">
                        <div className="brand-icon">T</div>
                        <div>
                            <h2>DIU TransportX</h2>
                            <p>Faculty Portal</p>
                        </div>
                    </div>

                    <div className="user-actions">
                        <span className="user-label">
                            {user.name || "Faculty"}
                        </span>

                        <button
                            type="button"
                            className="logout-button"
                            onClick={handleLogout}
                        >
                            Logout
                        </button>
                    </div>
                </header>

                <FacultyDashboard
                    user={user}
                    onLogout={handleLogout}
                />

                <footer className="footer">
                    DIU TransportX · Smarter campus transportation
                </footer>
            </div>
        );
    }

    return (
        <div className="app">
            <header className="topbar">
                <div className="brand">
                    <div className="brand-icon">T</div>
                    <div>
                        <h2>DIU TransportX</h2>
                        <p>Transport Portal</p>
                    </div>
                </div>

                <div className="user-actions">
                    <span className="user-label">
                        {user.name || "User"}
                    </span>

                    <button
                        type="button"
                        className="logout-button"
                        onClick={handleLogout}
                    >
                        Logout
                    </button>
                </div>
            </header>

            <main className="dashboard">
                <section className="message-panel">
                    <h2>Dashboard not available</h2>
                    <p>
                        Your account role is not recognized.
                        Please log out and sign in again, or contact
                        the transport administrator.
                    </p>

                    <button
                        type="button"
                        onClick={handleLogout}
                    >
                        Logout
                    </button>
                </section>
            </main>
        </div>
    );
}

export default App;

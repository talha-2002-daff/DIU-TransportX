
import { useState } from "react";
import { apiRequest } from "../../services/api.js";
import "../../styles/register.css";

function Register({ onRegister, onNavigateToLogin }) {
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [studentId, setStudentId] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const passwordRules = [
        {
            label: "At least 8 characters",
            valid: password.length >= 8
        },
        {
            label: "At least one letter (A-Z)",
            valid: /[A-Za-z]/.test(password)
        },
        {
            label: "At least one number (0-9)",
            valid: /[0-9]/.test(password)
        },
        {
            label: "At least one special character (!@#$%)",
            valid: /[^A-Za-z0-9\s]/.test(password)
        }
    ];

    const isPasswordValid = passwordRules.every(function (rule) {
        return rule.valid;
    });

    const passwordsMatch = password === confirmPassword;

    async function handleRegister(event) {
        event.preventDefault();
        setError("");

        if (!isPasswordValid) {
            setError("Please satisfy all password requirements.");
            return;
        }

        if (!passwordsMatch) {
            setError("Passwords do not match.");
            return;
        }

        setLoading(true);

        try {
            const result = await apiRequest("/auth/register", {
                method: "POST",
                body: JSON.stringify({
                    name: name.trim(),
                    email: email.trim(),
                    studentId: studentId.trim(),
                    password
                })
            });

            if (!result.success || !result.token || !result.user) {
                throw new Error(result.message || "Registration failed.");
            }

            onRegister(result.token, result.user);
        } catch (error) {
            setError(error.message || "Unable to register. Please try again.");
        } finally {
            setLoading(false);
        }
    }

    return (
        <main className="register-page">
            <section className="register-image">
                <img
                    src="/images/Background.jpg"
                    alt="DIU campus transport bus"
                />

                <div className="register-image-overlay">
                    <h2>Travel Smarter with DIU TransportX</h2>
                    <p>Your campus journey starts here.</p>
                </div>
            </section>

            <section className="register-form-section">
                <form
                    className="register-card"
                    onSubmit={handleRegister}
                >
                    <div className="register-logo">T</div>

                    <h1>Create your account</h1>

                    <p className="register-description">
                        Join DIU TransportX to access your student transport
                        information.
                    </p>

                    <label htmlFor="name">Full name</label>
                    <input
                        id="name"
                        type="text"
                        value={name}
                        onChange={(event) => setName(event.target.value)}
                        placeholder="Enter your full name"
                        autoComplete="name"
                        required
                    />

                    <label htmlFor="studentId">Student ID</label>
                    <input
                        id="studentId"
                        type="text"
                        value={studentId}
                        onChange={(event) => setStudentId(event.target.value)}
                        placeholder="Enter your DIU student ID"
                        required
                    />

                    <label htmlFor="registerEmail">Email address</label>
                    <input
                        id="registerEmail"
                        type="email"
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        placeholder="Enter your email"
                        autoComplete="email"
                        required
                    />

                    <label htmlFor="registerPassword">Password</label>

                    <div className="password-input-wrapper">
                        <input
                            id="registerPassword"
                            type={showPassword ? "text" : "password"}
                            value={password}
                            onChange={(event) => setPassword(event.target.value)}
                            placeholder="Create a strong password"
                            autoComplete="new-password"
                            required
                        />

                        <button
                            type="button"
                            className="password-toggle"
                            onClick={() => setShowPassword(function (previous) {
                                return !previous;
                            })}
                            aria-label={showPassword ? "Hide password" : "Show password"}
                        >
                            {showPassword ? "Hide" : "Show"}
                        </button>
                    </div>

                    <div className="password-rules">
                        <p>Password must contain:</p>

                        {passwordRules.map((rule) => (
                            <p
                                key={rule.label}
                                className={rule.valid ? "password-rule valid" : "password-rule"}
                            >
                                <span aria-hidden="true">
                                    {rule.valid ? "✓" : "○"}
                                </span>
                                {rule.label}
                            </p>
                        ))}
                    </div>

                    <label htmlFor="confirmPassword">
                        Confirm password
                    </label>

                    <div className="password-input-wrapper">
                        <input
                            id="confirmPassword"
                            type={showConfirmPassword ? "text" : "password"}
                            value={confirmPassword}
                            onChange={(event) => setConfirmPassword(event.target.value)}
                            placeholder="Re-enter your password"
                            autoComplete="new-password"
                            required
                        />

                        <button
                            type="button"
                            className="password-toggle"
                            onClick={() => setShowConfirmPassword(function (previous) {
                                return !previous;
                            })}
                            aria-label={
                                showConfirmPassword
                                    ? "Hide confirm password"
                                    : "Show confirm password"
                            }
                        >
                            {showConfirmPassword ? "Hide" : "Show"}
                        </button>
                    </div>

                    {confirmPassword.length > 0 && (
                        <p
                            className={
                                passwordsMatch
                                    ? "password-match valid"
                                    : "password-match"
                            }
                        >
                            {passwordsMatch
                                ? "Passwords match."
                                : "Passwords do not match."}
                        </p>
                    )}

                    {error && (
                        <p className="register-error" role="alert">
                            {error}
                        </p>
                    )}

                    <button
                        type="submit"
                        disabled={
                            loading ||
                            !isPasswordValid ||
                            !passwordsMatch ||
                            !confirmPassword
                        }
                    >
                        {loading ? "Creating account..." : "Create Account"}
                    </button>

                    <p className="register-footer">
                        Already have an account?{" "}
                        <button
                            type="button"
                            className="register-link"
                            onClick={onNavigateToLogin}
                        >
                            Sign in
                        </button>
                    </p>
                </form>
            </section>
        </main>
    );
}

export default Register;

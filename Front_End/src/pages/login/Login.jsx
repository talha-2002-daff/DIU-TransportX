
import { useState } from "react";
import { loginUser } from "../../services/authService.js";
import "../../styles/login.css";

function Login({ onLogin, onNavigateToRegister }) {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    async function handleLogin(event) {
        event.preventDefault();

        setError("");
        setLoading(true);

        try {
            const result = await loginUser(email, password);
            onLogin(result.user);
        } catch (error) {
            setError(error.message || "Login failed. Please try again.");
        } finally {
            setLoading(false);
        }
    }

    return (
        <main className="login-page">
            <section className="login-image">
                <img
                    src="/images/Background.jpg"
                    alt="DIU campus transport bus"
                />

                <div className="login-image-overlay">
                    <h2>DIU TransportX</h2>
                    <p>Find your bus. Travel smarter.</p>
                </div>
            </section>

            <section className="login-form-section">
                <form className="login-card" onSubmit={handleLogin}>
                    <div className="login-logo">T</div>

                    <h1>DIU TransportX</h1>

                    <p className="login-description">
                        Sign in to find your bus and travel smarter.
                    </p>

                    <label htmlFor="email">Email address</label>
                    <input
                        id="email"
                        type="email"
                        value={email}
                        onChange={function (event) {
                            setEmail(event.target.value);
                        }}
                        placeholder="Enter your email"
                        autoComplete="username"
                        required
                    />

                    <label htmlFor="password">Password</label>
                    <input
                        id="password"
                        type="password"
                        value={password}
                        onChange={function (event) {
                            setPassword(event.target.value);
                        }}
                        placeholder="Enter your password"
                        autoComplete="current-password"
                        required
                    />

                    {error && (
                        <p className="login-error" role="alert">
                            {error}
                        </p>
                    )}

                    <button type="submit" disabled={loading}>
                        {loading ? "Signing in..." : "Sign In"}
                    </button>

                    <p className="login-footer">
                        Don't have an account?{" "}
                        <button
                            type="button"
                            className="login-link"
                            onClick={onNavigateToRegister}
                        >
                            Register
                        </button>
                    </p>
                </form>
            </section>
        </main>
    );
}

export default Login;

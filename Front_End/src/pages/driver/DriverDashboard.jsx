import { useEffect, useState } from "react";
import "../../styles/dashboard.css";

const API_URL = "http://localhost:3000/api/buses";

const PARKING_ROWS = [
    { name: "Row A", bays: ["A1", "A2", "A3", "A4", "A5"] },
    { name: "Row B", bays: ["B1", "B2", "B3", "B4", "B5"] },
    { name: "Row C", bays: ["C1", "C2", "C3", "C4", "C5"] }
];

function DriverDashboard({ token }) {
    const [bus, setBus] = useState(null);
    const [selectedBay, setSelectedBay] = useState("");
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");

    useEffect(function () {
        async function loadAssignedBus() {
            try {
                setLoading(true);
                setError("");

                const response = await fetch(
                    `${API_URL}/driver/assigned-bus`,
                    {
                        headers: {
                            Authorization: `Bearer ${token}`
                        }
                    }
                );

                const result = await response.json();

                if (!response.ok || !result.success) {
                    throw new Error(
                        result.message || "Could not load your assigned bus."
                    );
                }

                setBus(result.bus);
                setSelectedBay(result.bus.mapLocation?.bayId || "");
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        }

        if (token) {
            loadAssignedBus();
        } else {
            setError("Please log in with a driver account.");
            setLoading(false);
        }
    }, [token]);

    async function handleSubmit(event) {
        event.preventDefault();

        if (!bus) {
            setError("No assigned bus was found.");
            return;
        }

        if (!selectedBay) {
            setError("Please select a parking bay.");
            return;
        }

        try {
            setSaving(true);
            setMessage("");
            setError("");

            const response = await fetch(
                `${API_URL}/${bus._id}/location`,
                {
                    method: "PATCH",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        currentLocation: `Parking Bay ${selectedBay}`,
                        mapLocation: {
                            bayId: selectedBay,
                            label: `Parking Bay ${selectedBay}`
                        }
                    })
                }
            );

            const result = await response.json();

            if (!response.ok || !result.success) {
                throw new Error(
                    result.message || "Could not update bus location."
                );
            }

            setBus(result.bus);
            setSelectedBay(result.bus.mapLocation?.bayId || selectedBay);
            setMessage(`Your bus location has been saved as ${selectedBay}.`);
        } catch (err) {
            setError(err.message);
        } finally {
            setSaving(false);
        }
    }

    if (loading) {
        return <main className="dashboard">Loading your assigned bus...</main>;
    }

    if (!bus) {
        return (
            <main className="dashboard">
                <h1>Driver Dashboard</h1>
                <p role="alert">{error || "No assigned bus was found."}</p>
            </main>
        );
    }

    return (
        <main className="dashboard">
            <section className="welcome">
                <p className="eyebrow">DRIVER PORTAL</p>
                <h1>Update your bus parking bay</h1>
                <p>Select the row and bay where your bus is parked.</p>
            </section>

            <section className="panel">
                <h2>{bus.busNumber} — {bus.busName}</h2>
                <p>Route: {bus.route}</p>
                <p>Departure: {bus.departureTime}</p>
                <p>
                    Saved parking bay:{" "}
                    <strong>
                        {bus.mapLocation?.bayId || "Not assigned"}
                    </strong>
                </p>
                <p>
                    Current location:{" "}
                    {bus.currentLocation || "Not updated"}
                </p>
            </section>

            <form className="panel" onSubmit={handleSubmit}>
                <h2>Select parking bay</h2>
                <p>Choose the bay that matches your bus's current parking position.</p>

                {PARKING_ROWS.map(function (row) {
                    return (
                        <section className="transport-parking-row" key={row.name}>
                            <h3 className="transport-row-label">{row.name}</h3>

                            <div className="transport-bay-grid">
                                {row.bays.map(function (bayId) {
                                    const isSelected = selectedBay === bayId;

                                    return (
                                        <button
                                            key={bayId}
                                            type="button"
                                            className={
                                                "transport-parking-bay" +
                                                (isSelected
                                                    ? " bay-occupied bay-selected"
                                                    : " bay-empty")
                                            }
                                            aria-pressed={isSelected}
                                            onClick={function () {
                                                setSelectedBay(bayId);
                                                setMessage("");
                                                setError("");
                                            }}
                                        >
                                            <span className="transport-bus-icon">
                                                {isSelected ? "🚌" : "🅿️"}
                                            </span>
                                            <strong>{isSelected ? bus.busNumber : "Select"}</strong>
                                            <span className="transport-bay-label">
                                                {bayId}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        </section>
                    );
                })}

                <p>
                    Selected bay:{" "}
                    <strong>{selectedBay || "No bay selected"}</strong>
                </p>

                {message && <p role="status">{message}</p>}
                {error && <p role="alert">{error}</p>}

                <button type="submit" disabled={saving || !selectedBay}>
                    {saving ? "Saving..." : "Save Parking Bay"}
                </button>
            </form>
        </main>
    );
}

export default DriverDashboard;
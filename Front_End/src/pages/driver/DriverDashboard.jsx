import { useEffect, useRef, useState } from "react";
import { apiRequest } from "../../services/api.js";
import "../../styles/dashboard.css";

function DriverDashboard() {
    const [bus, setBus] = useState(null);
    const [boardings, setBoardings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [boardingsLoading, setBoardingsLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [isTracking, setIsTracking] = useState(false);
    const [direction, setDirection] = useState("");
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");
    const [boardingsError, setBoardingsError] = useState("");

    const watchIdRef = useRef(null);

    useEffect(function () {
        async function loadAssignedBus() {
            try {
                setLoading(true);
                setError("");

                const result = await apiRequest(
                    "/buses/driver/assigned-bus"
                );

                if (!result.success) {
                    throw new Error(
                        result.message || "Could not load your assigned bus."
                    );
                }

                setBus(result.bus);

                if (result.bus.mapLocation?.direction) {
                    setDirection(result.bus.mapLocation.direction);
                }

                setIsTracking(false);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        }

        loadAssignedBus();

        return function () {
            if (watchIdRef.current !== null) {
                navigator.geolocation.clearWatch(watchIdRef.current);
                watchIdRef.current = null;
            }
        };
    }, []);

    useEffect(function () {
        if (!bus?._id) {
            return;
        }

        let isMounted = true;

        async function loadBoardings() {
            try {
                setBoardingsLoading(true);
                setBoardingsError("");

                const result = await apiRequest(
                    "/buses/driver/boardings"
                );

                if (!result.success) {
                    throw new Error(
                        result.message || "Could not load boarding records."
                    );
                }

                if (isMounted) {
                    setBoardings(result.boardings || []);

                    setBus(function (previousBus) {
                        if (!previousBus) {
                            return previousBus;
                        }

                        return {
                            ...previousBus,
                            studentOccupancy: result.bus.studentOccupancy,
                            totalSeats: result.bus.totalSeats,
                            reservedSeats: result.bus.reservedSeats
                        };
                    });
                }
            } catch (err) {
                if (isMounted) {
                    setBoardingsError(err.message);
                }
            } finally {
                if (isMounted) {
                    setBoardingsLoading(false);
                }
            }
        }

        loadBoardings();

        const intervalId = setInterval(function () {
            loadBoardings();
        }, 10000);

        return function () {
            isMounted = false;
            clearInterval(intervalId);
        };
    }, [bus?._id]);

    async function sendGpsLocation(position, status, selectedDirection) {
        const latitude = position.coords.latitude;
        const longitude = position.coords.longitude;

        const result = await apiRequest(
            `/buses/${bus._id}/location`,
            {
                method: "PATCH",
                body: JSON.stringify({
                    mapLocation: {
                        latitude: latitude,
                        longitude: longitude,
                        status: status,
                        direction: selectedDirection || null,
                        isLocationSharing: true
                    }
                })
            }
        );

        if (!result.success) {
            throw new Error(
                result.message || "Could not update bus GPS location."
            );
        }

        setBus(result.bus);
    }

    function handleParkedLocation() {
        if (!bus) {
            setError("No assigned bus was found.");
            return;
        }

        if (!navigator.geolocation) {
            setError("Geolocation is not supported by this browser.");
            return;
        }

        if (watchIdRef.current !== null) {
            navigator.geolocation.clearWatch(watchIdRef.current);
            watchIdRef.current = null;
        }

        setIsTracking(false);
        setSaving(true);
        setMessage("");
        setError("");

        navigator.geolocation.getCurrentPosition(
            async function (position) {
                try {
                    await sendGpsLocation(position, "parked", null);
                    setMessage(
                        "Your parked bus GPS location has been saved."
                    );
                } catch (err) {
                    setError(err.message);
                } finally {
                    setSaving(false);
                }
            },
            function (geoError) {
                setError(geoError.message);
                setSaving(false);
            },
            {
                enableHighAccuracy: true,
                timeout: 15000,
                maximumAge: 0
            }
        );
    }

    function handleStartTracking() {
        if (!bus) {
            setError("No assigned bus was found.");
            return;
        }

        if (!navigator.geolocation) {
            setError("Geolocation is not supported by this browser.");
            return;
        }

        if (!direction) {
            setError("Please select your route direction.");
            return;
        }

        if (watchIdRef.current !== null) {
            navigator.geolocation.clearWatch(watchIdRef.current);
        }

        setMessage("");
        setError("");
        setIsTracking(true);

        const selectedDirection = direction;

        const watchId = navigator.geolocation.watchPosition(
            async function (position) {
                try {
                    await sendGpsLocation(
                        position,
                        "on_route",
                        selectedDirection
                    );

                    setError("");
                } catch (err) {
                    setError(err.message);
                }
            },
            function (geoError) {
                setError(geoError.message);
                setIsTracking(false);

                if (watchIdRef.current !== null) {
                    navigator.geolocation.clearWatch(watchIdRef.current);
                    watchIdRef.current = null;
                }
            },
            {
                enableHighAccuracy: true,
                timeout: 15000,
                maximumAge: 0
            }
        );

        watchIdRef.current = watchId;
    }

    async function handleStopTracking() {
        if (!bus) {
            return;
        }

        if (watchIdRef.current !== null) {
            navigator.geolocation.clearWatch(watchIdRef.current);
            watchIdRef.current = null;
        }

        setIsTracking(false);
        setSaving(true);
        setMessage("");
        setError("");

        try {
            const result = await apiRequest(
                `/buses/${bus._id}/location`,
                {
                    method: "PATCH",
                    body: JSON.stringify({
                        mapLocation: {
                            isLocationSharing: false
                        }
                    })
                }
            );

            if (!result.success) {
                throw new Error(
                    result.message || "Could not stop location sharing."
                );
            }

            setBus(result.bus);
            setMessage("Bus location sharing has been stopped.");
        } catch (err) {
            setError(err.message);
        } finally {
            setSaving(false);
        }
    }

    async function handleClearBoardings() {
        if (boardings.length === 0) {
            setMessage("There are no boarding records to clear.");
            return;
        }

        const confirmed = window.confirm(
            "Are you sure you want to clear this trip's boarding records? This action cannot be undone."
        );

        if (!confirmed) {
            return;
        }

        setSaving(true);
        setMessage("");
        setError("");
        setBoardingsError("");

        try {
            const result = await apiRequest(
                "/buses/driver/boardings",
                {
                    method: "DELETE"
                }
            );

            if (!result.success) {
                throw new Error(
                    result.message || "Could not clear boarding records."
                );
            }

            setBoardings([]);

            setBus(function (previousBus) {
                if (!previousBus) {
                    return previousBus;
                }

                return {
                    ...previousBus,
                    studentOccupancy: 0
                };
            });

            setMessage(
                `Boarding list cleared successfully. ${result.deletedCount} record(s) removed.`
            );
        } catch (err) {
            setError(err.message);
        } finally {
            setSaving(false);
        }
    }

    if (loading) {
        return (
            <main className="dashboard-page driver-dashboard">
                <div className="driver-loading">
                    <span className="driver-loading-spinner"></span>
                    Loading your assigned bus...
                </div>
            </main>
        );
    }

    if (!bus) {
        return (
            <main className="dashboard-page driver-dashboard">
                <section className="driver-panel">
                    <h1>Driver Dashboard</h1>
                    <p className="driver-error" role="alert">
                        {error || "No assigned bus was found."}
                    </p>
                </section>
            </main>
        );
    }

    const mapLocation = bus.mapLocation || {};

    const studentCapacity =
        bus.studentCapacity ??
        Math.max(0, bus.totalSeats - (bus.reservedSeats || 0));

    const availableStudentSeats =
        bus.availableStudentSeats ??
        Math.max(0, studentCapacity - (bus.studentOccupancy || 0));

    return (
        <main className="dashboard-page driver-dashboard">

            {/* Animated driver dashboard header */}
            <section className="driver-hero">

                <div className="driver-hero-content">
                    <div className="driver-hero-copy">
                        <span className="driver-hero-eyebrow">
                            <span className="driver-hero-eyebrow-dot"></span>
                            DIU TRANSPORTX · DRIVER PORTAL
                        </span>

                        <h1>
                            Your journey,
                            <br />
                            <span>your dashboard.</span>
                        </h1>

                        <p>
                            Manage your assigned bus, monitor student
                            boarding, and share your GPS location
                            with passengers.
                        </p>

                        <div className="driver-hero-meta">
                            <span className="driver-hero-bus-number">
                                {bus.busNumber}
                            </span>

                            <span>
                                {bus.busName}
                            </span>

                            <span className="driver-hero-divider"></span>

                            <span className="driver-hero-live">
                                <span></span>
                                {isTracking ? "GPS LIVE" : "DRIVER ONLINE"}
                            </span>
                        </div>
                    </div>

                    <div className="driver-hero-visual" aria-hidden="true">
                        <div className="driver-sky-glow"></div>

                        <div className="driver-hero-signal signal-one"></div>
                        <div className="driver-hero-signal signal-two"></div>
                        <div className="driver-hero-signal signal-three"></div>

                        <div className="driver-road">
                            <div className="driver-road-line"></div>
                            <div className="driver-road-line"></div>
                            <div className="driver-road-line"></div>
                            <div className="driver-road-line"></div>
                            <div className="driver-road-line"></div>
                            <div className="driver-road-line"></div>
                        </div>

                        <div className="driver-moving-bus">
                            <svg
                                className="driver-bus-svg"
                                viewBox="0 0 260 125"
                                xmlns="http://www.w3.org/2000/svg"
                            >
                                <defs>
                                    <linearGradient
                                        id="busBodyGradient"
                                        x1="0"
                                        y1="0"
                                        x2="1"
                                        y2="1"
                                    >
                                        <stop offset="0%" stopColor="#ffffff" />
                                        <stop offset="100%" stopColor="#d9f5e5" />
                                    </linearGradient>

                                    <linearGradient
                                        id="busWindowGradient"
                                        x1="0"
                                        y1="0"
                                        x2="0"
                                        y2="1"
                                    >
                                        <stop offset="0%" stopColor="#174d43" />
                                        <stop offset="100%" stopColor="#092e2b" />
                                    </linearGradient>
                                </defs>

                                <ellipse
                                    cx="132"
                                    cy="111"
                                    rx="105"
                                    ry="8"
                                    fill="rgba(0,0,0,0.22)"
                                />

                                <path
                                    d="M28 25 Q28 15 42 15 H202 Q222 15 229 35 L244 79 Q248 89 238 94 H20 Q12 94 15 83 Z"
                                    fill="url(#busBodyGradient)"
                                />

                                <path
                                    d="M38 25 H197 Q210 25 215 40 L225 67 H30 Z"
                                    fill="url(#busWindowGradient)"
                                />

                                <path
                                    d="M42 30 H83 V63 H34 Z"
                                    fill="#3b766c"
                                    opacity="0.75"
                                />

                                <path
                                    d="M89 30 H130 V63 H89 Z"
                                    fill="#3b766c"
                                    opacity="0.75"
                                />

                                <path
                                    d="M136 30 H177 V63 H136 Z"
                                    fill="#3b766c"
                                    opacity="0.75"
                                />

                                <path
                                    d="M183 30 H197 Q207 30 211 42 L219 63 H183 Z"
                                    fill="#3b766c"
                                    opacity="0.75"
                                />

                                <path
                                    d="M28 70 H228 L237 85 Q240 92 231 94 H21 Q15 94 18 86 Z"
                                    fill="#0da875"
                                />

                                <rect
                                    x="100"
                                    y="73"
                                    width="65"
                                    height="14"
                                    rx="4"
                                    fill="#075b43"
                                />

                                <text
                                    x="132"
                                    y="83"
                                    textAnchor="middle"
                                    fontSize="9"
                                    fontWeight="800"
                                    fill="#ffffff"
                                >
                                    DIU TRANSPORT
                                </text>

                                <rect
                                    x="21"
                                    y="73"
                                    width="7"
                                    height="12"
                                    rx="2"
                                    fill="#ffdb83"
                                />

                                <rect
                                    x="230"
                                    y="72"
                                    width="8"
                                    height="13"
                                    rx="2"
                                    fill="#fff2bc"
                                />

                                <rect
                                    x="54"
                                    y="89"
                                    width="25"
                                    height="5"
                                    rx="2"
                                    fill="#075b43"
                                />

                                <rect
                                    x="186"
                                    y="89"
                                    width="25"
                                    height="5"
                                    rx="2"
                                    fill="#075b43"
                                />

                                <g className="driver-bus-wheel">
                                    <circle cx="65" cy="94" r="16" fill="#102d28" />
                                    <circle cx="65" cy="94" r="8" fill="#b8d0c4" />
                                    <circle cx="65" cy="94" r="3" fill="#52796b" />
                                </g>

                                <g className="driver-bus-wheel">
                                    <circle cx="197" cy="94" r="16" fill="#102d28" />
                                    <circle cx="197" cy="94" r="8" fill="#b8d0c4" />
                                    <circle cx="197" cy="94" r="3" fill="#52796b" />
                                </g>

                                <path
                                    d="M240 76 L253 81 L240 86 Z"
                                    fill="#fff1b8"
                                    opacity="0.85"
                                />
                            </svg>

                            <div className="driver-headlight-glow"></div>
                        </div>

                        <div className="driver-road-label">
                            <span className="driver-road-label-dot"></span>
                            ON THE ROAD
                        </div>
                    </div>
                </div>
            </section>

            {/* Assigned bus information */}
            <section className="driver-panel">
                <div className="driver-panel-heading">
                    <div>
                        <span className="driver-panel-label">
                            YOUR ASSIGNED VEHICLE
                        </span>

                        <h2>
                            {bus.busNumber} — {bus.busName}
                        </h2>
                    </div>

                    <span className="driver-status-badge">
                        {bus.isActive ? "Active Bus" : "Inactive"}
                    </span>
                </div>

                <div className="driver-information-grid">
                    <div className="driver-information-item">
                        <span>Destination</span>
                        <strong>
                            {bus.destination?.name || "Not assigned"}
                        </strong>
                    </div>

                    <div className="driver-information-item">
                        <span>Departure Time</span>
                        <strong>
                            {bus.departureTime || "Not available"}
                        </strong>
                    </div>

                    <div className="driver-information-item">
                        <span>Total Seats</span>
                        <strong>{bus.totalSeats ?? "Not available"}</strong>
                    </div>

                    <div className="driver-information-item">
                        <span>Reserved Faculty/Admin Seats</span>
                        <strong>{bus.reservedSeats ?? 6}</strong>
                    </div>
                </div>

                <div className="driver-stat-grid">
                    <div className="driver-stat-card">
                        <span>Student Capacity</span>
                        <strong>{studentCapacity}</strong>
                    </div>

                    <div className="driver-stat-card">
                        <span>Students On Board</span>
                        <strong>{bus.studentOccupancy ?? 0}</strong>
                    </div>

                    <div className="driver-stat-card">
                        <span>Available Seats</span>
                        <strong>{availableStudentSeats}</strong>
                    </div>
                </div>
            </section>

            {/* Boarding records */}
            <section className="driver-panel">
                <div className="driver-panel-heading">
                    <div>
                        <span className="driver-panel-label">
                            QR BOARDING
                        </span>

                        <h2>Successful Boarding Records</h2>

                        <p>
                            Students who successfully scan the bus QR code
                            appear in this list.
                        </p>
                    </div>

                    <span className="driver-count-badge">
                        {boardings.length} Students
                    </span>
                </div>

                {boardingsLoading && boardings.length === 0 && (
                    <p className="driver-empty-state">
                        Loading boarding records...
                    </p>
                )}

                {boardingsError && (
                    <p className="driver-error" role="alert">
                        {boardingsError}
                    </p>
                )}

                {!boardingsLoading &&
                    !boardingsError &&
                    boardings.length === 0 && (
                        <div className="driver-empty-state">
                            <span className="driver-empty-icon">⌁</span>
                            <strong>No boarding records yet</strong>
                            <p>
                                Successful student QR scans will appear here.
                            </p>
                        </div>
                    )}

                {boardings.length > 0 && (
                    <>
                        <div className="driver-table-wrapper">
                            <table className="driver-table">
                                <thead>
                                    <tr>
                                        <th>Student Name</th>
                                        <th>Student ID</th>
                                        <th>Boarding Time</th>
                                    </tr>
                                </thead>

                                <tbody>
                                    {boardings.map(function (boarding) {
                                        return (
                                            <tr key={boarding.id}>
                                                <td>{boarding.studentName}</td>
                                                <td>
                                                    {boarding.studentId || "Not available"}
                                                </td>
                                                <td>
                                                    {new Date(
                                                        boarding.boardedAt
                                                    ).toLocaleString()}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        <button
                            type="button"
                            className="driver-button driver-button-danger"
                            onClick={handleClearBoardings}
                            disabled={saving || boardingsLoading}
                        >
                            {saving ? "Clearing..." : "Clear Boarding List"}
                        </button>
                    </>
                )}
            </section>

            {/* GPS information */}
            <section className="driver-panel">
                <div className="driver-panel-heading">
                    <div>
                        <span className="driver-panel-label">
                            LOCATION DETAILS
                        </span>

                        <h2>GPS Information</h2>
                    </div>

                    <span className={
                        mapLocation.isLocationSharing
                            ? "driver-gps-badge gps-active"
                            : "driver-gps-badge"
                    }>
                        {mapLocation.isLocationSharing
                            ? "GPS Sharing Active"
                            : "GPS Offline"}
                    </span>
                </div>

                <div className="driver-gps-grid">
                    <div className="driver-information-item">
                        <span>GPS Status</span>
                        <strong>{mapLocation.status || "offline"}</strong>
                    </div>

                    <div className="driver-information-item">
                        <span>Route Direction</span>
                        <strong>
                            {mapLocation.direction === "to_diu"
                                ? "Towards DIU"
                                : mapLocation.direction === "from_diu"
                                    ? "From DIU"
                                    : "Not selected"}
                        </strong>
                    </div>

                    <div className="driver-information-item">
                        <span>Latitude</span>
                        <strong>
                            {mapLocation.latitude ?? "Not available"}
                        </strong>
                    </div>

                    <div className="driver-information-item">
                        <span>Longitude</span>
                        <strong>
                            {mapLocation.longitude ?? "Not available"}
                        </strong>
                    </div>

                    <div className="driver-information-item driver-gps-update">
                        <span>Last GPS Update</span>
                        <strong>
                            {mapLocation.updatedAt
                                ? new Date(
                                    mapLocation.updatedAt
                                ).toLocaleString()
                                : "Not available"}
                        </strong>
                    </div>
                </div>
            </section>

            {/* Parked GPS location */}
            <section className="driver-panel driver-action-panel">
                <div className="driver-panel-heading">
                    <div>
                        <span className="driver-panel-label">
                            PARKING LOCATION
                        </span>

                        <h2>Update Parked Location</h2>

                        <p>
                            Use this option when your bus is parked.
                            Your phone's current GPS position will be saved once.
                        </p>
                    </div>

                    <span className="driver-action-icon">⌖</span>
                </div>

                <button
                    type="button"
                    className="driver-button driver-button-primary"
                    onClick={handleParkedLocation}
                    disabled={saving || isTracking}
                >
                    {saving
                        ? "Updating Location..."
                        : "Get Parked Location"}
                </button>
            </section>

            {/* Live bus tracking */}
            <section className="driver-panel driver-action-panel">
                <div className="driver-panel-heading">
                    <div>
                        <span className="driver-panel-label">
                            LIVE GPS
                        </span>

                        <h2>Live Bus Tracking</h2>

                        <p>
                            Select your journey direction before starting
                            continuous GPS sharing.
                        </p>
                    </div>

                    <span className="driver-action-icon">◎</span>
                </div>

                <div className="driver-form-group">
                    <label htmlFor="bus-direction">
                        Route Direction
                    </label>

                    <select
                        id="bus-direction"
                        className="driver-select"
                        value={direction}
                        onChange={function (event) {
                            setDirection(event.target.value);
                            setMessage("");
                            setError("");
                        }}
                        disabled={isTracking || saving}
                    >
                        <option value="">Select direction</option>
                        <option value="to_diu">Towards DIU</option>
                        <option value="from_diu">From DIU</option>
                    </select>
                </div>

                {!isTracking ? (
                    <button
                        type="button"
                        className="driver-button driver-button-primary"
                        onClick={handleStartTracking}
                        disabled={saving || !direction}
                    >
                        Start Live Tracking
                    </button>
                ) : (
                    <button
                        type="button"
                        className="driver-button driver-button-stop"
                        onClick={handleStopTracking}
                        disabled={saving}
                    >
                        {saving ? "Stopping..." : "Stop Live Tracking"}
                    </button>
                )}

                {isTracking && (
                    <div className="driver-tracking-notice" role="status">
                        <span className="driver-live-dot"></span>
                        Live GPS tracking is active. Your location is being shared.
                    </div>
                )}
            </section>

            {message && (
                <p className="driver-message" role="status">
                    {message}
                </p>
            )}

            {error && (
                <p className="driver-error" role="alert">
                    {error}
                </p>
            )}
        </main>
    );
}

export default DriverDashboard;
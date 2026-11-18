
import { useCallback, useEffect, useState } from "react";
import { getStudentBusInformation } from "../../services/bussService.js";
import { apiRequest } from "../../services/api.js";
import GoogleParkingMap from "../../components/bus/GoogleParkingMap.jsx";
import QrScanner from "../../components/bus/QrScanner.jsx";
import "../../styles/dashboard.css";
import "../../styles/qr.css";

function StudentDashboard({ user, onLogout }) {
    const [buses, setBuses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [search, setSearch] = useState("");
    const [destination, setDestination] = useState("");
    const [selectedBus, setSelectedBus] = useState(null);

    const [isScannerOpen, setIsScannerOpen] = useState(false);
    const [scannedToken, setScannedToken] = useState("");
    const [scanMessage, setScanMessage] = useState("");
    const [isVerifying, setIsVerifying] = useState(false);
    const [verifiedBus, setVerifiedBus] = useState(null);

    const origin = "DIU";

    function normalizePoint(point) {
        return String(point || "").trim().toLowerCase();
    }

    function getBusPoints(bus) {
        const pickupPoints = Array.isArray(bus.pickupPoints)
            ? bus.pickupPoints
            : [];

        const routePoints = String(bus.route || "")
            .split(/\s*(?:→|->|\bto\b|\s[-–—]\s|,|\|)\s*/i)
            .filter(Boolean);

        return pickupPoints.concat(routePoints);
    }

    const destinations = buses
        .flatMap(getBusPoints)
        .map(function (point) {
            return String(point || "").trim();
        })
        .filter(function (point) {
            return point && normalizePoint(point) !== "diu";
        })
        .reduce(function (uniquePoints, point) {
            const alreadyExists = uniquePoints.some(function (existingPoint) {
                return normalizePoint(existingPoint) === normalizePoint(point);
            });

            if (!alreadyExists) {
                uniquePoints.push(point);
            }

            return uniquePoints;
        }, [])
        .sort(function (first, second) {
            return first.localeCompare(second);
        });

    async function loadBuses(showLoading) {
        try {
            if (showLoading) {
                setLoading(true);
            }

            setError("");

            const result = await getStudentBusInformation();

            setBuses(result);

            setSelectedBus(function (currentBus) {
                if (!currentBus) {
                    return null;
                }

                return result.find(function (bus) {
                    return bus._id === currentBus._id;
                }) || null;
            });

            setVerifiedBus(function (currentBus) {
                if (!currentBus) {
                    return null;
                }

                return result.find(function (bus) {
                    return bus._id === currentBus._id;
                }) || currentBus;
            });
        } catch (requestError) {
            setError(
                requestError.message || "Unable to load bus information."
            );
        } finally {
            if (showLoading) {
                setLoading(false);
            }
        }
    }

    useEffect(function () {
        loadBuses(true);

        const interval = setInterval(function () {
            loadBuses(false);
        }, 10000);

        return function () {
            clearInterval(interval);
        };
    }, []);

    function matchesDestination(bus) {
        if (!destination) {
            return true;
        }

        const selectedDestination = normalizePoint(destination);

        return getBusPoints(bus).some(function (point) {
            const normalizedPoint = normalizePoint(point);

            return (
                normalizedPoint === selectedDestination ||
                normalizedPoint.includes(selectedDestination)
            );
        });
    }

    const routeBuses = buses.filter(matchesDestination);

    const filteredBuses = routeBuses.filter(function (bus) {
        const text = search.trim().toLowerCase();

        return (
            String(bus.busNumber || "").toLowerCase().includes(text) ||
            String(bus.busName || "").toLowerCase().includes(text) ||
            String(bus.route || "").toLowerCase().includes(text) ||
            String(bus.currentLocation || "").toLowerCase().includes(text) ||
            getBusPoints(bus).some(function (point) {
                return String(point).toLowerCase().includes(text);
            })
        );
    });

    useEffect(function () {
        if (!selectedBus) {
            return;
        }

        const stillVisible = filteredBuses.some(function (bus) {
            return bus._id === selectedBus._id;
        });

        if (!stillVisible) {
            setSelectedBus(null);
        }
    }, [destination, search, buses]);

    function getStudentCapacity(bus) {
        const total = Number(bus.totalSeats || 0);
        const reserved = Number(bus.reservedSeats ?? 6);

        return Math.max(0, total - reserved);
    }

    function getAvailableSeats(bus) {
        return Math.max(
            0,
            getStudentCapacity(bus) -
                Number(bus.studentOccupancy || 0)
        );
    }

    function getOccupancyPercentage(bus) {
        const capacity = getStudentCapacity(bus);

        if (capacity === 0) {
            return 0;
        }

        return Math.min(
            100,
            Math.round(
                (Number(bus.studentOccupancy || 0) / capacity) * 100
            )
        );
    }

    async function refreshBuses() {
        await loadBuses(true);
    }

    function clearFilters() {
        setDestination("");
        setSearch("");
        setSelectedBus(null);
    }

    function selectBus(bus) {
        setSelectedBus(bus);
    }

    function getGpsStatus(bus) {
        return bus.mapLocation?.status || "Unknown";
    }

    function getGpsDirection(bus) {
        const direction = bus.mapLocation?.direction;

        if (direction === "to_diu") {
            return "Going to DIU";
        }

        if (direction === "from_diu") {
            return "Leaving DIU";
        }

        return "Not specified";
    }

    function getGpsCoordinates(bus) {
        const location = bus.mapLocation;

        if (
            location?.latitude == null ||
            location?.longitude == null
        ) {
            return "Not available";
        }

        return `${location.latitude}, ${location.longitude}`;
    }

    function getLastGpsUpdate(bus) {
        const updatedAt = bus.mapLocation?.updatedAt;

        if (!updatedAt) {
            return "Not available";
        }

        return new Date(updatedAt).toLocaleString();
    }

    const handleQrScan = useCallback(async function (decodedText) {
        const token = decodedText.trim();

        setScannedToken(token);
        setIsScannerOpen(false);
        setVerifiedBus(null);
        setIsVerifying(true);
        setScanMessage("Verifying bus QR code...");

        try {
            const result = await apiRequest(
                "/buses/student/verify-qr",
                {
                    method: "POST",
                    body: JSON.stringify({
                        token: token
                    })
                }
            );

            setVerifiedBus(result.bus);

            setBuses(function (previousBuses) {
                return previousBuses.map(function (bus) {
                    if (bus._id === result.bus._id) {
                        return {
                            ...bus,
                            ...result.bus
                        };
                    }

                    return bus;
                });
            });

            setSelectedBus(function (previousBus) {
                if (previousBus?._id === result.bus._id) {
                    return {
                        ...previousBus,
                        ...result.bus
                    };
                }

                return previousBus;
            });

            setScanMessage(
                result.message || "Bus QR code verified successfully."
            );
        } catch (requestError) {
            setVerifiedBus(null);
            setScanMessage(
                requestError.message || "Unable to verify bus QR code."
            );
        } finally {
            setIsVerifying(false);
        }
    }, []);

    function openQrScanner() {
        setScannedToken("");
        setScanMessage("");
        setVerifiedBus(null);
        setIsVerifying(false);
        setIsScannerOpen(true);
    }

    function closeQrScanner() {
        setIsScannerOpen(false);
    }

    return (
        <main className="dashboard-page">
            <header className="dashboard-header">
                <div>
                    <p className="dashboard-eyebrow">DIU TransportX</p>
                    <h1>Student Dashboard</h1>
                    <p>
                        Find your bus and check transport information.
                    </p>
                </div>

                <div className="dashboard-user">
                    <span>{user?.name || "Student"}</span>
                    <button type="button" onClick={onLogout}>
                        Log out
                    </button>
                </div>
            </header>

            <section className="dashboard-welcome">
                <h2>
                    Welcome, {user?.name?.split(" ")[0] || "Student"}!
                </h2>

                <p>Select your destination to find matching buses.</p>

                <button type="button" onClick={openQrScanner}>
                    Scan Bus QR Code
                </button>
            </section>

            {isScannerOpen && (
                <QrScanner
                    onScan={handleQrScan}
                    onClose={closeQrScanner}
                />
            )}

            {scanMessage && (
                <section className="dashboard-buses qr-verification-section">

                    {verifiedBus && !isVerifying && (
                        <div className="qr-success-animation" role="status">
                            <div className="qr-success-circle">
                                <svg
                                    className="qr-success-check"
                                    viewBox="0 0 52 52"
                                    aria-hidden="true"
                                >
                                    <path
                                        d="M14 27 L22 35 L39 17"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="5"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                    />
                                </svg>
                            </div>

                            <h2>Verification Successful!</h2>

                            <p>
                                Bus QR verified and student transport
                                eligibility confirmed. Your boarding has
                                been recorded.
                            </p>
                        </div>
                    )}

                    {!verifiedBus && !isVerifying && (
                        <div className="qr-error-animation" role="alert">
                            <div className="qr-error-circle">
                                <svg
                                    className="qr-error-cross"
                                    viewBox="0 0 52 52"
                                    aria-hidden="true"
                                >
                                    <path
                                        d="M16 16 L36 36 M36 16 L16 36"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="5"
                                        strokeLinecap="round"
                                    />
                                </svg>
                            </div>

                            <h2>Verification Failed!</h2>

                            <p>{scanMessage}</p>
                        </div>
                    )}

                    <div className="dashboard-section-heading">
                        <div>
                            <h2>Bus QR Verification</h2>
                            <p>{scanMessage}</p>
                        </div>
                    </div>

                    {isVerifying && (
                        <p className="dashboard-message">
                            Please wait while we verify the QR code...
                        </p>
                    )}

                    {verifiedBus && (
                        <div className="dashboard-bus-extra">
                            <p>
                                <strong>Bus number:</strong>{" "}
                                {verifiedBus.busNumber}
                            </p>

                            <p>
                                <strong>Bus name:</strong>{" "}
                                {verifiedBus.busName || "Not specified"}
                            </p>

                            <p>
                                <strong>Destination:</strong>{" "}
                                {verifiedBus.destination?.name ||
                                    "Not specified"}
                            </p>

                            <p>
                                <strong>Verification status:</strong>{" "}
                                Verified
                            </p>

                            {verifiedBus.studentOccupancy !== undefined && (
                                <>
                                    <p>
                                        <strong>Current student occupancy:</strong>{" "}
                                        {verifiedBus.studentOccupancy}
                                    </p>

                                    <p>
                                        <strong>Available student seats:</strong>{" "}
                                        {Math.max(
                                            0,
                                            verifiedBus.totalSeats -
                                            verifiedBus.reservedSeats -
                                            verifiedBus.studentOccupancy
                                        )}
                                    </p>
                                </>
                            )}
                        </div>
                    )}
                </section>
            )}

            <section className="dashboard-stats">
                <article className="dashboard-stat">
                    <span>Active buses</span>
                    <strong>{buses.length}</strong>
                </article>

                <article className="dashboard-stat">
                    <span>Matching buses</span>
                    <strong>{filteredBuses.length}</strong>
                </article>

                <article className="dashboard-stat">
                    <span>Available student seats</span>
                    <strong>
                        {filteredBuses.reduce(function (total, bus) {
                            return total + getAvailableSeats(bus);
                        }, 0)}
                    </strong>
                </article>
            </section>

            <section className="dashboard-buses">
                <div className="dashboard-section-heading">
                    <div>
                        <h2>Find Your Bus</h2>
                        <p>Choose your starting point and destination.</p>
                    </div>

                    <button type="button" onClick={clearFilters}>
                        Clear filters
                    </button>
                </div>

                <div className="dashboard-route-filters">
                    <label>
                        From
                        <select value={origin} disabled>
                            <option value="DIU">DIU</option>
                        </select>
                    </label>

                    <label>
                        To
                        <select
                            value={destination}
                            onChange={function (event) {
                                setDestination(event.target.value);
                                setSelectedBus(null);
                            }}
                        >
                            <option value="">Select destination</option>

                            {destinations.map(function (location) {
                                return (
                                    <option key={location} value={location}>
                                        {location}
                                    </option>
                                );
                            })}
                        </select>
                    </label>
                </div>

                {destination && (
                    <p className="dashboard-message">
                        {filteredBuses.length} matching bus
                        {filteredBuses.length === 1 ? "" : "es"} from{" "}
                        {origin} to {destination}.
                    </p>
                )}
            </section>

            {loading && (
                <p className="dashboard-message">
                    Loading bus information...
                </p>
            )}

            {!loading && error && (
                <div className="dashboard-error" role="alert">
                    <p>{error}</p>
                    <button type="button" onClick={refreshBuses}>
                        Try again
                    </button>
                </div>
            )}

            {!loading && !error && filteredBuses.length > 0 && (
                <section className="dashboard-map-section">
                    <GoogleParkingMap
                        buses={filteredBuses}
                        selectedBusId={selectedBus?._id}
                        onSelectBus={selectBus}
                    />
                </section>
            )}

            {!loading && !error && destination &&
                filteredBuses.length === 0 && (
                    <p className="dashboard-message">
                        No buses were found for {destination}. Check the
                        routes and pickup points saved in the database.
                    </p>
                )}

            {selectedBus && (
                <section className="dashboard-buses">
                    <div className="dashboard-section-heading">
                        <div>
                            <h2>Selected Bus: {selectedBus.busNumber}</h2>
                            <p>
                                {selectedBus.busName || "DIU Bus"} —{" "}
                                {selectedBus.route || "Route not specified"}
                            </p>
                        </div>

                        <button
                            type="button"
                            onClick={function () {
                                setSelectedBus(null);
                            }}
                        >
                            Close
                        </button>
                    </div>

                    <div className="dashboard-bus-extra">
                        <p>
                            <strong>Current location:</strong>{" "}
                            {selectedBus.currentLocation ||
                                "Location not updated"}
                        </p>

                        <p>
                            <strong>GPS status:</strong>{" "}
                            {getGpsStatus(selectedBus)}
                        </p>

                        <p>
                            <strong>Location sharing:</strong>{" "}
                            {selectedBus.mapLocation?.isLocationSharing
                                ? "Active"
                                : "Inactive"}
                        </p>

                        <p>
                            <strong>Direction:</strong>{" "}
                            {getGpsDirection(selectedBus)}
                        </p>

                        <p>
                            <strong>GPS coordinates:</strong>{" "}
                            {getGpsCoordinates(selectedBus)}
                        </p>

                        <p>
                            <strong>Last GPS update:</strong>{" "}
                            {getLastGpsUpdate(selectedBus)}
                        </p>

                        <p>
                            <strong>Departure:</strong>{" "}
                            {selectedBus.departureTime || "Not specified"}
                        </p>

                        <p>
                            <strong>Student occupancy:</strong>{" "}
                            {Number(selectedBus.studentOccupancy || 0)} /{" "}
                            {getStudentCapacity(selectedBus)}
                        </p>

                        <p>
                            <strong>Available student seats:</strong>{" "}
                            {getAvailableSeats(selectedBus)}
                        </p>
                    </div>
                </section>
            )}

            <section className="dashboard-buses">
                <div className="dashboard-section-heading">
                    <div>
                        <h2>Available Buses</h2>
                        <p>
                            {destination
                                ? "Buses matching your selected destination."
                                : "Select a destination to find matching buses."}
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={refreshBuses}
                        disabled={loading}
                    >
                        {loading ? "Loading..." : "Refresh"}
                    </button>
                </div>

                <input
                    className="dashboard-search"
                    type="search"
                    placeholder="Search buses..."
                    value={search}
                    onChange={function (event) {
                        setSearch(event.target.value);
                    }}
                />

                {!loading && !error && filteredBuses.length === 0 && (
                    <p className="dashboard-message">
                        {buses.length === 0
                            ? "No active buses are available yet."
                            : destination
                                ? "No buses match this destination and search."
                                : "No buses match your search."}
                    </p>
                )}

                {!loading && !error && filteredBuses.length > 0 && (
                    <div className="dashboard-bus-grid">
                        {filteredBuses.map(function (bus) {
                            const capacity = getStudentCapacity(bus);
                            const available = getAvailableSeats(bus);
                            const occupancy = Number(
                                bus.studentOccupancy || 0
                            );
                            const percentage = getOccupancyPercentage(bus);
                            const isSelected = selectedBus?._id === bus._id;

                            return (
                                <article
                                    className="dashboard-bus-card"
                                    key={bus._id}
                                >
                                    <div className="dashboard-bus-card-top">
                                        <div>
                                            <span className="dashboard-bus-label">
                                                BUS {bus.busNumber}
                                            </span>
                                            <h3>{bus.busName || "DIU Bus"}</h3>
                                        </div>

                                        <span
                                            className={
                                                available > 0
                                                    ? "dashboard-status available"
                                                    : "dashboard-status full"
                                            }
                                        >
                                            {available > 0
                                                ? "Available"
                                                : "Full"}
                                        </span>
                                    </div>

                                    <div className="dashboard-bus-details">
                                        <p>
                                            <strong>Route</strong>
                                            <span>
                                                {bus.route || "Not specified"}
                                            </span>
                                        </p>

                                        <p>
                                            <strong>Departure</strong>
                                            <span>
                                                {bus.departureTime ||
                                                    "Not specified"}
                                            </span>
                                        </p>

                                        <p>
                                            <strong>Current location</strong>
                                            <span>
                                                {bus.currentLocation ||
                                                    "Location not updated"}
                                            </span>
                                        </p>

                                        <p>
                                            <strong>Pickup points</strong>
                                            <span>
                                                {getBusPoints(bus).join(", ") ||
                                                    "Not specified"}
                                            </span>
                                        </p>
                                    </div>

                                    <div className="dashboard-seat-section">
                                        <div className="dashboard-seat-heading">
                                            <strong>Student occupancy</strong>
                                            <span>
                                                {occupancy} / {capacity}
                                            </span>
                                        </div>

                                        <div
                                            className="dashboard-seat-track"
                                            role="progressbar"
                                            aria-label="Student seat occupancy"
                                            aria-valuemin={0}
                                            aria-valuemax={capacity}
                                            aria-valuenow={Math.min(
                                                occupancy,
                                                capacity
                                            )}
                                        >
                                            <div
                                                className="dashboard-seat-fill"
                                                style={{
                                                    width: `${percentage}%`
                                                }}
                                            />
                                        </div>

                                        <p>
                                            {available} student seat
                                            {available === 1 ? "" : "s"} available
                                        </p>
                                    </div>

                                    <button
                                        className="dashboard-view-button"
                                        type="button"
                                        onClick={function () {
                                            setSelectedBus(
                                                isSelected ? null : bus
                                            );
                                        }}
                                    >
                                        {isSelected
                                            ? "Hide details"
                                            : "View details"}
                                    </button>

                                    {isSelected && (
                                        <div className="dashboard-bus-extra">
                                            <p>
                                                <strong>Total seats:</strong>{" "}
                                                {bus.totalSeats ?? "Not specified"}
                                            </p>

                                            <p>
                                                <strong>
                                                    Reserved faculty/admin seats:
                                                </strong>{" "}
                                                {bus.reservedSeats ?? 6}
                                            </p>

                                            <p>
                                                <strong>Student capacity:</strong>{" "}
                                                {capacity}
                                            </p>
                                        </div>
                                    )}
                                </article>
                            );
                        })}
                    </div>
                )}
            </section>
        </main>
    );
}

export default StudentDashboard;

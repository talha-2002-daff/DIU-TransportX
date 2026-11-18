
import { useEffect, useState } from "react";
import { apiRequest } from "../../services/api.js";
import "../../styles/dashboard.css";
import "../../styles/admin.css";
import "../../styles/qr.css";

function convertToTimeInput(time) {
    if (!time) {
        return "16:20";
    }

    const match = time.match(/^(\d{1,2}):(\d{2})\s?(AM|PM)$/i);

    if (!match) {
        if (/^\d{2}:\d{2}$/.test(time)) {
            return time;
        }

        return "16:20";
    }

    let hours = Number(match[1]);
    const minutes = match[2];
    const period = match[3].toUpperCase();

    if (period === "PM" && hours !== 12) {
        hours += 12;
    }

    if (period === "AM" && hours === 12) {
        hours = 0;
    }

    return String(hours).padStart(2, "0") + ":" + minutes;
}

function convertToBackendTime(time) {
    if (!time) {
        return "";
    }

    const parts = time.split(":");
    let hours = Number(parts[0]);
    const minutes = parts[1];
    const period = hours >= 12 ? "PM" : "AM";

    hours = hours % 12;

    if (hours === 0) {
        hours = 12;
    }

    return String(hours).padStart(2, "0") + ":" + minutes + " " + period;
}

function createEmptyBusForm() {
    return {
        busNumber: "",
        busName: "",
        destination: "",
        pickupPoints: "DIU",
        departureTime: "16:20",
        totalSeats: "40"
    };
}

function createEmptyDriverForm() {
    return {
        name: "",
        email: "",
        password: ""
    };
}

function createEmptyFacultyForm() {
    return {
        name: "",
        email: "",
        password: ""
    };
}

function AdminDashboard() {
    const [buses, setBuses] = useState([]);
    const [drivers, setDrivers] = useState([]);
    const [facultyMembers, setFacultyMembers] = useState([]);
    const [destinations, setDestinations] = useState([]);
    const [students, setStudents] = useState([]);

    const [studentEligibilityDrafts, setStudentEligibilityDrafts] = useState({});
    const [savingStudentId, setSavingStudentId] = useState(null);

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [creatingDriver, setCreatingDriver] = useState(false);
    const [creatingFaculty, setCreatingFaculty] = useState(false);
    const [creatingDestination, setCreatingDestination] = useState(false);

    const [message, setMessage] = useState("");
    const [error, setError] = useState("");

    const [editingBusId, setEditingBusId] = useState(null);
    const [assignments, setAssignments] = useState({});

    const [destinationName, setDestinationName] = useState("");

    const [form, setForm] = useState(createEmptyBusForm);
    const [driverForm, setDriverForm] = useState(createEmptyDriverForm);
    const [facultyForm, setFacultyForm] = useState(createEmptyFacultyForm);

    const [qrData, setQrData] = useState(null); //use state for setting the qr data
    const [loadingQrBusId, setLoadingQrBusId] = useState(null);

    async function loadDashboardData() {
        setLoading(true);
        setError("");

        try {
            const results = await Promise.all([
                apiRequest("/buses"),
                apiRequest("/auth/drivers"),
                apiRequest("/auth/faculty"),
                apiRequest("/destinations"),
                apiRequest("/admin/students")
            ]);

            setBuses(results[0].buses || []);
            setDrivers(results[1].drivers || []);
            setFacultyMembers(results[2].facultyMembers || []);
            setDestinations(results[3].destinations || []);
            setStudents(results[4].students || []);

            const drafts = {};

            (results[4].students || []).forEach(function (student) {
                const eligibility = student.transportEligibility || {};

                drafts[student._id] = {
                    isEligible: eligibility.isEligible === true,
                    semester: eligibility.semester || ""
                };
            });

            setStudentEligibilityDrafts(drafts);
        } catch (requestError) {
            setError(
                requestError.message || "Failed to load dashboard data"
            );
        } finally {
            setLoading(false);
        }
    }

    useEffect(function () {
        loadDashboardData();
    }, []);

    function handleStudentEligibilityChange(studentId, field, value) {
        setStudentEligibilityDrafts(function (previousDrafts) {
            return {
                ...previousDrafts,
                [studentId]: {
                    ...previousDrafts[studentId],
                    [field]: value
                }
            };
        });
    }

    async function handleUpdateStudentEligibility(student) {
        const draft = studentEligibilityDrafts[student._id];

        if (!draft || !draft.semester.trim()) {
            setError(
                "Please enter the semester before updating student eligibility." // student eligibity is cheking for the bus
            );
            setMessage("");
            return;
        }

        setSavingStudentId(student._id);
        setMessage("");
        setError("");

        try {
            const result = await apiRequest(
                "/admin/students/" +
                student._id +
                "/transport-eligibility",
                {
                    method: "PATCH",
                    body: JSON.stringify({
                        isEligible: draft.isEligible,
                        semester: draft.semester.trim()
                    })
                }
            );

            if (result.student) {
                const updatedEligibility =
                    result.student.transportEligibility;

                setStudents(function (previousStudents) {
                    return previousStudents.map(function (currentStudent) {
                        if (currentStudent._id === student._id) {
                            return {
                                ...currentStudent,
                                transportEligibility: updatedEligibility
                            };
                        }

                        return currentStudent;
                    });
                });

                setStudentEligibilityDrafts(function (previousDrafts) {
                    return {
                        ...previousDrafts,
                        [student._id]: {
                            isEligible: updatedEligibility.isEligible === true,
                            semester: updatedEligibility.semester || ""
                        }
                    };
                });
            }

            setMessage(
                result.message || "Student eligibility updated successfully"
            );
        } catch (requestError) {
            setError(
                requestError.message ||
                "Failed to update student eligibility"
            );
        } finally {
            setSavingStudentId(null);
        }
    }

    function handleFormChange(event) {
        const { name, value } = event.target;

        setForm(function (previousForm) {
            return {
                ...previousForm,
                [name]: value
            };
        });
    }

    function handleDriverFormChange(event) {
        const { name, value } = event.target;

        setDriverForm(function (previousForm) {
            return {
                ...previousForm,
                [name]: value
            };
        });
    }

    function handleFacultyFormChange(event) {
        const { name, value } = event.target;

        setFacultyForm(function (previousForm) {
            return {
                ...previousForm,
                [name]: value
            };
        });
    }

    async function handleCreateDestination(event) {
        event.preventDefault();

        if (!destinationName.trim()) {
            setError("Please enter a destination name.");
            return;
        }

        setCreatingDestination(true);
        setMessage("");
        setError("");

        try {
            const result = await apiRequest("/destinations", {
                method: "POST",
                body: JSON.stringify({
                    name: destinationName.trim()
                })
            });

            setMessage(
                result.message || "Destination created successfully"
            );

            setDestinationName("");

            await loadDashboardData();
        } catch (requestError) {
            setError(
                requestError.message || "Failed to create destination"
            );
        } finally {
            setCreatingDestination(false);
        }
    }

    function resetForm() {
        setEditingBusId(null);
        setForm(createEmptyBusForm());
    }

    async function handleBusSubmit(event) {
        event.preventDefault();

        setSaving(true);
        setMessage("");
        setError("");

        const busData = {
            busNumber: form.busNumber.trim(),
            busName: form.busName.trim(),
            destination: form.destination,
            pickupPoints: form.pickupPoints
                .split(",")
                .map(function (point) {
                    return point.trim();
                })
                .filter(function (point) {
                    return point.length > 0;
                }),
            departureTime: convertToBackendTime(form.departureTime),
            totalSeats: Number(form.totalSeats)
        };

        try {
            let result;

            if (editingBusId) {
                result = await apiRequest("/buses/" + editingBusId, {
                    method: "PATCH",
                    body: JSON.stringify(busData)
                });
            } else {
                result = await apiRequest("/buses", {
                    method: "POST",
                    body: JSON.stringify(busData)
                });
            }

            setMessage(
                result.message ||
                (editingBusId
                    ? "Bus updated successfully"
                    : "Bus created successfully")
            );

            resetForm();
            await loadDashboardData();
        } catch (requestError) {
            setError(requestError.message || "Failed to save bus");
        } finally {
            setSaving(false);
        }
    }

    function handleEditBus(bus) {
        setEditingBusId(bus._id);
        setMessage("");
        setError("");

        setForm({
            busNumber: bus.busNumber || "",
            busName: bus.busName || "",
            destination: bus.destination
                ? bus.destination._id
                : "",
            pickupPoints: Array.isArray(bus.pickupPoints)
                ? bus.pickupPoints.join(", ")
                : "",
            departureTime: convertToTimeInput(bus.departureTime || ""),
            totalSeats: String(bus.totalSeats || 40)
        });

        window.scrollTo({
            top: 0,
            behavior: "smooth"
        });
    }

    async function handleGenerateQr(bus) { // handling the qr code generastion
        setLoadingQrBusId(bus._id);
        setMessage("");
        setError("");

        try {
            const result = await apiRequest(
                "/buses/" + bus._id + "/qr"
            );

            setQrData({
                busNumber: result.busNumber,
                qrCode: result.qrCode  // image data is strong here
            });

            setMessage(
                result.message || "Bus QR code generated successfully"
            );

            window.setTimeout(function () {
                const qrPanel = document.getElementById("bus-qr-panel");

                if (qrPanel) {
                    qrPanel.scrollIntoView({
                        behavior: "smooth",
                        block: "center"
                    });
                }
            }, 100);
        } catch (requestError) {
            setError(
                requestError.message || "Failed to generate bus QR code"
            );
        } finally {
            setLoadingQrBusId(null);
        }
    }

    async function handleDeactivateBus(bus) {
        const confirmed = window.confirm(
            "Are you sure you want to deactivate bus " +
            bus.busNumber +
            "?"
        );

        if (!confirmed) {
            return;
        }

        setMessage("");
        setError("");

        try {
            const result = await apiRequest(
                "/buses/" + bus._id + "/deactivate",
                {
                    method: "PATCH"
                }
            );

            setMessage(result.message || "Bus deactivated successfully");

            if (editingBusId === bus._id) {
                resetForm();
            }

            if (qrData && qrData.busNumber === bus.busNumber) {
                setQrData(null);
            }

            await loadDashboardData();
        } catch (requestError) {
            setError(
                requestError.message || "Failed to deactivate bus"
            );
        }
    }

    async function handleCreateDriver(event) {
        event.preventDefault();

        setCreatingDriver(true);
        setMessage("");
        setError("");

        try {
            const result = await apiRequest("/auth/drivers", {
                method: "POST",
                body: JSON.stringify({
                    name: driverForm.name.trim(),
                    email: driverForm.email.trim(),
                    password: driverForm.password
                })
            });

            setMessage(
                result.message || "Driver account created successfully"
            );

            setDriverForm(createEmptyDriverForm());

            await loadDashboardData();
        } catch (requestError) {
            setError(
                requestError.message || "Failed to create driver account"
            );
        } finally {
            setCreatingDriver(false);
        }
    }

    async function handleCreateFaculty(event) {
        event.preventDefault();

        setCreatingFaculty(true);
        setMessage("");
        setError("");

        try {
            const result = await apiRequest("/auth/faculty", {
                method: "POST",
                body: JSON.stringify({
                    name: facultyForm.name.trim(),
                    email: facultyForm.email.trim(),
                    password: facultyForm.password
                })
            });

            setMessage(
                result.message || "Faculty account created successfully"
            );

            setFacultyForm(createEmptyFacultyForm());

            await loadDashboardData();
        } catch (requestError) {
            setError(
                requestError.message || "Failed to create faculty account"
            );
        } finally {
            setCreatingFaculty(false);
        }
    }

    function handleAssignmentChange(busId, driverId) {
        setAssignments(function (previousAssignments) {
            return {
                ...previousAssignments,
                [busId]: driverId
            };
        });
    }

    async function handleAssignDriver(bus) {
        const selectedDriverId = assignments[bus._id];

        if (!selectedDriverId) {
            setError("Please select a driver first.");
            return;
        }

        setMessage("");
        setError("");

        try {
            const result = await apiRequest(
                "/buses/" + bus._id + "/assign-driver",
                {
                    method: "PATCH",
                    body: JSON.stringify({
                        driverId: selectedDriverId
                    })
                }
            );

            setMessage(
                result.message || "Driver assigned successfully"
            );

            setAssignments(function (previousAssignments) {
                const updatedAssignments = {
                    ...previousAssignments
                };

                delete updatedAssignments[bus._id];

                return updatedAssignments;
            });

            await loadDashboardData();
        } catch (requestError) {
            setError(
                requestError.message ||
                "Failed to update driver assignment"
            );
        }
    }

    const activeBuses = buses.filter(function (bus) {
        return bus.isActive !== false;
    });

    const inactiveBuses = buses.filter(function (bus) {
        return bus.isActive === false;
    });

    const assignedBuses = buses.filter(function (bus) {
        return Boolean(bus.assignedDriver);
    });

    const activeDrivers = drivers.filter(function (driver) {
        return driver.isActive !== false;
    });

    const activeFaculty = facultyMembers.filter(function (faculty) {
        return faculty.isActive !== false;
    });

    const eligibleStudents = students.filter(function (student) {
        return student.transportEligibility &&
            student.transportEligibility.isEligible === true;
    });

    const notEligibleStudents = students.length - eligibleStudents.length;

    if (loading) {
        return (
            <main className="dashboard">
                <section className="panel">
                    <p>Loading admin dashboard...</p>
                </section>
            </main>
        );
    }

    return (
        <main className="dashboard">
            <section className="dashboard-heading">
                <div>
                    <p className="eyebrow">
                        TRANSPORT ADMINISTRATION
                    </p>
                    <h1>Admin Dashboard</h1>
                    <p>
                        Manage students, transport eligibility, buses, drivers,
                        faculty accounts, destinations, and transport assignments.
                    </p>
                </div>

                <button
                    type="button"
                    className="admin-edit-button"
                    onClick={loadDashboardData}
                >
                    Refresh Data
                </button>
            </section>

            {message && (
                <section className="admin-success">
                    <p>{message}</p>
                    <button
                        type="button"
                        onClick={function () {
                            setMessage("");
                        }}
                    >
                        Dismiss
                    </button>
                </section>
            )}

            {error && (
                <section className="error-message">
                    <p>{error}</p>
                    <button
                        type="button"
                        onClick={function () {
                            setError("");
                        }}
                    >
                        Dismiss
                    </button>
                </section>
            )}

            <section className="stats-grid">
                <article className="stat-card">
                    <p>Total Buses</p>
                    <h2>{buses.length}</h2>
                </article>

                <article className="stat-card">
                    <p>Active Buses</p>
                    <h2>{activeBuses.length}</h2>
                </article>

                <article className="stat-card">
                    <p>Inactive Buses</p>
                    <h2>{inactiveBuses.length}</h2>
                </article>

                <article className="stat-card">
                    <p>Assigned Buses</p>
                    <h2>{assignedBuses.length}</h2>
                </article>
            </section>

            <section className="panel">
                <div className="section-heading">
                    <div>
                        <h2>Student Management</h2>
                        <p>
                            Check students' payment slips and manually update
                            their transport eligibility for each semester.
                        </p>
                    </div>
                </div>

                <section className="stats-grid">
                    <article className="stat-card">
                        <p>Total Students</p>
                        <h2>{students.length}</h2>
                    </article>

                    <article className="stat-card">
                        <p>Eligible Students</p>
                        <h2>{eligibleStudents.length}</h2>
                    </article>

                    <article className="stat-card">
                        <p>Not Eligible</p>
                        <h2>{notEligibleStudents}</h2>
                    </article>
                </section>

                {students.length === 0 ? (
                    <p>No registered students found.</p>
                ) : (
                    <div className="table-wrapper">
                        <table className="admin-table">
                            <thead>
                                <tr>
                                    <th>Student Name</th>
                                    <th>Student ID</th>
                                    <th>Email</th>
                                    <th>Semester</th>
                                    <th>Eligibility Status</th>
                                    <th>Action</th>
                                </tr>
                            </thead>

                            <tbody>
                                {students.map(function (student) {
                                    const draft =
                                        studentEligibilityDrafts[student._id] || {
                                            isEligible: false,
                                            semester: ""
                                        };

                                    const currentEligibility =
                                        student.transportEligibility || {};

                                    return (
                                        <tr key={student._id}>
                                            <td>
                                                <strong>{student.name}</strong>
                                            </td>

                                            <td>{student.studentId}</td>

                                            <td>{student.email}</td>

                                            <td>
                                                <input
                                                    type="text"
                                                    value={draft.semester}
                                                    placeholder="Example: Fall 2026"
                                                    onChange={function (event) {
                                                        handleStudentEligibilityChange(
                                                            student._id,
                                                            "semester",
                                                            event.target.value
                                                        );
                                                    }}
                                                    disabled={
                                                        savingStudentId === student._id
                                                    }
                                                />
                                            </td>

                                            <td>
                                                <span
                                                    className={
                                                        currentEligibility.isEligible === true
                                                            ? "status-badge active"
                                                            : "status-badge inactive"
                                                    }
                                                >
                                                    {currentEligibility.isEligible === true
                                                        ? "Eligible"
                                                        : "Not Eligible"}
                                                </span>

                                                <select
                                                    value={
                                                        draft.isEligible
                                                            ? "true"
                                                            : "false"
                                                    }
                                                    onChange={function (event) {
                                                        handleStudentEligibilityChange(
                                                            student._id,
                                                            "isEligible",
                                                            event.target.value === "true"
                                                        );
                                                    }}
                                                    disabled={
                                                        savingStudentId === student._id
                                                    }
                                                >
                                                    <option value="false">
                                                        Not Eligible
                                                    </option>

                                                    <option value="true">
                                                        Eligible
                                                    </option>
                                                </select>
                                            </td>

                                            <td>
                                                <button
                                                    type="button"
                                                    className="admin-primary-button"
                                                    onClick={function () {
                                                        handleUpdateStudentEligibility(
                                                            student
                                                        );
                                                    }}
                                                    disabled={
                                                        savingStudentId === student._id
                                                    }
                                                >
                                                    {savingStudentId === student._id
                                                        ? "Saving..."
                                                        : "Save Status"}
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}

                <p>
                    <small>
                        The admin must manually verify the official DIU payment
                        slip before selecting Eligible. Changes are saved only
                        after clicking Save Status.
                    </small>
                </p>
            </section>

            <section className="panel admin-form-panel">
                <div className="section-heading">
                    <div>
                        <h2>Destination Management</h2>
                        <p>
                            Create and view destinations available for bus assignments.
                        </p>
                    </div>
                </div>

                <form onSubmit={handleCreateDestination}>
                    <div className="admin-form-grid">
                        <div className="admin-form-field">
                            <label htmlFor="destinationName">
                                Destination Name
                            </label>

                            <input
                                id="destinationName"
                                type="text"
                                value={destinationName}
                                onChange={function (event) {
                                    setDestinationName(event.target.value);
                                }}
                                placeholder="Example: Gazipur"
                                required
                            />
                        </div>
                    </div>

                    <div className="admin-form-actions">
                        <button
                            type="submit"
                            className="admin-primary-button"
                            disabled={creatingDestination}
                        >
                            {creatingDestination
                                ? "Creating..."
                                : "Add Destination"}
                        </button>
                    </div>
                </form>

                <div className="section-heading">
                    <div>
                        <h3>Available Destinations</h3>
                        <p>
                            {destinations.length} active destinations
                        </p>
                    </div>
                </div>

                {destinations.length === 0 ? (
                    <p>No active destinations available. Create one above.</p>
                ) : (
                    <div className="table-wrapper">
                        <table className="admin-table">
                            <thead>
                                <tr>
                                    <th>Destination Name</th>
                                    <th>Status</th>
                                </tr>
                            </thead>

                            <tbody>
                                {destinations.map(function (destination) {
                                    return (
                                        <tr key={destination._id}>
                                            <td>{destination.name}</td>
                                            <td>
                                                <span className="status-badge active">
                                                    Active
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>

            <section className="panel admin-form-panel">
                <div className="section-heading">
                    <div>
                        <h2>
                            {editingBusId ? "Edit Bus" : "Add New Bus"}
                        </h2>
                        <p>
                            {editingBusId
                                ? "Update the selected bus information."
                                : "Enter the details to register a bus."}
                        </p>
                    </div>
                </div>

                <form onSubmit={handleBusSubmit}>
                    <div className="admin-form-grid">
                        <div className="admin-form-field">
                            <label htmlFor="busNumber">Bus Number</label>
                            <input
                                id="busNumber"
                                name="busNumber"
                                value={form.busNumber}
                                onChange={handleFormChange}
                                required
                            />
                        </div>

                        <div className="admin-form-field">
                            <label htmlFor="busName">Display Name</label>
                            <input
                                id="busName"
                                name="busName"
                                value={form.busName}
                                onChange={handleFormChange}
                                placeholder="Enter bus display name"
                                required
                            />
                        </div>

                        <div className="admin-form-field">
                            <label htmlFor="destination">Destination</label>
                            <select
                                id="destination"
                                name="destination"
                                value={form.destination}
                                onChange={handleFormChange}
                                required
                            >
                                <option value="">
                                    Select a destination
                                </option>

                                {destinations.map(function (destination) {
                                    return (
                                        <option
                                            key={destination._id}
                                            value={destination._id}
                                        >
                                            {destination.name}
                                        </option>
                                    );
                                })}
                            </select>

                            {destinations.length === 0 && (
                                <span>
                                    No active destinations found. Please create a destination first.
                                </span>
                            )}
                        </div>

                        <div className="admin-form-field">
                            <label htmlFor="pickupPoints">Pickup Points</label>
                            <input
                                id="pickupPoints"
                                name="pickupPoints"
                                value={form.pickupPoints}
                                onChange={handleFormChange}
                                placeholder="DIU, Savar"
                            />
                            <span>
                                Separate multiple pickup points with commas.
                            </span>
                        </div>

                        <div className="admin-form-field">
                            <label htmlFor="departureTime">Departure Time</label>
                            <input
                                id="departureTime"
                                name="departureTime"
                                type="time"
                                value={form.departureTime}
                                onChange={handleFormChange}
                                required
                            />
                        </div>

                        <div className="admin-form-field">
                            <label htmlFor="totalSeats">Total Seats</label>
                            <input
                                id="totalSeats"
                                name="totalSeats"
                                type="number"
                                min="7"
                                step="1"
                                value={form.totalSeats}
                                onChange={handleFormChange}
                                required
                            />
                            <span>
                                Six seats are reserved for faculty/admin.
                            </span>
                        </div>
                    </div>

                    <div className="admin-form-actions">
                        <button
                            type="submit"
                            className="admin-primary-button"
                            disabled={saving || destinations.length === 0}
                        >
                            {saving
                                ? "Saving..."
                                : editingBusId
                                    ? "Update Bus"
                                    : "Add Bus"}
                        </button>

                        {editingBusId && (
                            <button
                                type="button"
                                className="admin-edit-button"
                                onClick={resetForm}
                            >
                                Cancel Editing
                            </button>
                        )}
                    </div>
                </form>
            </section>

            <section className="panel admin-form-panel">
                <div className="section-heading">
                    <div>
                        <h2>Create Driver Account</h2>
                        <p>
                            Register a driver who can log in and manage an assigned bus.
                        </p>
                    </div>
                </div>

                <form onSubmit={handleCreateDriver}>
                    <div className="admin-form-grid">
                        <div className="admin-form-field">
                            <label htmlFor="driverName">Driver Name</label>
                            <input
                                id="driverName"
                                name="name"
                                value={driverForm.name}
                                onChange={handleDriverFormChange}
                                placeholder="Enter driver's full name"
                                required
                            />
                        </div>

                        <div className="admin-form-field">
                            <label htmlFor="driverEmail">Email Address</label>
                            <input
                                id="driverEmail"
                                name="email"
                                type="email"
                                value={driverForm.email}
                                onChange={handleDriverFormChange}
                                placeholder="driver@example.com"
                                autoComplete="email"
                                required
                            />
                        </div>

                        <div className="admin-form-field">
                            <label htmlFor="driverPassword">Temporary Password</label>
                            <input
                                id="driverPassword"
                                name="password"
                                type="password"
                                value={driverForm.password}
                                onChange={handleDriverFormChange}
                                minLength={8}
                                autoComplete="new-password"
                                placeholder="At least 8 characters"
                                required
                            />
                        </div>
                    </div>

                    <div className="admin-form-actions">
                        <button
                            type="submit"
                            className="admin-primary-button"
                            disabled={creatingDriver}
                        >
                            {creatingDriver ? "Creating Account..." : "Create Driver"}
                        </button>
                    </div>
                </form>
            </section>

            <section className="panel admin-form-panel">
                <div className="section-heading">
                    <div>
                        <h2>Create Faculty Account</h2>
                        <p>
                            Only the transport admin can create faculty accounts.
                        </p>
                    </div>
                </div>

                <form onSubmit={handleCreateFaculty}>
                    <div className="admin-form-grid">
                        <div className="admin-form-field">
                            <label htmlFor="facultyName">Faculty Name</label>
                            <input
                                id="facultyName"
                                name="name"
                                value={facultyForm.name}
                                onChange={handleFacultyFormChange}
                                placeholder="Enter faculty member's name"
                                autoComplete="name"
                                required
                            />
                        </div>

                        <div className="admin-form-field">
                            <label htmlFor="facultyEmail">Email Address</label>
                            <input
                                id="facultyEmail"
                                name="email"
                                type="email"
                                value={facultyForm.email}
                                onChange={handleFacultyFormChange}
                                placeholder="faculty@example.com"
                                autoComplete="email"
                                required
                            />
                        </div>

                        <div className="admin-form-field">
                            <label htmlFor="facultyPassword">Temporary Password</label>
                            <input
                                id="facultyPassword"
                                name="password"
                                type="password"
                                value={facultyForm.password}
                                onChange={handleFacultyFormChange}
                                minLength={8}
                                autoComplete="new-password"
                                placeholder="At least 8 characters"
                                required
                            />
                            <span>
                                Use at least 8 characters. Share credentials securely.
                            </span>
                        </div>
                    </div>

                    <div className="admin-form-actions">
                        <button
                            type="submit"
                            className="admin-primary-button"
                            disabled={creatingFaculty}
                        >
                            {creatingFaculty
                                ? "Creating Account..."
                                : "Create Faculty Account"}
                        </button>
                    </div>
                </form>
            </section>

            <section className="panel">
                <div className="section-heading">
                    <div>
                        <h2>Faculty Management</h2>
                        <p>
                            {facultyMembers.length} faculty accounts ·{" "}
                            {activeFaculty.length} active
                        </p>
                    </div>
                </div>

                {facultyMembers.length === 0 ? (
                    <p>No faculty accounts found. Create one using the form above.</p>
                ) : (
                    <div className="table-wrapper">
                        <table className="admin-table">
                            <thead>
                                <tr>
                                    <th>Faculty Name</th>
                                    <th>Email</th>
                                    <th>Account Status</th>
                                </tr>
                            </thead>

                            <tbody>
                                {facultyMembers.map(function (faculty) {
                                    return (
                                        <tr key={faculty._id}>
                                            <td>{faculty.name}</td>
                                            <td>{faculty.email}</td>
                                            <td>
                                                <span
                                                    className={
                                                        faculty.isActive === false
                                                            ? "status-badge inactive"
                                                            : "status-badge active"
                                                    }
                                                >
                                                    {faculty.isActive === false
                                                        ? "Inactive"
                                                        : "Active"}
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>

            <section className="panel">
                <div className="section-heading">
                    <div>
                        <h2>Driver Management</h2>
                        <p>
                            {drivers.length} driver accounts ·{" "}
                            {activeDrivers.length} active
                        </p>
                    </div>
                </div>

                {drivers.length === 0 ? (
                    <p>No driver accounts found.</p>
                ) : (
                    <div className="table-wrapper">
                        <table className="admin-table">
                            <thead>
                                <tr>
                                    <th>Driver Name</th>
                                    <th>Email</th>
                                    <th>Account Status</th>
                                </tr>
                            </thead>

                            <tbody>
                                {drivers.map(function (driver) {
                                    return (
                                        <tr key={driver._id}>
                                            <td>{driver.name}</td>
                                            <td>{driver.email}</td>
                                            <td>
                                                <span
                                                    className={
                                                        driver.isActive === false
                                                            ? "status-badge inactive"
                                                            : "status-badge active"
                                                    }
                                                >
                                                    {driver.isActive === false
                                                        ? "Inactive"
                                                        : "Active"}
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>

            {qrData && (
                <div className="qr-modal-overlay">
                    <section className="qr-modal" id="bus-qr-panel">
                        <button
                            type="button"
                            className="qr-modal-close"
                            onClick={function () {
                                setQrData(null);
                            }}
                            aria-label="Close QR code"
                        >
                            ×
                        </button>

                        <h2>Bus QR Code</h2>

                        <p className="qr-modal-description">
                            Scan this QR code to identify the bus and verify student boarding.
                        </p>

                        <div className="qr-bus-number">
                            {qrData.busNumber}
                        </div>

                        <div className="qr-image-container">
                            <img
                                src={qrData.qrCode}
                                alt={"QR code for bus " + qrData.busNumber}
                                className="qr-image"
                            />
                        </div>

                        <div className="qr-modal-actions">
                            <a
                                href={qrData.qrCode}
                                download={qrData.busNumber + "-QR.png"}
                                className="qr-download-button"
                            >
                                Download QR
                            </a>

                            <button
                                type="button"
                                className="qr-print-button"
                                onClick={function () {
                                    window.print();
                                }}
                            >
                                Print QR
                            </button>
                        </div>

                        <p className="qr-instruction">
                            Download and print this QR code. Place it near the entrance
                            of the corresponding bus so students can scan it when boarding.
                        </p>
                    </section>
                </div>
            )}

            <section className="panel">
                <div className="section-heading">
                    <div>
                        <h2>Bus Management</h2>
                        <p>Assign drivers and manage registered buses.</p>
                    </div>
                </div>

                {buses.length === 0 ? (
                    <p>No buses found.</p>
                ) : (
                    <div className="table-wrapper">
                        <table className="admin-table">
                            <thead>
                                <tr>
                                    <th>Bus Number</th>
                                    <th>Bus Name</th>
                                    <th>Destination</th>
                                    <th>Departure</th>
                                    <th>Seats</th>
                                    <th>Assigned Driver</th>
                                    <th>Status</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>

                            <tbody>
                                {buses.map(function (bus) {
                                    const currentDriver = bus.assignedDriver;

                                    const selectedDriverId =
                                        assignments[bus._id] !== undefined
                                            ? assignments[bus._id]
                                            : currentDriver
                                                ? currentDriver._id
                                                : "";

                                    return (
                                        <tr key={bus._id}>
                                            <td>
                                                <strong>{bus.busNumber}</strong>
                                            </td>

                                            <td>{bus.busName}</td>

                                            <td>
                                                {bus.destination
                                                    ? bus.destination.name
                                                    : "Not assigned"}
                                            </td>

                                            <td>{bus.departureTime}</td>

                                            <td>
                                                <strong>
                                                    {bus.availableStudentSeats ?? "—"}
                                                </strong>
                                                <p>
                                                    available /{" "}
                                                    {bus.studentCapacity ?? "—"}{" "}
                                                    student seats
                                                </p>
                                            </td>

                                            <td>
                                                <div className="admin-assignment">
                                                    <select
                                                        value={selectedDriverId}
                                                        onChange={function (event) {
                                                            handleAssignmentChange(
                                                                bus._id,
                                                                event.target.value
                                                            );
                                                        }}
                                                        disabled={bus.isActive === false}
                                                    >
                                                        <option value="">Unassigned</option>

                                                        {activeDrivers.map(function (driver) {
                                                            return (
                                                                <option
                                                                    key={driver._id}
                                                                    value={driver._id}
                                                                >
                                                                    {driver.name}
                                                                </option>
                                                            );
                                                        })}
                                                    </select>

                                                    <button
                                                        type="button"
                                                        className="admin-primary-button"
                                                        onClick={function () {
                                                            handleAssignDriver(bus);
                                                        }}
                                                        disabled={bus.isActive === false}
                                                    >
                                                        Save
                                                    </button>
                                                </div>

                                                {currentDriver && (
                                                    <p>{currentDriver.email}</p>
                                                )}
                                            </td>

                                            <td>
                                                <span
                                                    className={
                                                        bus.isActive === false
                                                            ? "status-badge inactive"
                                                            : "status-badge active"
                                                    }
                                                >
                                                    {bus.isActive === false
                                                        ? "Inactive"
                                                        : "Active"}
                                                </span>
                                            </td>

                                            <td>
                                                <div className="admin-row-actions">
                                                    <button
                                                        type="button"
                                                        className="qr-code-button"
                                                        onClick={function () {
                                                            handleGenerateQr(bus);
                                                        }}
                                                        disabled={
                                                            bus.isActive === false ||
                                                            loadingQrBusId === bus._id
                                                        }
                                                    >
                                                        {loadingQrBusId === bus._id
                                                            ? "Generating..."
                                                            : "Generate QR"}
                                                    </button>

                                                    <button
                                                        type="button"
                                                        className="admin-edit-button"
                                                        onClick={function () {
                                                            handleEditBus(bus);
                                                        }}
                                                        disabled={bus.isActive === false}
                                                    >
                                                        Edit
                                                    </button>

                                                    {bus.isActive !== false && (
                                                        <button
                                                            type="button"
                                                            className="admin-deactivate-button"
                                                            onClick={function () {
                                                                handleDeactivateBus(bus);
                                                            }}
                                                        >
                                                            Deactivate
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>
        </main>
    );
}

export default AdminDashboard;

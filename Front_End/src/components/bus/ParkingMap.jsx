function ParkingBus({ buses, onSelectBus, selectedBusId }) {
    const parkingRows = [
        { name: "Row A", bays: ["A1", "A2", "A3", "A4", "A5"] },
        { name: "Row B", bays: ["B1", "B2", "B3", "B4", "B5"] },
        { name: "Row C", bays: ["C1", "C2", "C3", "C4", "C5"] }
    ];

    function getBusForBay(bayId) {
        return buses.find(function (bus) {
            return (
                bus.mapLocation &&
                String(bus.mapLocation.bayId || "").toUpperCase() === bayId
            );
        });
    }

    function handleBayClick(bayId) {
        const bus = getBusForBay(bayId);

        if (bus && onSelectBus) {
            onSelectBus(bus);
        }
    }

    return (
        <section className="dashboard-map-section">
            <div className="dashboard-section-heading">
                <div>
                    <h2>DIU Bus Parking Map</h2>
                    <p>
                        Select an occupied bay to view its bus information.
                    </p>
                </div>
            </div>

            <div className="transport-map">
                <div className="transport-map-landmark landmark-left">
                    DIU Campus
                </div>

                <div className="transport-map-landmark landmark-right">
                    Pedestrian Walkway
                </div>

                <div className="transport-map-lot">
                    {parkingRows.map(function (row) {
                        return (
                            <div
                                className="transport-parking-row"
                                key={row.name}
                            >
                                <div className="transport-row-label">
                                    {row.name}
                                </div>

                                <div className="transport-bay-grid">
                                    {row.bays.map(function (bayId) {
                                        const bus = getBusForBay(bayId);
                                        const isSelected =
                                            bus && selectedBusId === bus._id;

                                        return (
                                            <button
                                                key={bayId}
                                                type="button"
                                                className={
                                                    "transport-parking-bay" +
                                                    (bus
                                                        ? " bay-occupied"
                                                        : " bay-empty") +
                                                    (isSelected
                                                        ? " bay-selected"
                                                        : "")
                                                }
                                                onClick={function () {
                                                    handleBayClick(bayId);
                                                }}
                                                disabled={!bus}
                                                title={
                                                    bus
                                                        ? `Bus ${bus.busNumber} — ${bayId}`
                                                        : `${bayId} — no bus assigned`
                                                }
                                            >
                                                {bus ? (
                                                    <>
                                                        <span className="transport-bus-icon">
                                                            🚌
                                                        </span>
                                                        <strong>
                                                            {bus.busNumber}
                                                        </strong>
                                                    </>
                                                ) : (
                                                    <span className="transport-empty-bay">
                                                        Available
                                                    </span>
                                                )}

                                                <span className="transport-bay-label">
                                                    {bayId}
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}

                    <div className="transport-entrance">
                        <span>↓</span>
                        Main Entrance
                    </div>
                </div>
            </div>

            <div className="transport-map-legend">
                <span>
                    <i className="legend-occupied"></i>
                    Assigned bus
                </span>
                <span>
                    <i className="legend-empty"></i>
                    Empty bay
                </span>
                <span>
                    <i className="legend-selected"></i>
                    Selected bus
                </span>
            </div>

            <p className="map-note">
                You can view the location on the row and the Bay.This is custom.
                In future we expect to see the actual version of the map. Let's keep that
                for future implementation.
            </p>
        </section>
    );
}

export default ParkingBus;
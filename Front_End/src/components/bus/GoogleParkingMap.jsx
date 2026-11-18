
import { useEffect, useRef, useState } from "react";
import {
    APIProvider,
    Map,
    AdvancedMarker,
    Pin
} from "@vis.gl/react-google-maps";

const DIU_LOCATION = {
    lat: 23.87624243123494,
    lng: 90.3220143047258
};

function BusLocationMarker({
    bus,
    isSelected,
    onSelectBus
}) {
    const latitude = Number(bus.mapLocation.latitude);
    const longitude = Number(bus.mapLocation.longitude);

    const [position, setPosition] = useState({
        lat: latitude,
        lng: longitude
    });

    const currentPositionRef = useRef({
        lat: latitude,
        lng: longitude
    });

    useEffect(function () {
        const startPosition = currentPositionRef.current;

        const targetPosition = {
            lat: latitude,
            lng: longitude
        };

        const startTime = performance.now();
        const duration = 8500;

        let animationFrame;

        function animate(currentTime) {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);

            const smoothProgress =
                progress * progress * (3 - 2 * progress);

            const nextPosition = {
                lat:
                    startPosition.lat +
                    (targetPosition.lat - startPosition.lat) *
                    smoothProgress,

                lng:
                    startPosition.lng +
                    (targetPosition.lng - startPosition.lng) *
                    smoothProgress
            };

            currentPositionRef.current = nextPosition;
            setPosition(nextPosition);

            if (progress < 1) {
                animationFrame = requestAnimationFrame(animate);
            } else {
                currentPositionRef.current = targetPosition;
                setPosition(targetPosition);
            }
        }

        if (
            startPosition.lat === targetPosition.lat &&
            startPosition.lng === targetPosition.lng
        ) {
            return;
        }

        animationFrame = requestAnimationFrame(animate);

        return function () {
            cancelAnimationFrame(animationFrame);
        };
    }, [latitude, longitude]);

    return (
        <AdvancedMarker
            position={position}
            title={`Bus ${bus.busNumber} - ${bus.mapLocation.status}`}
            onClick={function () {
                if (onSelectBus) {
                    onSelectBus(bus);
                }
            }}
        >
            <Pin
                background={isSelected ? "#16a34a" : "#2563eb"}
                borderColor={isSelected ? "#15803d" : "#1e40af"}
                glyphColor="#ffffff"
            />
        </AdvancedMarker>
    );
}

function GoogleParkingMap({
    buses = [],
    selectedBusId,
    onSelectBus
}) {
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

    if (!apiKey) {
        return <p>Google Maps API key is missing.</p>;
    }

    const busesWithLocation = buses.filter(function (bus) {
        const location = bus.mapLocation;

        if (!location) {
            return false;
        }

        const latitude = Number(location.latitude);
        const longitude = Number(location.longitude);

        return (
            location.isLocationSharing === true &&
            location.status !== "offline" &&
            location.latitude !== null &&
            location.latitude !== undefined &&
            location.longitude !== null &&
            location.longitude !== undefined &&
            Number.isFinite(latitude) &&
            Number.isFinite(longitude) &&
            latitude >= -90 &&
            latitude <= 90 &&
            longitude >= -180 &&
            longitude <= 180
        );
    });

    const selectedBus = busesWithLocation.find(function (bus) {
        return bus._id === selectedBusId;
    });

    let mapCenter = DIU_LOCATION;

    if (selectedBus) {
        mapCenter = {
            lat: Number(selectedBus.mapLocation.latitude),
            lng: Number(selectedBus.mapLocation.longitude)
        };
    } else if (busesWithLocation.length > 0) {
        mapCenter = {
            lat: Number(busesWithLocation[0].mapLocation.latitude),
            lng: Number(busesWithLocation[0].mapLocation.longitude)
        };
    }

    return (
        <section className="google-parking-map">
            <div className="dashboard-section-heading">
                <div>
                    <h2>Live Bus Locations</h2>
                    <p>
                        View buses using their latest GPS locations.
                    </p>
                </div>
            </div>

            {busesWithLocation.length === 0 && (
                <p className="dashboard-message">
                    No buses are currently sharing their GPS locations.
                </p>
            )}

            <APIProvider apiKey={apiKey} region="BD" language="en">
                <div style={{ width: "100%", height: "500px" }}>
                    <Map
                        center={mapCenter}
                        defaultZoom={15}
                        mapId="DEMO_MAP_ID"
                        mapTypeControl={true}
                        fullscreenControl={true}
                        streetViewControl={true}
                        style={{ width: "100%", height: "100%" }}
                    >
                        <AdvancedMarker
                            position={DIU_LOCATION}
                            title="DIU Transport Section"
                        >
                            <Pin
                                background="#16a34a"
                                borderColor="#15803d"
                                glyphColor="#ffffff"
                                glyph="D"
                            />
                        </AdvancedMarker>

                        {busesWithLocation.map(function (bus) {
                            return (
                                <BusLocationMarker
                                    key={bus._id}
                                    bus={bus}
                                    isSelected={bus._id === selectedBusId}
                                    onSelectBus={onSelectBus}
                                />
                            );
                        })}
                    </Map>
                </div>
            </APIProvider>

            <div className="dashboard-bus-extra">
                <p>
                    <strong>GPS-sharing buses:</strong>{" "}
                    {busesWithLocation.length}
                </p>

                {selectedBus && (
                    <>
                        <p>
                            <strong>Selected bus:</strong>{" "}
                            {selectedBus.busNumber}
                        </p>

                        <p>
                            <strong>Status:</strong>{" "}
                            {selectedBus.mapLocation.status}
                        </p>

                        <p>
                            <strong>Direction:</strong>{" "}
                            {selectedBus.mapLocation.direction === "to_diu"
                                ? "Going to DIU"
                                : selectedBus.mapLocation.direction === "from_diu"
                                    ? "Leaving DIU"
                                    : "Not specified"}
                        </p>

                        <p>
                            <strong>GPS coordinates:</strong>{" "}
                            {selectedBus.mapLocation.latitude},{" "}
                            {selectedBus.mapLocation.longitude}
                        </p>

                        <p>
                            <strong>Last GPS update:</strong>{" "}
                            {selectedBus.mapLocation.updatedAt
                                ? new Date(
                                    selectedBus.mapLocation.updatedAt
                                ).toLocaleString()
                                : "Not available"}
                        </p>
                    </>
                )}
            </div>
        </section>
    );
}

export default GoogleParkingMap;

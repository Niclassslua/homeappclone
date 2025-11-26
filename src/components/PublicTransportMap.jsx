import React, { useState, useRef, useMemo, useEffect, useCallback, memo } from "react";
import ReactDOM from "react-dom";
import { MapContainer, TileLayer, Marker, useMap } from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-markercluster";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import stationsData from "../data/stations.json";

import { LocateControl } from "leaflet.locatecontrol";
import "leaflet.locatecontrol/dist/L.Control.Locate.min.css";
import "leaflet-edgebuffer";

// Konfigurationen für den TileLayer
const TILE_LAYER_URL =
    "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";
const ATTRIBUTION =
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/">CARTO</a>';
const mapContainerStyle = "w-screen h-screen absolute top-0 left-0";

// Aktivieren der CSS-Transitionen von Leaflet
L.DomUtil.TRANSITION = true;

// Debounce-Hook
function useDebounce(value, delay) {
    const [debouncedValue, setDebouncedValue] = useState(value);
    useEffect(() => {
        const handler = setTimeout(() => setDebouncedValue(value), delay);
        return () => clearTimeout(handler);
    }, [value, delay]);
    return debouncedValue;
}

// Map-Events für Zoom- und Bounds-Updates
function MapEvents({ onZoomChange, onBoundsChange }) {
    const map = useMap();
    useEffect(() => {
        const updateBounds = () => onBoundsChange(map.getBounds());
        const updateZoom = () => onZoomChange(map.getZoom());

        map.on("moveend", updateBounds);
        map.on("zoomend", () => {
            updateZoom();
            updateBounds();
        });

        // Initial einmal Bounds & Zoom setzen
        updateZoom();
        updateBounds();

        return () => {
            map.off("moveend", updateBounds);
            map.off("zoomend", updateZoom);
        };
    }, [map, onZoomChange, onBoundsChange]);
    return null;
}

/**
 * StationModal
 * - Ruft beim Mounten per fetch Echtzeit-Abfahrten vom Backend ab (Endpoint: /station-data)
 * - Dabei wird station.hafasID als Parameter genutzt.
 * - Für jede Journey werden alle Stops verarbeitet und anhand des ersten Teils der Linien-ID (vor "-")
 *   gruppiert. So erhältst du für jede Linie (z. B. "46") eine Liste mit geplanten und Echtzeit-Abfahrten.
 */
function StationModal({ station, onClose }) {
    const [departures, setDepartures] = useState([]);
    const [loadingDepartures, setLoadingDepartures] = useState(true);
    const [error, setError] = useState(null);
    // Neuer State: Array mit ausgewählten Linien
    const [selectedLines, setSelectedLines] = useState([]);

    // Fetch-Abfrage – neu ausführen, wenn station.hafasID oder selectedLines sich ändern.
    useEffect(() => {
        async function fetchDepartures() {
            try {
                const requestBody = { stationId: station.hafasID };
                // Wenn mindestens eine Linie ausgewählt ist, mitgeben
                if (selectedLines.length > 0) {
                    requestBody.selectedLines = selectedLines;
                }
                const response = await fetch("http://localhost:5001/station-data", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(requestBody),
                });
                const result = await response.json();
                // Extrahiere für jede Journey den ersten Stop
                const journeys = result.data.station.journeys.elements;
                const depArray = journeys
                    .map((journey) => {
                        if (journey.stops && journey.stops.length > 0) {
                            const stop = journey.stops[0];
                            return {
                                lineGroup: journey.line.id.split("-")[0], // z. B. "46" aus "46-46"
                                planned: stop.plannedDeparture?.isoString || "n/a",
                                realtime: stop.realtimeDeparture?.isoString || "n/a",
                                destination: stop.destinationLabel || "unbekannt",
                                platform: stop.pole?.platform?.label || "n/a",
                                journeyType: journey.type || "unbekannt",
                            };
                        }
                        return null;
                    })
                    .filter((d) => d !== null);
                // Sortiere nach geplanter Abfahrt
                depArray.sort((a, b) => new Date(a.planned) - new Date(b.planned));
                setDepartures(depArray);
            } catch (e) {
                console.error("Fehler beim Abrufen der Abfahrten:", e);
                setError(e.message);
            } finally {
                setLoadingDepartures(false);
            }
        }
        fetchDepartures();
    }, [station.hafasID, selectedLines]);

    // Klickbare Linienfilter: Mehrfachauswahl möglich
    const toggleLineSelection = (lineGroup) => {
        setSelectedLines((prev) => {
            if (prev.includes(lineGroup)) {
                // Linie ist bereits ausgewählt, also entfernen
                return prev.filter((l) => l !== lineGroup);
            } else {
                // Linie hinzufügen
                return [...prev, lineGroup];
            }
        });
    };

    // Klickbare Linienfilter: Mehrfachauswahl möglich
    const renderLineFilter = (line) => {
        const isSelected = selectedLines.includes(line.lineGroup);
        // Wenn noch keine Linie ausgewählt ist, verwende die Originalfarbe; andernfalls grau für nicht ausgewählte
        const backgroundColor =
            selectedLines.length === 0
                ? (line.primaryColor || "#000")
                : (isSelected ? (line.primaryColor || "#000") : "#555");
        return (
            <div
                key={line.lineGroup}
                onClick={() => toggleLineSelection(line.lineGroup)}
                style={{
                    backgroundColor: backgroundColor,
                    minWidth: "22px",
                    height: "22px",
                    borderRadius: "3px",
                    fontSize: "13px",
                    fontWeight: "600",
                    color: "white",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "0 5px",
                    cursor: "pointer",
                }}
            >
                {line.lineGroup}
            </div>
        );
    };

    // Ermittle eindeutige Linien aus station.lineSummaries (wie bisher)
    const filteredLines = (station.lineSummaries || [])
        .filter(
            (ls) =>
                /^\d/.test(ls.lineGroup) && ls.lineGroup !== "4346" && ls.type !== null
        );
    const uniqueLinesMap = new Map();
    filteredLines.forEach((ls) => {
        if (!uniqueLinesMap.has(ls.lineGroup)) {
            uniqueLinesMap.set(ls.lineGroup, ls);
        }
    });
    const uniqueLines = Array.from(uniqueLinesMap.values());
    uniqueLines.sort(
        (a, b) => parseInt(a.lineGroup, 10) - parseInt(b.lineGroup, 10)
    );

    const renderDepartureRow = (dep, index) => {
        const now = new Date();
        const plannedDate = new Date(dep.planned);
        const minutesUntil = Math.max(Math.round((plannedDate - now) / 60000), 0);
        const realtimeDate = new Date(dep.realtime);
        const delayMinutes = Math.max(Math.round((realtimeDate - plannedDate) / 60000), 0);

        const lineInfo = uniqueLines.find((ls) => ls.lineGroup === dep.lineGroup);
        const lineColor = (lineInfo && lineInfo.primaryColor) || "#000";

        const lineSquare = (
            <div
                style={{
                    backgroundColor: lineColor,
                    width: "35px",
                    height: "35px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "white",
                    fontSize: "18px",
                    fontWeight: "500",
                    marginRight: "8px",
                    borderRadius: "3px",
                }}
            >
                {dep.lineGroup}
            </div>
        );

        const transportIconHtml = createTransportIconHtml(dep.journeyType, 30, 30);
        const transportIcon = (
            <div style={{ marginRight: "8px" }} dangerouslySetInnerHTML={{ __html: transportIconHtml }} />
        );

        // Ersetze den bisherigen departureDisplay-Block durch diesen:
        const departureDisplay = (
            <div style={{ position: "relative", textAlign: "center" }}>
                {minutesUntil > 30 ? (
                    <div style={{ fontSize: "20px", fontWeight: "700" }}>
                        {plannedDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </div>
                ) : (
                    <div style={{ fontSize: "25px", fontWeight: "700" }}>
                        {minutesUntil}
                    </div>
                )}
                {delayMinutes > 0 && (
                    <div
                        style={{
                            position: "absolute",
                            top: '-5px',
                            right: '-7.5px',
                            color: "orange",
                            fontSize: "12px",
                            fontWeight: "bold",
                        }}
                    >
                        +{delayMinutes}
                    </div>
                )}
                {minutesUntil <= 30 && (
                    <div style={{ fontSize: "16px", fontWeight: "500" }}>Min.</div>
                )}
            </div>
        );

        return (
            <div
                key={index}
                style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "8px 0",
                    borderBottom: "1px solid #4B5563",
                }}
            >
                <div style={{ display: "flex", alignItems: "center" }}>
                    <div style={{ marginRight: "6px" }}>{lineSquare}</div>
                    <div style={{ marginRight: "6px" }}>{transportIcon}</div>
                    <div style={{ marginRight: "16px" }}>
                        <div style={{ fontWeight: "500" }}>{dep.destination}</div>
                        <div style={{ fontWeight: "200" }}>Steig {dep.platform}</div>
                    </div>
                </div>
                {departureDisplay}
            </div>
        );
    };

    const overlayStyle = {
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        background: "rgba(0, 0, 0, 0.8)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 9999,
    };

    const modalStyle = {
        padding: "20px",
        borderRadius: "8px",
        width: "85%",
        maxWidth: "500px",
        color: "white",
        maxHeight: "90vh",
        overflowY: "auto",
    };

    const headerStyle = { textAlign: "left", marginBottom: "10px" };
    const stationNameStyle = { fontSize: "24px", fontWeight: "bold" };
    const subTitleStyle = { fontSize: "14px", fontWeight: 600, color: "#E0E1E5", marginBottom: "7px" };
    const buttonStyle = {
        background: "#4B5563",
        color: "white",
        padding: "10px 20px",
        borderRadius: "4px",
        border: "none",
        cursor: "pointer",
        marginTop: "20px",
    };

    return (
        <div style={overlayStyle}>
            <div className="bg-neutral-900 bg-opacity-70" style={modalStyle}>
                {/* Header */}
                <div style={headerStyle}>
                    <div style={stationNameStyle}>{station.name}</div>
                    <div style={subTitleStyle}>Haltestelle</div>
                    {/* Klickbare Linienfilter */}
                    <div style={{ marginBottom: "20px", display: "flex", gap: "5px", flexWrap: "wrap" }}>
                        {uniqueLines.map(renderLineFilter)}
                    </div>
                    <div style={{ fontSize: "20px", fontWeight: 800, color: "#E0E1E5" }}>
                        Abfahrten
                    </div>
                </div>
                {/* Abfahrtenliste */}
                {loadingDepartures ? (
                    <div>Loading...</div>
                ) : error ? (
                    <div style={{ color: "red" }}>{error}</div>
                ) : (
                    <div>{departures.map((dep, idx) => renderDepartureRow(dep, idx))}</div>
                )}
                <button onClick={onClose} style={buttonStyle}>
                    Schließen
                </button>
            </div>
        </div>
    );
}

function createTransportIconHtml(transportTypes, width = 20, height = 20) {
    // Falls width und height als Zahl übergeben werden, füge "px" hinzu.
    const w = typeof width === 'number' ? `${width}px` : width;
    const h = typeof height === 'number' ? `${height}px` : height;

    if (transportTypes.includes("STADTBUS") && transportTypes.includes("STRASSENBAHN")) {
        return `
      <div style="display: flex; gap: 4px;">
        <div style="width:${w}; height:${h}; background-color:white; -webkit-mask: url('/icons/transport/lightrail.fill.svg') center/contain no-repeat; mask: url('/icons/transport/lightrail.fill.svg') center/contain no-repeat;"></div>
        <div style="width:${w}; height:${h}; background-color:white; -webkit-mask: url('/icons/transport/bus.fill.svg') center/contain no-repeat; mask: url('/icons/transport/bus.fill.svg') center/contain no-repeat;"></div>
      </div>
    `;
    } else if (transportTypes.includes("STADTBUS")) {
        return `<div style="width:${w}; height:${h}; background-color:white; -webkit-mask: url('/icons/transport/bus.fill.svg') center/contain no-repeat; mask: url('/icons/transport/bus.fill.svg') center/contain no-repeat;"></div>`;
    } else if (transportTypes.includes("STRASSENBAHN")) {
        return `<div style="width:${w}; height:${h}; background-color:white; -webkit-mask: url('/icons/transport/lightrail.fill.svg') center/contain no-repeat; mask: url('/icons/transport/lightrail.fill.svg') center/contain no-repeat;"></div>`;
    } else {
        return `<div style="width:${w}; height:${h};"></div>`;
    }
}

function createStationIcon(station) {
    const transportTypes = station.transportTypes || [];
    const transportIconHtml = createTransportIconHtml(transportTypes);

    // Linien deduplizieren und sortieren
    const linesMap = new Map();
    (station.lineSummaries || [])
        .filter(
            (ls) =>
                /^\d/.test(ls.lineGroup) && ls.lineGroup !== "4346" && ls.type !== null
        )
        .forEach((ls) => {
            if (!linesMap.has(ls.lineGroup)) {
                linesMap.set(ls.lineGroup, ls);
            }
        });
    const uniqueLines = Array.from(linesMap.values());
    uniqueLines.sort((a, b) => parseInt(a.lineGroup, 10) - parseInt(b.lineGroup, 10));

    const maxLinesDisplay = 4;
    let displayedLines;
    let extraCount = 0;
    if (uniqueLines.length > maxLinesDisplay) {
        displayedLines = uniqueLines.slice(0, maxLinesDisplay);
        extraCount = uniqueLines.length - maxLinesDisplay;
    } else {
        displayedLines = uniqueLines;
    }
    const linesHtml =
        displayedLines
            .map(
                (ls) =>
                    `<div style="width:22px;height:16px;background:${ls.primaryColor || "#000"};margin-right:2px;border-radius:2px;font-size:10px;font-weight:600;color:white;display:inline-block;text-align:center;">${ls.lineGroup}</div>`
            )
            .join("") +
        (extraCount > 0
            ? `<div style="width:22px;height:16px;background:#555;margin-right:2px;border-radius:2px;font-size:10px;color:white;display:inline-block;text-align:center;">+${extraCount}</div>`
            : "");

    const html = `
    <div style="pointer-events: auto; display: flex; flex-direction: column; align-items: center; min-width: 60px;">
      <div>
         <div style="width:30px; height:30px; display: flex; align-items: center; justify-content: center;">
           ${transportIconHtml}
         </div>
      </div>
      <div style="color: white; font-size: 12px; font-weight: 600; text-align: center;">
         ${station.name}
      </div>
      <div style="display: flex; margin-top: 4px;">
         ${linesHtml}
      </div>
    </div>
  `;

    return L.divIcon({
        html,
        className: "custom-marker-icon",
        iconAnchor: [20, 20],
    });
}

function getCachedStationIcon(station, iconCache) {
    const key = station.id || station.name;
    if (iconCache.has(key)) return iconCache.get(key);
    const icon = createStationIcon(station);
    iconCache.set(key, icon);
    return icon;
}

const StationMarker = memo(function StationMarker({ station, onMarkerClick, iconCache }) {
    const { lat, long } = station.poles[0].location;
    return (
        <Marker
            position={[lat, long]}
            icon={getCachedStationIcon(station, iconCache)}
            eventHandlers={{
                click: () => {
                    console.log("Marker clicked:", station);
                    onMarkerClick(station);
                },
            }}
        />
    );
});

export default function PublicTransportMap() {
    const [zoomLevel, setZoomLevel] = useState(12);
    const [rawBounds, setRawBounds] = useState(null);
    const [modalStation, setModalStation] = useState(null);
    const [filterText, setFilterText] = useState("");
    const iconCache = useRef(new Map());

    const bounds = useDebounce(rawBounds, 300);

    const visibleStations = useMemo(() => {
        if (!stationsData?.stations) return [];
        return stationsData.stations.filter((station) => {
            if (
                !station.poles ||
                station.poles.length === 0 ||
                !station.transportTypes ||
                station.transportTypes.length === 0
            )
                return false;
            if (filterText && !station.name.toLowerCase().includes(filterText.toLowerCase())) {
                return false;
            }
            if (!bounds) return true;
            const { lat, long } = station.poles[0].location;
            return bounds.contains(L.latLng(lat, long));
        });
    }, [bounds, filterText]);

    const handleMapCreated = (map) => {
        setTimeout(() => map.invalidateSize(), 500);
        const locateControl = new LocateControl({
            position: "topleft",
            strings: { title: "Meine Position anzeigen" },
            drawCircle: true,
            drawMarker: true,
        });
        map.addControl(locateControl);
    };

    const handleMarkerClick = useCallback((station) => {
        console.log("handleMarkerClick triggered:", station);
        setModalStation(station);
    }, []);

    return (
        <>
            <MapContainer
                center={[49.4746, 8.4556]}
                zoom={zoomLevel}
                className={mapContainerStyle}
                zoomAnimation={true}
                fadeAnimation={false}
                markerZoomAnimation={true}
                updateWhenIdle={true}
                whenCreated={handleMapCreated}
            >
                <TileLayer
                    url={TILE_LAYER_URL}
                    attribution={ATTRIBUTION}
                    edgeBuffer={256}
                    keepBuffer={64}
                />
                <MapEvents
                    onZoomChange={(z) => setZoomLevel(z)}
                    onBoundsChange={(b) => setRawBounds(b)}
                />
                <MarkerClusterGroup
                    disableClusteringAtZoom={18}
                    maxClusterRadius={90}
                    chunkedLoading={true}
                    zoomToBoundsOnClick={true}
                >
                    {visibleStations.map((station, index) => (
                        <StationMarker
                            key={station.id || index}
                            station={station}
                            onMarkerClick={handleMarkerClick}
                            iconCache={iconCache.current}
                        />
                    ))}
                </MarkerClusterGroup>
            </MapContainer>

            {/* Modal via Portal rendern */}
            {modalStation &&
                ReactDOM.createPortal(
                    <StationModal station={modalStation} onClose={() => setModalStation(null)} />,
                    document.body
                )}
        </>
    );
}
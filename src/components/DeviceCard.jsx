// src/components/DeviceCard.jsx
import React from 'react';
import { ReactSVG } from 'react-svg';
import { getIconUrl, getOffColor } from '../utils/helpers';

export default function DeviceCard({ device, onToggle }) {
    // Heizung-spezifische Logik
    const isHeater = device.humanType === "Thermostat";
    
    // Aktuelle Temperatur formatieren (1 Dezimalstelle, Komma)
    const formatTemperature = (temp) => {
        if (temp === undefined || temp === null || isNaN(temp)) return '0,0°';
        return parseFloat(temp).toFixed(1).replace('.', ',') + '°';
    };
    
    // Status-Text für Heizung
    const getHeaterStatusText = () => {
        if (!device.isOn || device.targetTemperature === null || device.targetTemperature === undefined) {
            return 'Aus';
        }
        const target = parseFloat(device.targetTemperature).toFixed(1).replace('.', ',');
        return `Auf ${target}° heizen`;
    };

    return (
        <div
            onClick={() => onToggle(device)}
            className="cursor-pointer rounded-2xl shadow-lg p-3 transition-all duration-300 hover:scale-105 flex items-center"
            style={{
                backgroundColor: device.isOn ? "rgba(255,255,255,0.9)" : "rgba(40,40,40,0.90)"
            }}
        >
            {/* Temperaturanzeige (links) - nur für Heizung */}
            {isHeater ? (
                <div
                    className="flex-shrink-0 flex items-center justify-center mr-4"
                    style={{
                        width: "48px",
                        height: "48px"
                    }}
                >
                    <span
                        style={{
                            fontSize: "18px",
                            fontWeight: "600",
                            color: device.isOn ? "#F28D2C" : "#FFFFFF"
                        }}
                    >
                        {formatTemperature(device.currentTemperature)}
                    </span>
                </div>
            ) : (
                <div
                    className="flex-shrink-0 rounded-full flex items-center justify-center mr-4"
                    style={{
                        width: "48px",
                        height: "48px",
                        backgroundColor: device.isOn ? getOffColor(device.humanType) : "#FFFFFF"
                    }}
                >
                    <ReactSVG
                        src={getIconUrl(device)}
                        beforeInjection={(svg) => {
                            svg.setAttribute("width", "24px");
                            svg.setAttribute("height", "24px");
                            svg.querySelectorAll("*").forEach((el) => {
                                el.removeAttribute("fill");
                                el.setAttribute("fill", device.isOn ? "#FFFFFF" : getOffColor(device.humanType));
                            });
                        }}
                    />
                </div>
            )}
            
            {/* Textbereich (rechts) */}
            <div className="flex flex-col">
                <span
                    className="text-sm font-medium truncate overflow-hidden whitespace-nowrap"
                    style={{
                        maxWidth: "100px",
                        color: device.isOn ? "#000000" : "#FFFFFF",
                        transition: "color 300ms"
                    }}
                >
                    {device.name}
                </span>
                <span className="text-base text-gray-400">
                    {isHeater
                        ? getHeaterStatusText()
                        : device.humanType === "Lightbulb"
                            ? (device.isOn ? `${device.brightness}%` : "Aus")
                            : device.humanType === "Window Covering"
                                ? (device.isOn ? "Geöffnet" : "Geschlossen")
                                : (device.isOn ? "An" : "Aus")}
                </span>
            </div>
        </div>
    );
}

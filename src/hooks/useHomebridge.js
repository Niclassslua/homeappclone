// src/hooks/useHomebridge.js
import { useState, useEffect } from 'react';
import { login, fetchDevices, toggleDeviceApi, updateDeviceSettings as updateDeviceSettingsApi } from '../api/homebridgeApi';
import { overrides } from '../config/overrides';
import { excludedDevices } from '../config/constants';
import { getReadCharacteristicType } from '../utils/helpers'; // Hilfsfunktion für ReadCharacteristic

// Diese Funktion konvertiert HSL zu RGB und dann zu HEX.
function hsToHex(h, s) {
    // Fixe Lightness von 50%
    let l = 50;
    s = s / 100;
    l = l / 100;

    const c = (1 - Math.abs(2 * l - 1)) * s;
    const x = c * (1 - Math.abs((h / 60) % 2 - 1));
    const m = l - c / 2;
    let r1, g1, b1;
    if (h < 60) {
        r1 = c; g1 = x; b1 = 0;
    } else if (h < 120) {
        r1 = x; g1 = c; b1 = 0;
    } else if (h < 180) {
        r1 = 0; g1 = c; b1 = x;
    } else if (h < 240) {
        r1 = 0; g1 = x; b1 = c;
    } else if (h < 300) {
        r1 = x; g1 = 0; b1 = c;
    } else {
        r1 = c; g1 = 0; b1 = x;
    }

    const r = Math.round((r1 + m) * 255);
    const g = Math.round((g1 + m) * 255);
    const b = Math.round((b1 + m) * 255);

    // Helper-Funktion, um eine Zahl in einen zweistelligen HEX-String zu konvertieren
    const toHex = (num) => num.toString(16).padStart(2, '0');
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
}

export default function useHomebridge() {
    const [devices, setDevices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [token, setToken] = useState(null);
    const updateLocalDevice = (deviceId, updates) => {
        setDevices(prev => prev.map(dev => dev.id === deviceId ? { ...dev, ...updates } : dev));
    };

    useEffect(() => {
        async function fetchToken() {
            try {
                const data = await login();
                if (data.access_token) {
                    setToken(data.access_token);
                    localStorage.setItem("homebridge_token", data.access_token);
                }
            } catch (error) {
                console.error("Fehler beim Abrufen des Tokens:", error);
            }
        }
        fetchToken();
    }, []);

    useEffect(() => {
        if (!token) return;
        async function loadDevices() {
            try {
                const data = await fetchDevices(token);
                // Filtere und transformiere die Daten
                const filteredData = data
                    .filter(acc => acc.humanType !== "Protocol Information")
                    .filter(acc => acc.humanType !== "Input Source")
                    .filter(acc => !excludedDevices.includes(acc.uniqueId));

                // Innerhalb deiner loadDevices-Funktion:
                const transformedDevices = filteredData.map((accessory, index) => {
                    const override = overrides.find(o => o.uniqueId === accessory.uniqueId);
                    const deviceName = override?.customName ?? accessory.serviceName;
                    const deviceRoom = override?.customRoom ?? accessory.instance?.name ?? "Unbekannt";
                    const isThermostat = accessory.humanType === "Thermostat" && accessory.serviceName === "Heizung";
                    const isOn = isThermostat
                        ? accessory.values?.TargetHeatingCoolingState === 1
                        : accessory.values?.[getReadCharacteristicType(accessory.humanType)] === 1;

                    // Extrahiere Brightness:
                    const brightness = accessory.values?.Brightness ?? 100;

                    // Extrahiere Farbe:
                    // Falls Hue und Saturation vorhanden sind, konvertiere diese in einen HEX-Farbwert.
                    let color = '#FFFFFF';
                    if (accessory.values?.Hue !== undefined && accessory.values?.Saturation !== undefined) {
                        color = hsToHex(accessory.values.Hue, accessory.values.Saturation);
                    }

                    return {
                        id: accessory.uniqueId || index,
                        name: deviceName,
                        humanType: accessory.humanType,
                        isOn,
                        room: deviceRoom,
                        customIconOff: override?.customIconOff,
                        customIconOn: override?.customIconOn,
                        currentTemperature: isThermostat ? accessory.values?.CurrentTemperature : null,
                        targetTemperature: isThermostat ? accessory.values?.TargetTemperature : null,
                        brightness, // Neu hinzugefügt
                        color,      // Neu hinzugefügt
                    };
                });
                setDevices(transformedDevices);
            } catch (error) {
                console.error("Fehler beim Laden der Geräte:", error);
            } finally {
                setLoading(false);
            }
        }
        loadDevices();
    }, [token]);

    const toggleDevice = async (device) => {
        if (!device) return;
        const newState = !device.isOn;
        const characteristicType = device.humanType === "Thermostat"
            ? "TargetHeatingCoolingState"
            : (device.humanType === "Air Purifier" ||
                device.humanType === "Heater Cooler" ||
                device.humanType === "Fan" ||
                device.humanType === "Humidifier Dehumidifier" ||
                device.humanType === "Ventilation Fan" ||
                device.humanType === "Television" ? "Active" : "On");
        const payloadValue = newState ? 1 : 0;

        try {
            const response = await toggleDeviceApi(token, device.id, characteristicType, payloadValue);
            if (!response.ok) {
                console.error("Fehler beim Umschalten des Geräts");
                return;
            }
            setDevices(prev => prev.map(dev => dev.id === device.id ? { ...dev, isOn: newState } : dev));
        } catch (error) {
            console.error("Fehler beim Umschalten des Geräts:", error);
        }
    };

    // Funktion zum Aktualisieren der Farbe und Helligkeit über die API
    const updateDeviceSettings = async (device, settings) => {
        try {
            if (process.env.NODE_ENV === 'development') {
                console.log('[useHomebridge] updateDeviceSettings start', { deviceId: device?.id, humanType: device?.humanType, settings });
            }
            const response = await updateDeviceSettingsApi(token, device, settings);
            if (!response || !response.ok) {
                console.error("Fehler beim Aktualisieren des Geräts");
            } else {
                console.log("Geräteeinstellungen aktualisiert", {
                    ok: response.ok,
                    statuses: response.responses?.map(r => ({ ok: r?.ok, status: r?.status }))
                });
            }
        } catch (error) {
            console.error("Fehler beim Aktualisieren des Geräts:", error);
        }
    };

    return { devices, loading, toggleDevice, updateDeviceSettings, updateLocalDevice };
}

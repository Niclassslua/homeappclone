// src/api/homebridgeApi.js
//const CORS_PROXY = "http://192.168.178.3:5654/";
const CORS_PROXY = "http://92.60.64.163:5654/";
const API_URL = process.env.REACT_APP_HOMEBRIDGE_API_URL;
const USERNAME = process.env.REACT_APP_HOMEBRIDGE_USER;
const PASSWORD = process.env.REACT_APP_HOMEBRIDGE_PASS;

export async function login() {
    const response = await fetch(`${CORS_PROXY}${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: USERNAME, password: PASSWORD })
    });
    return response.json();
}

export async function fetchDevices(token) {
    const response = await fetch(`${CORS_PROXY}${API_URL}/accessories`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    return response.json();
}

export async function toggleDeviceApi(token, deviceId, characteristicType, payloadValue) {
    const response = await fetch(`${CORS_PROXY}${API_URL}/accessories/${deviceId}`, {
        method: 'PUT',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ characteristicType, value: payloadValue })
    });
    return response;
}

/**
 * Konvertiert einen HEX-Farbwert in Hue und Saturation.
 */
function rgbToHueSaturation(rgb) {
    let r = parseInt(rgb.substring(1, 3), 16) / 255;
    let g = parseInt(rgb.substring(3, 5), 16) / 255;
    let b = parseInt(rgb.substring(5, 7), 16) / 255;

    let max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;

    if (max === min) {
        h = s = 0;
    } else {
        let d = max - min;
        s = d / (1 - Math.abs(2 * l - 1));
        switch (max) {
            case r: h = ((g - b) / d + (g < b ? 6 : 0)) * 60; break;
            case g: h = ((b - r) / d + 2) * 60; break;
            case b: h = ((r - g) / d + 4) * 60; break;
            default: break;
        }
    }
    return { hue: Math.round(h), saturation: Math.round(s * 100) };
}

/**
 * Aktualisiert die Geräte-Einstellungen (Brightness, Hue, Saturation, On)
 * in separaten Requests.
 */
export async function updateDeviceSettings(token, device, settings) {
    const deviceId = device.id;
    const responses = [];
    if (process.env.NODE_ENV === 'development') {
        console.log('[homebridgeApi] updateDeviceSettings input', { deviceId, humanType: device.humanType, settings });
    }
    try {
        if (device.humanType === "Thermostat") {
            if (settings.targetTemperature !== undefined) {
                const res = await fetch(`${CORS_PROXY}${API_URL}/accessories/${deviceId}`, {
                    method: 'PUT',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        characteristicType: "TargetTemperature",
                        value: settings.targetTemperature
                    })
                });
                responses.push(res);
            }
            if (settings.isOn !== undefined) {
                const res = await fetch(`${CORS_PROXY}${API_URL}/accessories/${deviceId}`, {
                    method: 'PUT',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        characteristicType: "TargetHeatingCoolingState",
                        value: settings.isOn ? 1 : 0
                    })
                });
                responses.push(res);
            }
        } else if (device.humanType === "Air Purifier") {
            // Hier interpretieren wir settings.brightness als RotationSpeed.
            if (settings.brightness !== undefined) {
                const res = await fetch(`${CORS_PROXY}${API_URL}/accessories/${deviceId}`, {
                    method: 'PUT',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        characteristicType: "RotationSpeed",
                        value: settings.brightness
                    })
                });
                responses.push(res);
            }
            // Setze den On/Off-Status mit der "Active"-Eigenschaft.
            const onValue = settings.brightness > 0 ? 1 : 0;
            const res = await fetch(`${CORS_PROXY}${API_URL}/accessories/${deviceId}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    characteristicType: "Active",
                    value: onValue
                })
            });
            responses.push(res);
        } else {
            // Für andere Geräte (z.B. Lampen)
            if (settings.color) {
                const { hue, saturation } = rgbToHueSaturation(settings.color);
                const hueRes = await fetch(`${CORS_PROXY}${API_URL}/accessories/${deviceId}`, {
                    method: 'PUT',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        characteristicType: "Hue",
                        value: hue
                    })
                });
                responses.push(hueRes);
                const satRes = await fetch(`${CORS_PROXY}${API_URL}/accessories/${deviceId}`, {
                    method: 'PUT',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        characteristicType: "Saturation",
                        value: saturation
                    })
                });
                responses.push(satRes);
            }
            if (settings.brightness !== undefined) {
                const res = await fetch(`${CORS_PROXY}${API_URL}/accessories/${deviceId}`, {
                    method: 'PUT',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        characteristicType: "Brightness",
                        value: settings.brightness
                    })
                });
                responses.push(res);
            }
            const onValue = settings.brightness > 0;
            const res = await fetch(`${CORS_PROXY}${API_URL}/accessories/${deviceId}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                        characteristicType: "On",
                        value: onValue
                    })
                });
            responses.push(res);
        }
        // Konsolidiertes Resultat zurückgeben, damit Aufrufer "ok" prüfen können
        const allOk = responses.length === 0 ? true : responses.every(r => r?.ok);
        if (process.env.NODE_ENV === 'development') {
            console.log('[homebridgeApi] updateDeviceSettings responses', responses.map(r => ({ ok: r?.ok, status: r?.status })));
        }
        return { ok: allOk, responses };
    } catch (error) {
        console.error("Fehler beim Aktualisieren des Geräts:", error);
        return { ok: false, error };
    }
}

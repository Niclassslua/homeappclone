// HomeScreen.jsx
import React, { useState, useEffect } from 'react';
import DeviceList from './DeviceList';
import PublicTransportMap from './PublicTransportMap';
import useHomebridge from '../hooks/useHomebridge';
import LampControlModal from './LampControlModal';
import AirPurifierControlModal from './AirPurifierControlModal';
import { ReactSVG } from "react-svg";

export default function HomeScreen() {
    const { devices, toggleDevice, updateDeviceSettings } = useHomebridge();
    const [selectedDevice, setSelectedDevice] = useState(null);
    const [view, setView] = useState('smartHome'); // 'smartHome' oder 'oepnv'

    const devicesByRoom = devices.reduce((acc, device) => {
        if (!acc[device.room]) acc[device.room] = [];
        acc[device.room].push(device);
        return acc;
    }, {});

    const handleLongPress = (device, rect) => {
        console.log("Long pressed", device, rect);
        setSelectedDevice({ ...device, initialRect: rect });
    };

    const handleDeviceChange = (settings) => {
        if (!selectedDevice) return;
        const desiredOn = typeof settings.isOn !== 'undefined' ? settings.isOn : settings.brightness > 0;
        if (desiredOn !== selectedDevice.isOn) {
            toggleDevice(selectedDevice);
        }
        updateDeviceSettings(selectedDevice, settings);
    };

    useEffect(() => {
        document.body.style.overflow = selectedDevice ? 'hidden' : 'auto';
    }, [selectedDevice]);

    return (
        <div
            className="min-h-screen p-4 sm:p-6 font-sans select-none"
            style={{
                backgroundImage: "url(/wallpapers/house.jpg)",
                backgroundRepeat: "no-repeat",
                backgroundSize: "cover",
                msOverflowStyle: 'none',
                scrollbarWidth: 'none'
            }}
        >
            {/* Toggle für die Ansichtsauswahl */}
            <div className="flex justify-center mb-4 space-x-4">
                {/* Smart Home Button */}
                <button
                    onClick={() => setView("smartHome")}
                    className="flex items-center space-x-2 px-4 py-2 rounded-full border transition-colors duration-200 bg-[#F5A338] text-white border-[#F5A338]"
                >
                    <ReactSVG src="/logos/homekit.svg" className="w-6 h-6"/>
                    <span className="font-medium">Smart Home</span>
                </button>

                {/* ÖPNV Button */}
                <button
                    onClick={() => setView("oepnv")}
                    className="flex items-center space-x-2 px-4 py-2 rounded-full border transition-colors duration-200 bg-[#0A2241] text-white border-[#0A2241]"
                >
                    <div style={{display: 'flex', gap: '4px'}}>
                        <div
                            style={{
                                width: '20px',
                                height: '20px',
                                backgroundColor: 'white',
                                WebkitMask: "url('/icons/transport/lightrail.fill.svg') center/contain no-repeat",
                                mask: "url('/icons/transport/lightrail.fill.svg') center/contain no-repeat"
                            }}
                        ></div>
                        <div
                            style={{
                                width: '20px',
                                height: '20px',
                                backgroundColor: 'white',
                                WebkitMask: "url('/icons/transport/bus.fill.svg') center/contain no-repeat",
                                mask: "url('/icons/transport/bus.fill.svg') center/contain no-repeat"
                            }}
                        ></div>
                    </div>
                    <span className="font-medium">ÖPNV</span>
                </button>
            </div>

            {view === 'smartHome' ? (
                <>
                    <DeviceList
                        devicesByRoom={devicesByRoom}
                        onToggle={toggleDevice}
                        onLongPress={handleLongPress}
                    />
                    {selectedDevice && (
                        selectedDevice.humanType === "Air Purifier" ? (
                            <AirPurifierControlModal
                                device={selectedDevice}
                                onClose={() => setSelectedDevice(null)}
                                onChange={handleDeviceChange}
                            />
                        ) : (
                            <LampControlModal
                                device={selectedDevice}
                                onClose={() => setSelectedDevice(null)}
                                onChange={handleDeviceChange}
                            />
                        )
                    )}
                </>
            ) : (
                <PublicTransportMap/>
            )}
        </div>
    );
}

import React, { useMemo, useState } from 'react';
import DeviceCard from './DeviceCard';
import HeaterControlModal from './HeaterControlModal';

const initialMockDevice = {
    id: 'mock-heater-1',
    name: 'Mock Heizung',
    humanType: 'Thermostat',
    isOn: true,
    room: 'Mock-Lab',
    currentTemperature: 21.5,
    targetTemperature: 22.0,
};

export default function HeaterMockPanel() {
    const [mockDevice, setMockDevice] = useState(initialMockDevice);
    const [showModal, setShowModal] = useState(false);

    const temperaturePresets = useMemo(() => ([
        { label: '17,5°', value: 17.5 },
        { label: '22,0°', value: 22.0 },
        { label: '28,0°', value: 28.0 },
    ]), []);

    const handleToggle = () => {
        setMockDevice((prev) => ({
            ...prev,
            isOn: !prev.isOn,
        }));
    };

    const handleModalChange = (settings) => {
        setMockDevice((prev) => ({
            ...prev,
            ...settings,
        }));
    };

    const applyPreset = (value) => {
        setMockDevice((prev) => ({
            ...prev,
            isOn: true,
            currentTemperature: Math.max(5, Math.min(35, value - 0.5)),
            targetTemperature: value,
        }));
    };

    return (
        <div className="mb-8">
            <div className="flex items-center justify-between mb-3">
                <div>
                    <h2 className="text-xl sm:text-2xl font-bold text-white">Mock-Geräte</h2>
                    <p className="text-sm text-neutral-200">Teste das Heizungs-Modal ohne echte Geräte.</p>
                </div>
                <button
                    onClick={() => setShowModal(true)}
                    className="px-4 py-2 rounded-full bg-white bg-opacity-90 text-black font-medium shadow hover:scale-105 transition-transform"
                >
                    Steuerung öffnen
                </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                <DeviceCard device={mockDevice} onToggle={handleToggle} />
            </div>

            <div className="flex flex-wrap gap-2 mt-4">
                {temperaturePresets.map((preset) => (
                    <button
                        key={preset.value}
                        onClick={() => applyPreset(preset.value)}
                        className="px-3 py-2 rounded-full bg-neutral-900 bg-opacity-70 text-white text-sm border border-white/20 hover:bg-opacity-90 transition"
                    >
                        {preset.label}
                    </button>
                ))}
            </div>

            {showModal && (
                <HeaterControlModal
                    device={mockDevice}
                    onClose={() => setShowModal(false)}
                    onChange={handleModalChange}
                />
            )}
        </div>
    );
}

// src/components/DeviceCardWrapper.jsx
import React, { useRef } from 'react';
import DeviceCard from './DeviceCard';

export default function DeviceCardWrapper({ device, onToggle, onLongPress }) {
    const timerRef = useRef(null);

    const handlePressStart = () => {
        // Setze einen Timer (z. B. 800ms), um einen langen Druck zu erkennen
        timerRef.current = setTimeout(() => {
            onLongPress(device);
        }, 300);
    };

    const handlePressEnd = () => {
        clearTimeout(timerRef.current);
    };

    return (
        <div
            onMouseDown={handlePressStart}
            onMouseUp={handlePressEnd}
            onMouseLeave={handlePressEnd}
            onTouchStart={handlePressStart}
            onTouchEnd={handlePressEnd}
        >
            <DeviceCard device={device} onToggle={onToggle} />
        </div>
    );
}
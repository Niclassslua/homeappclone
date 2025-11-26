// src/components/DeviceList.jsx
import React from 'react';
import DeviceCardWrapper from './DeviceCardWrapper';

export default function DeviceList({ devicesByRoom, onToggle, onLongPress }) {
    return (
        <div>
            {Object.entries(devicesByRoom).map(([roomName, roomDevices]) => (
                <div key={roomName} className="snap-start mb-8">
                    <h2 className="text-xl sm:text-2xl font-bold mb-4 text-white rounded">{roomName}</h2>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                        {roomDevices.map((device) => (
                            <DeviceCardWrapper key={device.id} device={device} onToggle={onToggle} onLongPress={onLongPress} />
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
}
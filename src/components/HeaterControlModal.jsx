import React, { useEffect, useMemo, useRef, useState } from 'react';
import { RoundSlider } from './RoundSlider/RoundSlider';
import { value2angle } from './RoundSlider/domain/pointers-provider';

const MIN_TEMP = 5;
const MAX_TEMP = 35;
const START_ANGLE = 135;
const END_ANGLE = 405;
const DEBOUNCE_DELAY = 500;

const formatTemperature = (temp) => {
    if (temp === undefined || temp === null || isNaN(temp)) return '0,0';
    return parseFloat(temp).toFixed(1).replace('.', ',');
};

export default function HeaterControlModal({ device, onClose, onChange }) {
    const containerRef = useRef(null);
    const [isOn, setIsOn] = useState(device.isOn);
    const [currentTemperature, setCurrentTemperature] = useState(device.currentTemperature ?? 0);
    const initialTarget = useMemo(() => {
        const fallback = device.targetTemperature ?? device.currentTemperature ?? 20;
        return Math.min(MAX_TEMP, Math.max(MIN_TEMP, fallback));
    }, [device.currentTemperature, device.targetTemperature]);
    const [debouncedTarget, setDebouncedTarget] = useState(initialTarget);

    useEffect(() => {
        setIsOn(device.isOn);
        setCurrentTemperature(device.currentTemperature ?? 0);
        const fallback = device.targetTemperature ?? device.currentTemperature ?? 20;
        const clamped = Math.min(MAX_TEMP, Math.max(MIN_TEMP, fallback));
        setDebouncedTarget(clamped);
    }, [device]);

    useEffect(() => {
        const handler = setTimeout(() => {
            const roundedTarget = Math.round(debouncedTarget * 2) / 2;
            onChange?.({ targetTemperature: roundedTarget, isOn });
        }, DEBOUNCE_DELAY);

        return () => clearTimeout(handler);
    }, [debouncedTarget, isOn, onChange]);

    const gradientId = useMemo(() => `heater-gradient-${device.id || 'default'}`, [device.id]);
    const sliderData = useMemo(() => ({ min: MIN_TEMP, max: MAX_TEMP }), []);

    const normalizedCurrent = useMemo(() => Math.round((currentTemperature ?? 0) * 2) / 2, [currentTemperature]);
    const normalizedTarget = useMemo(() => Math.round((debouncedTarget ?? 0) * 2) / 2, [debouncedTarget]);
    const shouldShowRangeMarkers = isOn && normalizedTarget > normalizedCurrent;

    const sliderPointers = useMemo(() => ({
        pointers: [
            {
                id: 'target-pointer',
                value: debouncedTarget,
                angleDeg: value2angle(sliderData, debouncedTarget, START_ANGLE, END_ANGLE),
                radius: 12.5,
                bgColor: '#FFFFFF',
                bgColorHover: '#FFFFFF',
                bgColorSelected: '#FFFFFF',
            },
        ],
    }), [debouncedTarget, sliderData]);

    const handleOverlayClick = (event) => {
        if (containerRef.current && !containerRef.current.contains(event.target)) {
            onClose();
        }
    };

    const handleSliderChange = (pointers) => {
        const value = pointers?.[0]?.value ?? debouncedTarget;
        const rounded = Math.round(value * 2) / 2;
        setDebouncedTarget(Math.min(MAX_TEMP, Math.max(MIN_TEMP, rounded)));
    };

    const SvgDefs = (
        <defs>
            <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#2E7DEE" />
                <stop offset="20%" stopColor="#80BFE3" />
                <stop offset="40%" stopColor="#D3E6D0" />
                <stop offset="80%" stopColor="#E6C697" />
                <stop offset="100%" stopColor="#EE6D56" />
            </linearGradient>
        </defs>
    );

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30 backdrop-blur-xl"
            onClick={handleOverlayClick}
        >
            <div
                ref={containerRef}
                className="p-4 sm:p-6 md:p-8 w-full max-w-[90vw] md:max-w-lg lg:max-w-xl mx-auto animate-modal"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="text-center mb-6">
                    <div className="text-white text-xl md:text-2xl lg:text-3xl font-medium">{device.name}</div>
                    <div className="text-neutral-300 text-sm font-normal">Aktuell {formatTemperature(currentTemperature)}</div>
                </div>

                <div className="w-[300px] h-[300px] mx-auto relative">
                    <RoundSlider
                        size={300}
                        pathStartAngle={START_ANGLE}
                        pathEndAngle={END_ANGLE}
                        pathThickness={30}
                        pointerRadius={12.5}
                        SvgDefs={SvgDefs}
                        min={MIN_TEMP}
                        max={MAX_TEMP}
                        valueStep={0.5}
                        trackStroke="#242422"
                        pathBgColor="transparent"
                        pathInnerBgColor="transparent"
                        connectionBgColor={`url(#${gradientId})`}
                        connectionBgColorHover={`url(#${gradientId})`}
                        showCurrentValueMarker
                        currentValue={currentTemperature}
                        markerRadius={4}
                        markerColor="white"
                        markerHideThreshold={10}
                        rangeMarkers={shouldShowRangeMarkers
                            ? { startValue: normalizedCurrent, endValue: normalizedTarget, step: 0.5 }
                            : undefined}
                        rangeMarkerRadius={2}
                        rangeMarkerColor="rgba(255, 255, 255, 0.6)"
                        mousewheelDisabled
                        animateOnClick
                        animationDuration={300}
                        step={0.5}
                        hideText
                        hideTicks
                        snapToStartOnOverflow
                        pointers={sliderPointers}
                        onChange={handleSliderChange}
                    />

                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none select-none">
                        <div className="text-neutral-300 text-sm mb-1">Heizen auf</div>
                        <div className="text-white text-5xl font-semibold leading-none">
                            {formatTemperature(debouncedTarget)}
                        </div>
                    </div>
                </div>

                <div className="mt-4 flex justify-center">
                    <select
                        className="bg-neutral-900 text-white text-sm px-4 py-2 rounded-full border border-white/10 focus:outline-none focus:ring-2 focus:ring-white/30"
                        value={isOn ? 'heat' : 'off'}
                        onChange={(e) => {
                            const nextIsOn = e.target.value === 'heat';
                            setIsOn(nextIsOn);
                            onChange?.({ isOn: nextIsOn });
                        }}
                    >
                        <option value="heat">Heizung</option>
                        <option value="off">Aus</option>
                    </select>
                </div>
            </div>
        </div>
    );
}

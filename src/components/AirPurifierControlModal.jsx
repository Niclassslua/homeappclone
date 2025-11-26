import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ReactSVG } from 'react-svg';
import { getIconUrl, getOffColor } from '../utils/helpers';

export default function AirPurifierControlModal({ device, onClose, onChange }) {
    // Wenn das Gerät ausgeschaltet ist, setzen wir brightness auf 0
    const [brightness, setBrightness] = useState(device.isOn ? device.brightness : 0);
    const [isOn, setIsOn] = useState(device.isOn);
    const sliderRef = useRef(null);
    const buttonRef = useRef(null);
    const textRef = useRef(null);
    const svgRef = useRef(null);

    const tolerance = 30;

    const handleClickOutside = (e) => {
        const isWithinBounds = (ref) => {
            if (!ref?.current) return false;
            const rect = ref.current.getBoundingClientRect();
            return (
                e.clientX >= rect.left - tolerance &&
                e.clientX <= rect.right + tolerance &&
                e.clientY >= rect.top - tolerance &&
                e.clientY <= rect.bottom + tolerance
            );
        };

        if (!isWithinBounds(sliderRef) && !isWithinBounds(textRef) && !isWithinBounds(buttonRef)) {
            onClose();
        }
    };

    const handlePowerClick = (e) => {
        e.stopPropagation(); // Verhindert, dass das Modal durch den Klick geschlossen wird
        if (isOn) {
            setBrightness(0);
            setIsOn(false);
            onChange({ brightness: 0, isOn: false });
        } else {
            const newBrightness = 50; // Hier kannst du ggf. deinen gespeicherten lastBrightness verwenden
            setBrightness(newBrightness);
            setIsOn(true);
            onChange({ brightness: newBrightness, isOn: true });
        }
    };


    const handleBrightnessChange = (newBrightness) => {
        const roundedBrightness = Math.round(newBrightness);
        if (roundedBrightness === brightness) return;

        if (roundedBrightness === 0 && isOn) {
            setIsOn(false);
            onChange({ brightness: 0, isOn: false });
        } else if (roundedBrightness > 0 && !isOn) {
            setIsOn(true);
            onChange({ brightness: roundedBrightness, isOn: true });
        } else {
            onChange({ brightness: roundedBrightness, isOn });
        }
        setBrightness(roundedBrightness);
    };

    const handleSliderClick = (e) => {
        const slider = sliderRef.current;
        if (!slider) return;
        const rect = slider.getBoundingClientRect();
        const clickY = e.clientY - rect.top;
        const newBrightness = 100 - Math.min(Math.max((clickY / rect.height) * 100, 0), 100);
        handleBrightnessChange(newBrightness);
    };

    const handleSliderDrag = (e) => {
        e.preventDefault();
        const slider = sliderRef.current;
        if (!slider) return;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        const rect = slider.getBoundingClientRect();
        const newBrightness = 100 - Math.min(Math.max(((clientY - rect.top) / rect.height) * 100, 0), 100);
        // Nur lokal aktualisieren
        setBrightness(newBrightness);
    };

    const handleSliderEnd = useCallback(() => {
        handleBrightnessChange(brightness);
    }, [brightness]);

    useEffect(() => {
        const handleGlobalEnd = () => {
            handleSliderEnd();
        };
        document.addEventListener('mouseup', handleGlobalEnd);
        document.addEventListener('touchend', handleGlobalEnd);
        return () => {
            document.removeEventListener('mouseup', handleGlobalEnd);
            document.removeEventListener('touchend', handleGlobalEnd);
        };
    }, [handleSliderEnd]);
    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30 backdrop-blur-xl"
            onClick={handleClickOutside}
        >
            <div className="p-4 sm:p-6 md:p-8 w-full max-w-[90vw] md:max-w-lg lg:max-w-xl mx-auto animate-modal">
                {/* Geräte-Name und Brightness-Anzeige */}
                <div ref={textRef} className="text-center mb-8">
                    <div className="text-white text-xl md:text-2xl lg:text-3xl font-medium">
                        {device.name}
                    </div>
                    <div className="text-neutral-300 font-medium">
                        {brightness !== 0 ? `${Math.round(brightness)}%` : "Aus"}
                    </div>
                </div>

                {/* Vertikaler Slider – Farbe wird immer über getOffColor(device.humanType) gesteuert */}
                <div
                    ref={sliderRef}
                    className="relative h-56 w-20 sm:h-60 sm:w-24 md:h-72 md:w-28 lg:h-80 lg:w-32 mx-auto mb-4 cursor-pointer select-none overflow-hidden rounded-3xl lg:rounded-4xl transition-all duration-300 ease-out"
                    style={{transform: "translateY(-10px)"}}
                    onClick={handleSliderClick}
                    onTouchMove={handleSliderDrag}
                    onTouchEnd={handleSliderEnd}
                    onMouseMove={(e) => {
                        if (e.buttons === 1) handleSliderDrag(e);
                    }}
                    onMouseUp={handleSliderEnd}
                >
                    <div className="absolute inset-0 bg-neutral-900 bg-opacity-70"></div>
                    <div
                        className="absolute left-0 bottom-0 w-full transition-all duration-300 ease-out"
                        style={{
                            height: `${brightness}%`,
                            backgroundColor: getOffColor(device.humanType),
                            opacity: 0.9,
                        }}
                    ></div>
                    <div
                        className="absolute bottom-0 left-1/2 transform -translate-x-1/2 mb-4 transition-all delay-150 duration-300 ease-out">
                        <ReactSVG
                            key={isOn ? "on" : "off"}
                            src={getIconUrl(device)}
                            afterInjection={(svg) => {
                                svgRef.current = svg;
                                svg.setAttribute("class", "w-7 sm:w-9 md:w-11 lg:w-13");
                                const fillColor = isOn ? "#FFFFFF" : getOffColor(device.humanType);
                                svg.querySelectorAll("*").forEach((el) => {
                                    el.removeAttribute("fill");
                                    el.setAttribute("fill", fillColor);
                                });
                            }}
                        />
                    </div>
                </div>
                <div className="flex items-center justify-center mt-4" ref={buttonRef} onClick={handlePowerClick}>
                    <div
                        className={`relative w-16 h-16 rounded-full ${!isOn ? 'bg-neutral-900 bg-opacity-70' : ''}`}
                        style={{backgroundColor: isOn ? getOffColor(device.humanType) : ""}}
                    >
                        <ReactSVG
                            src={"/icons/misc/power.svg"}
                            beforeInjection={(svg) => {
                                svg.setAttribute(
                                    "class",
                                    "w-6 h-6 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"
                                );
                                const fillColor = isOn ? "#FFFFFF" : getOffColor(device.humanType);
                                // Setze hier das Fill des Power-Icons auf die Device-Farbe
                                svg.querySelectorAll("*").forEach((el) => {
                                    el.removeAttribute("fill");
                                    el.setAttribute("fill", fillColor);
                                });
                            }}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}

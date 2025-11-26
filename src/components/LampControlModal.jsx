import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ReactSVG } from 'react-svg';
import { getIconUrl, getOffColor } from '../utils/helpers';

export default function LampControlModal({ device, onClose, onChange }) {
    // Initialwerte: Wenn das Gerät aus ist, wird brightness auf 0 gesetzt.
    const [brightness, setBrightness] = useState(device.isOn ? device.brightness : 0);
    const [color, setColor] = useState(device.color || '#FFFFFF');
    const [isOn, setIsOn] = useState(device.isOn);
    // Speichere den letzten positiven Brightness-Wert, falls das Licht aus ist.
    const [lastBrightness, setLastBrightness] = useState(device.isOn ? device.brightness : 50);

    const sliderRef = useRef(null);
    const colorPaletteRef = useRef(null);
    const textRef = useRef(null);

    const tolerance = 30; // Erweiterter Toleranzbereich

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

        if (
            !isWithinBounds(sliderRef) &&
            !isWithinBounds(colorPaletteRef) &&
            !isWithinBounds(textRef)
        ) {
            onClose();
        }
    };

    const handleBrightnessChange = (newBrightness) => {
        const roundedBrightness = Math.round(newBrightness);
        // Speichere den letzten positiven Wert
        if (roundedBrightness > 0) {
            setLastBrightness(roundedBrightness);
        }
        // Nur wenn sich der Wert wirklich ändert, rufe onChange auf:
        if (roundedBrightness === brightness) return;

        if (roundedBrightness === 0 && isOn) {
            setIsOn(false);
            onChange({ brightness: 0, color, isOn: false });
        } else if (roundedBrightness > 0 && !isOn) {
            setIsOn(true);
            onChange({ brightness: roundedBrightness, color, isOn: true });
        } else {
            onChange({ brightness: roundedBrightness, color, isOn });
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
        // Während des Draggings nur den lokalen State aktualisieren
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

    const presetColors = ['#FF3B30', '#FF9500', '#FFCC00', '#4CD964', '#5AC8FA', '#007AFF', '#5856D6'];

    const handlePresetColorClick = (preset) => {
        // Falls das Licht aus ist, verwende den gespeicherten lastBrightness als effektiven Wert
        const effectiveBrightness = brightness === 0 ? lastBrightness : brightness;
        setColor(preset);
        setBrightness(effectiveBrightness);
        if (effectiveBrightness > 0 && !isOn) {
            setIsOn(true);
        }
        onChange({ brightness: effectiveBrightness, color: preset, isOn: effectiveBrightness > 0 });
    };

    const handleCustomColorChange = (e) => {
        const newColor = e.target.value;
        const effectiveBrightness = brightness === 0 ? lastBrightness : brightness;
        setColor(newColor);
        setBrightness(effectiveBrightness);
        if (effectiveBrightness > 0 && !isOn) {
            setIsOn(true);
        }
        onChange({ brightness: effectiveBrightness, color: newColor, isOn: effectiveBrightness > 0 });
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30 backdrop-blur-xl"
            onClick={handleClickOutside}
        >
            <div className="p-4 sm:p-6 md:p-8 w-full max-w-[90vw] md:max-w-lg lg:max-w-xl mx-auto animate-modal">
                {/* Geräte-Name und Helligkeit */}
                <div ref={textRef} className="text-center mb-8">
                    <div className="text-white text-xl md:text-2xl lg:text-3xl font-medium">
                        {device.name}
                    </div>
                    <div className="text-neutral-300 text-sm font-normal">
                        {Math.round(brightness) !== 0 ? `${Math.round(brightness)}%` : "Aus"}
                    </div>
                </div>

                {/* Vertikaler Slider */}
                <div
                    ref={sliderRef}
                    className="relative h-56 w-20 sm:h-60 sm:w-24 md:h-72 md:w-28 lg:h-80 lg:w-32 mx-auto mb-4 cursor-pointer select-none overflow-hidden rounded-3xl lg:rounded-4xl transition-all duration-300 ease-out"
                    onClick={handleSliderClick}
                    onTouchMove={handleSliderDrag}
                    onTouchEnd={handleSliderEnd}
                    onMouseMove={(e) => { if (e.buttons === 1) handleSliderDrag(e); }}
                    onMouseUp={handleSliderEnd}
                >
                    <div className="absolute inset-0 bg-neutral-900 bg-opacity-70"></div>
                    <div
                        className="absolute left-0 bottom-0 w-full transition-all duration-300 ease-out"
                        style={{
                            height: `${brightness}%`,
                            backgroundColor: color,
                            opacity: 0.9,
                        }}
                    ></div>
                    <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 mb-4 transition-all delay-150 duration-300 ease-out">
                        <ReactSVG
                            key={isOn ? "on" : "off"}
                            src={getIconUrl(device)}
                            beforeInjection={(svg) => {
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

                {/* Preset-Farben + Colorpicker */}
                <div className="w-full px-4">
                    <div
                        ref={colorPaletteRef}
                        className="flex space-x-2 mb-4 mt-8 overflow-x-auto transition-all delay-150 duration-300 ease-out"
                        style={{ msOverflowStyle: 'none', scrollbarWidth: 'none' }}
                    >
                        {presetColors.map((preset) => (
                            <button
                                key={preset}
                                onClick={() => handlePresetColorClick(preset)}
                                className="relative w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 rounded-full flex-shrink-0 transition-all delay-150 duration-300 ease-out"
                                style={{ backgroundColor: preset, border: 'none' }}
                            >
                                {preset === color && (
                                    <div
                                        className="absolute rounded-full transition-all delay-150 duration-300 ease-out"
                                        style={{
                                            top: '10%',
                                            left: '10%',
                                            width: '80%',
                                            height: '80%',
                                            border: '2px solid #000000'
                                        }}
                                    />
                                )}
                            </button>
                        ))}

                        {/* Hue Colorpicker */}
                        <div className="relative w-12 h-12 sm:w-16 sm:h-16 md:w-20 md:h-20 rounded-full flex-shrink-0 transition-all delay-150 duration-300 ease-out">
                            <input
                                type="color"
                                value={color}
                                onChange={handleCustomColorChange}
                                className="absolute inset-0 w-full h-full rounded-full cursor-pointer"
                                style={{ appearance: 'none', border: 'none', padding: 0 }}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

import React, { useState, useEffect, useRef, useMemo } from 'react';
import Circle from './ui/Circle';
import Connection from './ui/Connection';
import InnerCircle from './ui/InnerCircle';
import Pointers from './ui/Pointers';
import Text from './ui/Text';
import Ticks from './ui/Ticks';
import { getSvg } from './domain/svg-provider';
import { value2angle, angle2value } from './domain/pointers-provider';
import { circleMovement, degreesToRadians, convertRange } from 'mz-math';

const RoundSlider = (props) => {
    const {
        size,
        pathStartAngle,
        pathEndAngle,
        pathThickness,
        pointerRadius,
        SvgDefs,
        min,
        max,
        showCurrentValueMarker,
        currentValue,
        mousewheelDisabled,
        snapToStartOnOverflow,
        valueStep,
        markerRadius,
        markerColor,
        markerHideThreshold,
        rangeMarkers,
        rangeMarkerRadius,
        rangeMarkerColor,
        ...rest
    } = props;

    // Verwende das übergebene data-Objekt, falls vorhanden, sonst erstelle ein Standard-Objekt
    const data = useMemo(() => {
        if (props.data && props.data.min !== undefined && props.data.max !== undefined) {
            return props.data;
        }
        const defaultData = {
            data: Array.from({ length: max - min + 1 }, (_, i) => i + min),
            min,
            max,
        };
        return defaultData;
    }, [min, max, props.data]);

    const initialPointers = props.pointers || {
        pointers: [{ value: min, id: '0', angleDeg: 0, radius: pointerRadius }],
    };

    const mergePointerDefaults = (pointer) => ({
        ...pointer,
        bgColor: pointer.bgColor || props.pointerBgColor || "#FFFFFF",
        bgColorSelected: pointer.bgColorSelected || props.pointerBgColorSelected || "#FFFFFF",
        bgColorDisabled: pointer.bgColorDisabled || props.pointerBgColorDisabled || "#CCCCCC",
        bgColorHover: pointer.bgColorHover || props.pointerBgColorHover || "#FFFFFF",
    });

    // Initialer Zustand basierend auf den übergebenen pointers
    const [pointersState, setPointersState] = useState(() => {
        const initial = initialPointers.pointers.map(mergePointerDefaults);
        return { pointers: initial };
    });

    // Ref um zu verfolgen, ob dies der erste Render ist
    const isFirstRenderRef = useRef(true);
    const lastExternalAngleRef = useRef(null);
    const lastExternalValueRef = useRef(null);
    
    // Synchronisiere NUR beim ersten Render oder wenn sich die Props wirklich von außen ändern
    // (nicht durch interne Updates)
    useEffect(() => {
        if (props.pointers && props.pointers.pointers && props.pointers.pointers.length > 0) {
            const currentPointer = props.pointers.pointers[0];
            const currentAngle = currentPointer.angleDeg || 0;
            const currentValue = currentPointer.value;
            
            // Beim ersten Render: Initialisiere
            if (isFirstRenderRef.current) {
                isFirstRenderRef.current = false;
                lastExternalAngleRef.current = currentAngle;
                lastExternalValueRef.current = currentValue || 0;
                const updated = props.pointers.pointers.map(mergePointerDefaults);
                setPointersState({ pointers: updated });
                return;
            }
            
            // Prüfe, ob sich der Winkel oder der Wert wirklich geändert hat
            const angleChanged = lastExternalAngleRef.current === null || 
                Math.abs(lastExternalAngleRef.current - currentAngle) > 0.01;
            const valueChanged = lastExternalValueRef.current === null || 
                Math.abs(lastExternalValueRef.current - (currentValue || 0)) > 0.01;
            
            // Nur aktualisieren, wenn sich die Werte wirklich geändert haben
            // UND der aktuelle interne State nicht bereits diesen Wert hat
            if (angleChanged || valueChanged) {
                const currentInternalAngle = pointersState.pointers[0]?.angleDeg || 0;
                const angleDiff = Math.abs(currentInternalAngle - currentAngle);
                
                // Nur aktualisieren, wenn der Unterschied signifikant ist (externe Änderung)
                if (angleDiff > 0.1) {
                    lastExternalAngleRef.current = currentAngle;
                    lastExternalValueRef.current = currentValue || 0;
                    const updated = props.pointers.pointers.map(mergePointerDefaults);
                    setPointersState({ pointers: updated });
                }
            }
        }
    }, [props.pointers?.pointers?.[0]?.angleDeg, props.pointers?.pointers?.[0]?.value]);

    const setPointer = (pointer, newAngleDeg) => {
        if (props.disabled || !pointer || pointer.disabled) return;
        if (newAngleDeg === undefined || newAngleDeg === null || isNaN(newAngleDeg)) {
            return;
        }
        const step = props.step || 0.1;
        const roundToStep = (angle) => Math.round(angle / step) * step;
        const roundedAngle = roundToStep(newAngleDeg);

        // Prüfe, ob sich der Winkel tatsächlich geändert hat
        const currentPointer = pointersState.pointers.find(p => p.id === pointer.id);
        if (currentPointer && Math.abs(currentPointer.angleDeg - roundedAngle) < 0.01) {
            return; // Keine Änderung, keine Aktualisierung
        }

        const updatedPointers = pointersState.pointers.map((p) =>
            p.id === pointer.id ? { ...p, angleDeg: roundedAngle } : p
        );

        // Aktualisiere den internen State
        setPointersState({ pointers: updatedPointers });
        
        // Aktualisiere die Refs, damit der useEffect weiß, dass dies eine interne Änderung ist
        const newValue = angle2value(data, roundedAngle, pathStartAngle, pathEndAngle);
        lastExternalAngleRef.current = roundedAngle;
        lastExternalValueRef.current = newValue;
        
        if (props.onChange) {
            // Pass the full pointer objects with values calculated from angles
            const pointersWithValues = updatedPointers.map((p) => {
                const value = angle2value(data, p.angleDeg, pathStartAngle, pathEndAngle);
                return { ...p, value };
            });
            props.onChange(pointersWithValues);
        }
    };

    const circleRadiusCalc = (size / 2) - pathThickness;
    const svg = getSvg(circleRadiusCalc, pathThickness, 0, pointerRadius, pathStartAngle, pathEndAngle);

    // Verwende einen Ref für das SVG-Element
    const svgRef = useRef(null);
    const [svgElement, setSvgElement] = useState(null);

    // Setze den svgElement-Ref nur einmal beim Mount
    useEffect(() => {
        setSvgElement(svgRef.current);
    }, []);

    // Marker-Berechnung:
    let markerElement = null;
    if (
        showCurrentValueMarker &&
        currentValue !== undefined &&
        currentValue !== null &&
        !isNaN(currentValue) &&
        svgElement
    ) {
        // Begrenze currentValue auf min/max
        const dataMin = data.min !== undefined ? data.min : min;
        const dataMax = data.max !== undefined ? data.max : max;
        const clampedCurrentValue = Math.max(dataMin, Math.min(dataMax, currentValue));
        
        const markerAngle = value2angle(data, clampedCurrentValue, pathStartAngle, pathEndAngle);
        const markerPos = circleMovement([svg.cx, svg.cy], degreesToRadians(markerAngle), svg.radius);
        
        // Prüfe ob Pointer vorhanden und gültig ist
        const pointerAngle = pointersState.pointers[0]?.angleDeg;
        let shouldShow = true;
        
        if (pointerAngle !== undefined && pointerAngle !== null && !isNaN(pointerAngle)) {
            const pointerPos = circleMovement([svg.cx, svg.cy], degreesToRadians(pointerAngle), svg.radius);
            const distance = Math.hypot(markerPos[0] - pointerPos[0], markerPos[1] - pointerPos[1]);
            const thresholdDistance = markerHideThreshold !== undefined ? markerHideThreshold : 10;
            if (distance < thresholdDistance) {
                shouldShow = false;
            }
        }
        
        if (shouldShow) {
            markerElement = (
                <circle
                    cx={markerPos[0]}
                    cy={markerPos[1]}
                    r={markerRadius !== undefined ? markerRadius : 4}
                    fill={markerColor || 'white'}
                    className="mz-round-slider-marker"
                />
            );
        }
    }

    // Range Markers (kleine Punkte von startValue bis endValue in 0.5er Schritten)
    const rangeMarkerElements = useMemo(() => {
        if (!rangeMarkers || !svgElement || rangeMarkers.startValue === undefined || rangeMarkers.endValue === undefined) {
            return null;
        }
        const { startValue, endValue, step = 0.5 } = rangeMarkers;
        const markers = [];
        // Begrenze start und end auf die gültigen min/max Werte
        const dataMin = data.min !== undefined ? data.min : min;
        const dataMax = data.max !== undefined ? data.max : max;
        const start = Math.max(dataMin, Math.min(dataMax, startValue));
        const end = Math.max(dataMin, Math.min(dataMax, endValue));

        // Richtung ermitteln, damit Marker auch angezeigt werden wenn end < start
        const direction = end >= start ? 1 : -1;
        const stepWithDirection = step * direction;
        const endThreshold = end + (step / 2) * direction;

        // Generiere Marker für jeden Schritt von start bis end (auf- oder absteigend)
        for (let value = start; direction === 1 ? value <= endThreshold : value >= endThreshold; value += stepWithDirection) {
            const roundedValue = Math.round(value / step) * step;
            // Sicherstellen, dass der Wert nicht über die Grenzen hinausgeht
            if (roundedValue > dataMax) {
                if (direction === 1) break;
                continue;
            }
            if (roundedValue < dataMin) {
                if (direction === -1) break;
                continue;
            }
            if (direction === 1 && roundedValue > endThreshold) break;
            if (direction === -1 && roundedValue < endThreshold) break;
            
            const markerAngle = value2angle(data, roundedValue, pathStartAngle, pathEndAngle);
            
            // Prüfe ob der Winkel gültig ist
            if (markerAngle === undefined || markerAngle === null || isNaN(markerAngle)) {
                continue;
            }
            
            const markerPos = circleMovement([svg.cx, svg.cy], degreesToRadians(markerAngle), svg.radius);
            
            // Prüfe ob der Marker zu nah am Pointer ist
            const pointerAngle = pointersState.pointers[0]?.angleDeg;
            let shouldShow = true;
            if (pointerAngle !== undefined && pointerAngle !== null && !isNaN(pointerAngle)) {
                const pointerPos = circleMovement([svg.cx, svg.cy], degreesToRadians(pointerAngle), svg.radius);
                const distance = Math.hypot(markerPos[0] - pointerPos[0], markerPos[1] - pointerPos[1]);
                const thresholdDistance = markerHideThreshold !== undefined ? markerHideThreshold : 10;
                if (distance < thresholdDistance) {
                    shouldShow = false;
                }
            }
            
            if (shouldShow) {
                markers.push(
                    <circle
                        key={`range-marker-${roundedValue}`}
                        cx={markerPos[0]}
                        cy={markerPos[1]}
                        r={rangeMarkerRadius !== undefined ? rangeMarkerRadius : 2}
                        fill={rangeMarkerColor || 'rgba(255, 255, 255, 0.6)'}
                        className="mz-round-slider-range-marker"
                    />
                );
            }
        }
        return markers;
    }, [rangeMarkers, svgElement, svg, data, pathStartAngle, pathEndAngle, pointersState.pointers, markerHideThreshold, rangeMarkerRadius, rangeMarkerColor, min, max]);

    return (
        <svg ref={svgRef} width={size} height={size}>
            {SvgDefs}
            <Circle
                {...rest}
                svg={svg}
                data={data}
                settings={props}
                pointers={pointersState}
                setPointer={setPointer}
                $svg={svgElement}
            />
            <Connection
                {...rest}
                svg={svg}
                data={data}
                settings={props}
                pointers={pointersState}
                setPointer={setPointer}
                $svg={svgElement}
                onConnectionClick={props.onConnectionClick}
            />
            <InnerCircle
                {...rest}
                svg={svg}
                data={data}
                settings={props}
                circle={{}}
            />
            <Ticks
                {...rest}
                svg={svg}
                data={data}
                settings={props}
            />
            <Pointers
                {...rest}
                svg={svg}
                data={data}
                settings={props}
                pointers={pointersState}
                setPointer={setPointer}
                $svg={svgElement}
            />
            <Text
                {...rest}
                svg={svg}
                data={data}
                settings={props}
                pointers={pointersState}
            />
            {markerElement}
            {rangeMarkerElements && <g>{rangeMarkerElements}</g>}
        </svg>
    );
};

export { RoundSlider };

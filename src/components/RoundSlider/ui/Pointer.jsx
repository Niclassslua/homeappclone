import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
    angle2value,
    getAngleByMouse,
    getClosestEdge,
    isAngleInArc,
} from '../domain/pointers-provider';
import { circleMovement, convertRange, degreesToRadians } from 'mz-math';
import { DEFAULT_POINTER_BG_COLOR } from '../domain/defaults-provider';

const getPointerFill = (
    pointer,
    selectedPointerId,
    bgColor,
    bgColorSelected,
    bgColorDisabled,
    bgColorHover,
    isMouseOver
) => {
    if (pointer.disabled) return bgColorDisabled;
    if (isMouseOver) return bgColorHover;
    if (pointer.id === selectedPointerId) return bgColorSelected;
    return bgColor;
};

const Pointer = (props) => {
    const { pointer, svg, $svg, data, settings, setPointer, selectedPointerId } = props;
    const pointerRadius = pointer.radius || 12.5;
    const { angleDeg, bgColor, bgColorSelected, bgColorDisabled, bgColorHover, border, borderColor } = pointer;
    const { cx, cy, startAngleDeg, endAngleDeg, radius } = svg;

    const pointerRef = useRef(null);
    const [center, setCenter] = useState(null);
    const [value, setValue] = useState('');
    const [fill, setFill] = useState(DEFAULT_POINTER_BG_COLOR);
    const [isMouseOver, setIsMouseOver] = useState(false);

    // Aktualisiere den Fill-Farbwert basierend auf Zustand und Hover
    useEffect(() => {
        const newFill = getPointerFill(
            pointer,
            selectedPointerId,
            bgColor,
            bgColorSelected,
            bgColorDisabled,
            bgColorHover,
            isMouseOver
        );
        console.debug('[Pointer] useEffect - fill updated:', {
            newFill,
            isMouseOver,
            selectedPointerId,
            pointerId: pointer.id,
        });
        setFill(newFill);
    }, [pointer, selectedPointerId, bgColor, bgColorSelected, bgColorDisabled, bgColorHover, isMouseOver]);

    // Berechne den angezeigten Wert basierend auf dem Winkel
    useEffect(() => {
        if (angleDeg === undefined || angleDeg === null || isNaN(angleDeg)) {
            console.warn('[Pointer] Invalid angleDeg:', angleDeg);
            setValue('');
            return;
        }
        const val = angle2value(data, angleDeg, startAngleDeg, endAngleDeg);
        setValue(val === undefined ? '' : val.toString());
    }, [data, angleDeg, startAngleDeg, endAngleDeg]);

    // Berechne den Mittelpunkt des Pointers
    useEffect(() => {
        if (angleDeg === undefined || angleDeg === null || isNaN(angleDeg)) {
            console.warn('[Pointer] Invalid angleDeg for center calculation:', angleDeg);
            setCenter(null);
            return;
        }
        const rawRadians = degreesToRadians(angleDeg);
        const normalizedRadians = convertRange(degreesToRadians(angleDeg), 0, Math.PI * 2, 0, Math.PI);
        const pointerCenter = circleMovement([cx, cy], normalizedRadians, radius);
        setCenter(pointerCenter);
    }, [angleDeg, cx, cy, radius]);

    // onValueChange-Funktion, die den neuen Winkel berechnet und setzt
    const onValueChange = useCallback(
        (evt) => {
            if (!$svg || settings.disabled || pointer.disabled) {
                console.debug('[Pointer] onValueChange aborted (disabled or no $svg)');
                return;
            }
            const mouseX = evt.type.indexOf('mouse') !== -1 ? evt.clientX : evt.touches[0].clientX;
            const mouseY = evt.type.indexOf('mouse') !== -1 ? evt.clientY : evt.touches[0].clientY;
            let degrees = getAngleByMouse($svg, mouseX, mouseY, cx, cy, radius, radius);

            // Wenn der berechnete Winkel nicht im definierten Bogen liegt, setze ihn auf den nächsten Rand
            if (!isAngleInArc(startAngleDeg, endAngleDeg, degrees)) {
                const closestEdge = getClosestEdge(startAngleDeg, endAngleDeg, pointer.angleDeg, cx, cy, radius);
                degrees = closestEdge;
            }

            // Falls der berechnete Winkel unterhalb des Startwerts liegt, füge 360° hinzu (Wrap-Around)
            if (degrees < startAngleDeg) {
                degrees += 360;
            }

            // NEU: Wenn snapToStartOnOverflow aktiviert ist und der Winkel über dem Endwert liegt,
            // wird der Winkel auf den Startwert gesetzt
            if (settings.snapToStartOnOverflow && degrees > endAngleDeg) {
                degrees = startAngleDeg;
            }

            // Falls diskrete Schritte verwendet werden:
            if (data && Array.isArray(data.data) && data.data.length > 1) {
                const clampedAngle = Math.max(startAngleDeg, Math.min(endAngleDeg, degrees));
                const fraction = (clampedAngle - startAngleDeg) / (endAngleDeg - startAngleDeg);
                const totalSteps = data.data.length - 1;
                const rawIndex = fraction * totalSteps;
                let nearestIndex = Math.round(rawIndex);
                if (nearestIndex < 0) nearestIndex = 0;
                if (nearestIndex > totalSteps) nearestIndex = totalSteps;
                const fractionBack = nearestIndex / totalSteps;
                const finalAngle = startAngleDeg + fractionBack * (endAngleDeg - startAngleDeg);
                setPointer(pointer, finalAngle);
            } else {
                setPointer(pointer, degrees);
            }
        },
        [
            $svg,
            pointer,
            setPointer,
            cx,
            cy,
            radius,
            startAngleDeg,
            endAngleDeg,
            settings.disabled,
            settings.snapToStartOnOverflow, // Neu in Abhängigkeiten aufnehmen
            data,
        ]
    );

    const onMouseUp = () => {
        console.debug('[Pointer] onMouseUp triggered');
        window.removeEventListener('mousemove', onValueChange);
        window.removeEventListener('mouseup', onMouseUp);
    };

    const onMouseDown = (evt) => {
        if (settings.disabled || pointer.disabled) {
            console.debug('[Pointer] onMouseDown aborted (disabled)');
            return;
        }
        console.debug('[Pointer] onMouseDown triggered', evt);
        onValueChange(evt);
        window.addEventListener('mousemove', onValueChange);
        window.addEventListener('mouseup', onMouseUp);
    };

    const onKeyDown = (evt) => {
        if (settings.disabled || pointer.disabled || settings.keyboardDisabled) {
            console.debug('[Pointer] onKeyDown aborted (disabled or keyboardDisabled)');
            return;
        }
        console.debug('[Pointer] onKeyDown triggered', evt.key);
        switch (evt.key) {
            case 'ArrowLeft':
            case 'ArrowDown':
                evt.preventDefault();
                console.debug('[Pointer] onKeyDown - Decrementing pointer by', data.arrowStepAngleDeg);
                setPointer(pointer, pointer.angleDeg - data.arrowStepAngleDeg);
                break;
            case 'ArrowRight':
            case 'ArrowUp':
                evt.preventDefault();
                console.debug('[Pointer] onKeyDown - Incrementing pointer by', data.arrowStepAngleDeg);
                setPointer(pointer, pointer.angleDeg + data.arrowStepAngleDeg);
                break;
            default:
                break;
        }
    };

    useEffect(() => {
        const current = pointerRef.current;
        const onTouch = (evt) => {
            if (settings.disabled || pointer.disabled) {
                console.debug('[Pointer] onTouch aborted (disabled)');
                return;
            }
            evt.preventDefault();
            evt.stopPropagation();
            console.debug('[Pointer] onTouch triggered', evt);
            onValueChange(evt);
        };

        const onWheel = (evt) => {
            if (
                settings.disabled ||
                pointer.disabled ||
                settings.mousewheelDisabled ||
                document.activeElement !== current
            ) {
                console.debug('[Pointer] onWheel aborted (disabled or mousewheelDisabled)');
                return;
            }
            evt.stopPropagation();
            evt.preventDefault();
            let newAngleDeg;
            if (evt.deltaY < 0) {
                newAngleDeg = pointer.angleDeg + data.arrowStepAngleDeg;
            } else {
                newAngleDeg = pointer.angleDeg - data.arrowStepAngleDeg;
            }
            console.debug('[Pointer] onWheel triggered', { deltaY: evt.deltaY, newAngleDeg });
            setPointer(pointer, newAngleDeg);
        };

        if (current) {
            current.addEventListener('touchmove', onTouch, { passive: false });
        }
        document.addEventListener('wheel', onWheel, { passive: false });

        return () => {
            if (current) {
                current.removeEventListener('touchmove', onTouch);
            }
            document.removeEventListener('wheel', onWheel);
        };
    }, [onValueChange, data.arrowStepAngleDeg, pointer, setPointer, settings.disabled, settings.mousewheelDisabled]);

    const onMouseOver = () => {
        console.debug('[Pointer] onMouseOver triggered');
        setIsMouseOver(true);
    };

    const onMouseOut = () => {
        console.debug('[Pointer] onMouseOut triggered');
        setIsMouseOver(false);
    };

    return center ? (
        <g
            ref={pointerRef}
            transform={`translate(${center[0] - pointerRadius}, ${center[1] - pointerRadius})`}
            role="slider"
            aria-disabled={pointer.disabled ? true : undefined}
            aria-valuenow={pointer.angleDeg}
            aria-valuetext={value}
            aria-label={pointer.ariaLabel}
            data-type="pointer"
            className={`mz-round-slider-pointer ${pointer.disabled ? 'mz-round-slider-pointer-disabled' : ''}`}
            data-angle={pointer.angleDeg}
            data-id={pointer.id}
            data-index={pointer.index}
            onMouseDown={onMouseDown}
            onKeyDown={onKeyDown}
            onMouseOver={onMouseOver}
            onMouseOut={onMouseOut}
            tabIndex={0}
            cursor={pointer.disabled ? 'default' : 'pointer'}
            style={{ outline: 'none' }}
        >
            {!settings.pointerSVG ? (
                <circle
                    cx={pointerRadius}
                    cy={pointerRadius}
                    r={pointerRadius}
                    fill={fill}
                    strokeWidth={border}
                    stroke={borderColor}
                    style={{ transition: '0.3s fill' }}
                />
            ) : (
                <g>{settings.pointerSVG}</g>
            )}
        </g>
    ) : null;
};

export default Pointer;

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { getBoolean, getNumber, getString } from '../domain/common-provider';
import {
    DEFAULT_ANIMATION_DURATION,
    DEFAULT_CONNECTION_BG_COLOR,
    DEFAULT_CONNECTION_BG_COLOR_DISABLED,
} from '../domain/defaults-provider';
import { getAngleByMouse, getClosestPointer, getMinMaxDistancePointers } from '../domain/pointers-provider';
import { getConnection } from '../domain/connection-provider';
import { animate } from 'mz-math';
import { getAnimationProgressAngle } from '../domain/animation-provider';

const Connection = (props) => {
    const { settings, pointers, $svg, svg, data, setPointer, onConnectionClick } = props;
    const currentSettings = settings || {};
    const { startAngleDeg, endAngleDeg, radius, cx, cy, thickness } =
    svg || { startAngleDeg: 0, endAngleDeg: 360, radius: 0, cx: 0, cy: 0, thickness: 0 };

    const [connection, setConnection] = useState(null);
    const [animation, setAnimation] = useState(null);
    const [stroke, setStroke] = useState(DEFAULT_CONNECTION_BG_COLOR);
    const [isMouseOver, setIsMouseOver] = useState(false);

    const rangeDraggingLastAngle = useRef();
    const animationClosestPointer = useRef(null);
    const animationSourceDegrees = useRef(0);
    const animationTargetDegrees = useRef(0);

    useEffect(() => {
        const newStroke = getString(
            currentSettings.disabled
                ? currentSettings.connectionBgColorDisabled
                : isMouseOver
                    ? currentSettings.connectionBgColorHover
                    : currentSettings.connectionBgColor,
            DEFAULT_CONNECTION_BG_COLOR
        );
        setStroke(newStroke);
    }, [
        currentSettings.disabled,
        currentSettings.connectionBgColorDisabled,
        currentSettings.connectionBgColor,
        currentSettings.connectionBgColorHover,
        isMouseOver,
    ]);

    useEffect(() => {
        //console.log("[Connection] Setting connection with:", { radius, cx, cy, startAngleDeg, endAngleDeg });
        const conn = getConnection(pointers, radius, cx, cy, startAngleDeg, endAngleDeg);
        //console.log("[Connection] Connection calculated:", conn);
        setConnection(conn);
    }, [pointers, radius, cx, cy, startAngleDeg, endAngleDeg]);

    const onClick = (evt) => {
        //console.log("[Connection] onClick triggered", { evt, $svg });
        if (!$svg || currentSettings.disabled || (animation && animation.isAnimating())) {
            console.warn("[Connection] Click aborted ($svg missing, disabled, or animation running)");
            return;
        }
        const degrees = getAngleByMouse($svg, evt.clientX, evt.clientY, cx, cy, radius, radius);
        //console.log("[Connection] Calculated angle:", degrees);
        
        // Wenn ein custom onClick-Handler vorhanden ist, verwende diesen
        if (onConnectionClick) {
            onConnectionClick(degrees);
            return;
        }
        
        const closestPointer = getClosestPointer(pointers.pointers, degrees, cx, cy, radius);
        if (!closestPointer) {
            console.warn("[Connection] No closest pointer found");
            return;
        }
        if (currentSettings.animateOnClick) {
            console.log("[Connection] Starting animation for pointer", closestPointer.id, {
                source: closestPointer.angleDeg,
                target: degrees,
            });
            animationClosestPointer.current = closestPointer;
            animationSourceDegrees.current = closestPointer.angleDeg;
            animationTargetDegrees.current = degrees;
            if (animation) animation.start();
        } else {
            //console.log("[Connection] Directly setting pointer angle to", degrees);
            setPointer(closestPointer, degrees);
        }
    };

    const onValueChange = useCallback((evt) => {
        //console.log("[Connection] onValueChange triggered", { evt });
        if (!$svg || currentSettings.disabled || !currentSettings.rangeDragging) return;
        const minMaxResult = getMinMaxDistancePointers(pointers.pointers, startAngleDeg);
        if (!minMaxResult) return;
        const [minPointer, maxPointer] = minMaxResult;
        const mouseDegrees = getAngleByMouse($svg, evt.clientX, evt.clientY, cx, cy, radius, radius);
        //console.log("[Connection] Mouse angle:", mouseDegrees);
        if (rangeDraggingLastAngle.current === undefined) {
            rangeDraggingLastAngle.current = mouseDegrees;
            return;
        }
        const diff = mouseDegrees - rangeDraggingLastAngle.current;
        //console.log("[Connection] Angle diff:", diff);
        if (diff === 0 || Math.abs(diff) < getNumber(data.stepAngleDeg, 1)) return;
        setPointer(minPointer, (minPointer.angleDeg + diff) % 360);
        setPointer(maxPointer, (maxPointer.angleDeg + diff) % 360);
        rangeDraggingLastAngle.current = mouseDegrees;
    }, [
        $svg,
        cx,
        cy,
        radius,
        startAngleDeg,
        data.stepAngleDeg,
        pointers.pointers,
        setPointer,
        currentSettings.disabled,
        currentSettings.rangeDragging,
    ]);

    const onMouseUp = () => {
        //console.log("[Connection] onMouseUp triggered");
        window.removeEventListener('mousemove', onValueChange);
        window.removeEventListener('mouseup', onMouseUp);
        rangeDraggingLastAngle.current = undefined;
    };

    const onMouseDown = (evt) => {
        //console.log("[Connection] onMouseDown triggered", { evt });
        if (!currentSettings.rangeDragging || currentSettings.disabled || pointers.pointers.length <= 1) return;
        onValueChange(evt);
        window.addEventListener('mousemove', onValueChange);
        window.addEventListener('mouseup', onMouseUp);
    };

    useEffect(() => {
        if (animation) animation.stop();
        if (!currentSettings.animateOnClick) {
            setAnimation(null);
            return;
        }
        const _animation = animate({
            callback: (progress) => {
                if (!animationClosestPointer.current) return;
                const currentDegrees = getAnimationProgressAngle(
                    progress,
                    animationSourceDegrees.current,
                    animationTargetDegrees.current,
                    startAngleDeg
                );
                //console.log("[Connection] Animation progress:", progress, "-> current angle:", currentDegrees);
                setPointer(animationClosestPointer.current, currentDegrees);
            },
            duration: getNumber(currentSettings.animationDuration, DEFAULT_ANIMATION_DURATION),
        });
        setAnimation(_animation);
    }, [currentSettings.animateOnClick, currentSettings.animationDuration, startAngleDeg, setPointer]);

    const onMouseOver = () => {
        //console.log("[Connection] Mouse over");
        setIsMouseOver(true);
    };

    const onMouseOut = () => {
        //console.log("[Connection] Mouse out");
        setIsMouseOver(false);
    };

    return (
        <>
            {!getBoolean(currentSettings.hideConnection, false) && connection && (
                <circle
                    data-type="connection"
                    className="mz-round-slider-connection"
                    cx={connection.cx}
                    cy={connection.cy}
                    r={connection.radius}
                    strokeDasharray={connection.strokeDasharray.join(' ')}
                    strokeDashoffset={connection.strokeOffset}
                    stroke={stroke}
                    strokeWidth={thickness + 1}
                    fill="none"
                    shapeRendering="geometricPrecision"
                    strokeLinecap="round"
                    cursor={currentSettings.disabled ? 'default' : 'pointer'}
                    onClick={onClick}
                    onMouseDown={onMouseDown}
                    onMouseOver={onMouseOver}
                    onMouseOut={onMouseOut}
                    style={{ transition: '0.2s stroke' }}
                />
            )}
        </>
    );
};

export default Connection;
import React, { useEffect, useState, useRef } from 'react';
import { getCircle } from '../domain/circle-provider';
import { getNumber, getString } from '../domain/common-provider';
import {
    DEFAULT_ANIMATION_DURATION,
    DEFAULT_PATH_BG_COLOR,
    DEFAULT_PATH_BORDER_COLOR,
} from '../domain/defaults-provider';
import { getAngleByMouse, getClosestPointer } from '../domain/pointers-provider';
import { animate, newId } from 'mz-math';
import { getAnimationProgressAngle } from '../domain/animation-provider';
import InnerCircle from './InnerCircle';

const Circle = (props) => {
    // Beachte: Wir lesen hier alle relevanten Props direkt aus props
    const {
        disabled,
        animateOnClick,
        animationDuration,
        pathInnerBgColor,
        pathBorderColor,
        pathBgColor, // Falls gesetzt, wird als Fallback genutzt
        trackStroke, // NEUE Prop: Damit bestimmst du den Stroke der Track (Sliderbahn)
        pointers,
        $svg,
        svg,
        setPointer,
    } = props;

    // Wir setzen hier default-Werte, falls svg nicht übergeben wird
    const currentSvg =
        svg || { startAngleDeg: 0, endAngleDeg: 360, radius: 0, cx: 0, cy: 0, thickness: 0, border: 0 };

    // Animation: Wir speichern die Animation-Instanz und Hilfsvariablen
    const animationRef = useRef(null);
    const [maskId] = useState(newId());
    const [circleState, setCircleState] = useState({
        strokeDasharray: '0 1000000',
        strokeOffset: 0,
    });
    const animationClosestPointer = useRef(null);
    const animationSourceDegrees = useRef(0);
    const animationTargetDegrees = useRef(0);

    // Berechne die Kreis-Geometrie, wenn sich die SVG-Einstellungen ändern
    useEffect(() => {
        if (currentSvg.radius) {
            const newCircle = getCircle(
                currentSvg.startAngleDeg,
                currentSvg.endAngleDeg,
                currentSvg.radius
            );
            setCircleState(newCircle);
        }
    }, [currentSvg.startAngleDeg, currentSvg.endAngleDeg, currentSvg.radius]);

    // onClick-Handler: Berechnet den Winkel anhand der Mausklickposition und startet ggf. die Animation
    const onClick = (evt) => {
        if (!$svg) return;
        if (disabled) return;
        if (animationRef.current && animationRef.current.isAnimating()) return;

        const degrees = getAngleByMouse(
            $svg,
            evt.clientX,
            evt.clientY,
            currentSvg.cx,
            currentSvg.cy,
            currentSvg.radius,
            currentSvg.radius
        );
        const closestPointer = getClosestPointer(
            pointers.pointers,
            degrees,
            currentSvg.cx,
            currentSvg.cy,
            currentSvg.radius
        );
        if (!closestPointer) return;

        if (animateOnClick) {
            animationClosestPointer.current = closestPointer;
            animationSourceDegrees.current = closestPointer.angleDeg;
            animationTargetDegrees.current = degrees;
            if (animationRef.current) {
                animationRef.current.start();
            }
        } else {
            setPointer(closestPointer, degrees);
        }
    };

    // Initialisiere (oder reinitialisiere) die Animation, wenn animateOnClick oder animationDuration sich ändern
    useEffect(() => {
        if (animationRef.current) {
            animationRef.current.stop();
        }
        if (!animateOnClick) {
            animationRef.current = null;
            return;
        }
        animationRef.current = animate({
            callback: (progress) => {
                if (!animationClosestPointer.current) return;
                const currentDegrees = getAnimationProgressAngle(
                    progress,
                    animationSourceDegrees.current,
                    animationTargetDegrees.current,
                    currentSvg.startAngleDeg
                );
                setPointer(animationClosestPointer.current, currentDegrees);
            },
            duration: getNumber(animationDuration, DEFAULT_ANIMATION_DURATION),
        });
    }, [animateOnClick, animationDuration, currentSvg.startAngleDeg, setPointer]);

    if (!svg) return null;

    return (
        <g onClick={onClick}>
            {/* InnerCircle: Wird gezeichnet, wenn pathInnerBgColor gesetzt ist */}
            {pathInnerBgColor && (
                <InnerCircle maskId={maskId} settings={props} svg={currentSvg} circle={circleState} />
            )}
            {/* Zeichne den Rand (falls border > 0) */}
            {currentSvg.border > 0 && (
                <circle
                    strokeDasharray={circleState.strokeDasharray}
                    strokeDashoffset={circleState.strokeOffset}
                    cx={currentSvg.cx}
                    cy={currentSvg.cy}
                    r={currentSvg.radius}
                    stroke={getString(pathBorderColor, DEFAULT_PATH_BORDER_COLOR)}
                    strokeWidth={currentSvg.thickness + currentSvg.border * 2}
                    fill="none"
                    shapeRendering="geometricPrecision"
                    strokeLinecap="round"
                    cursor="pointer"
                    data-type="path-border"
                    className="mz-round-slider-path-border"
                />
            )}
            {/* Haupt-Sliderbahn: Hier setzen wir den Stroke anhand der neuen Prop `trackStroke`.
                Falls trackStroke nicht gesetzt ist, wird pathBgColor (oder DEFAULT_PATH_BG_COLOR) genutzt. */}
            <circle
                strokeDasharray={circleState.strokeDasharray}
                strokeDashoffset={circleState.strokeOffset}
                cx={currentSvg.cx}
                cy={currentSvg.cy}
                r={currentSvg.radius}
                stroke={getString(trackStroke, getString(pathBgColor, DEFAULT_PATH_BG_COLOR))}
                strokeWidth={currentSvg.thickness}
                fill="none"
                shapeRendering="geometricPrecision"
                strokeLinecap="round"
                cursor="pointer"
                data-type="path"
                className="mz-round-slider-path"
            />
        </g>
    );
};

export default Circle;
import React, { useEffect, useState } from 'react';
import { circleMovement, convertRange, degreesToRadians, mod } from 'mz-math';
import { getBoolean } from '../domain/common-provider';

const InnerCircle = ({ svg, maskId, settings, circle }) => {
    const safeSvg = svg || { startAngleDeg: 0, endAngleDeg: 360, cx: 0, cy: 0, radius: 0, thickness: 0 };
    const currentSettings = settings || {};
    const safeCircle = circle || { strokeDasharray: '', strokeOffset: 0 };

    const [startPoint, setStartPoint] = useState([0, 0]);
    const [endPoint, setEndPoint] = useState([0, 0]);
    const [largeArcFlag, setLargeArcFlag] = useState(0);
    const [pathInnerBgFull, setPathInnerBgFull] = useState(false);

    useEffect(() => {
        if (mod(safeSvg.startAngleDeg, 360) === mod(safeSvg.endAngleDeg, 360)) {
            setPathInnerBgFull(true);
        } else {
            setPathInnerBgFull(getBoolean(currentSettings.pathInnerBgFull, false));
        }
    }, [currentSettings.pathInnerBgFull, safeSvg.startAngleDeg, safeSvg.endAngleDeg]);

    useEffect(() => {
        const startAngle = convertRange(safeSvg.startAngleDeg, 0, Math.PI * 2, 0, Math.PI);
        setStartPoint(circleMovement([safeSvg.cx, safeSvg.cy], degreesToRadians(startAngle), safeSvg.radius));
        const endAngle = convertRange(safeSvg.endAngleDeg, 0, Math.PI * 2, 0, Math.PI);
        setEndPoint(circleMovement([safeSvg.cx, safeSvg.cy], degreesToRadians(endAngle), safeSvg.radius));
        setLargeArcFlag(safeSvg.endAngleDeg - safeSvg.startAngleDeg <= 180 ? 1 : 0);
    }, [safeSvg]);

    return (
        <>
            {!pathInnerBgFull && (
                <mask id={maskId}>
                    <path
                        fill="black"
                        d={`M ${startPoint[0]} ${startPoint[1]} A ${safeSvg.radius} ${safeSvg.radius} 1 ${largeArcFlag} 0 ${endPoint[0]} ${endPoint[1]}`}
                    />
                    <path
                        fill="white"
                        d={`M ${startPoint[0]} ${startPoint[1]} A ${safeSvg.radius} ${safeSvg.radius} 0 ${largeArcFlag === 1 ? 0 : 1} 1 ${endPoint[0]} ${endPoint[1]}`}
                    />
                </mask>
            )}
            <circle
                strokeDasharray={safeCircle.strokeDasharray}
                strokeDashoffset={safeCircle.strokeOffset}
                cx={safeSvg.cx}
                cy={safeSvg.cy}
                r={safeSvg.radius}
                stroke="transparent"
                strokeWidth={safeSvg.thickness}
                fill={currentSettings.pathInnerBgColor || '#FFFFFF'}
                shapeRendering="geometricPrecision"
                strokeLinecap="round"
                data-type="path-inner"
                className="mz-round-slider-path-inner"
                mask={pathInnerBgFull ? '' : `url(#${maskId})`}
            />
        </>
    );
};

export default InnerCircle;

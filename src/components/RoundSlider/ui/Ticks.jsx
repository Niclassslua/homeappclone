import React, { useEffect, useState, Fragment } from 'react';
import { getTicks, getTicksSettings } from '../domain/ticks-provider';

const defaultSettings = {
    ticksCount: 10,
    enableTicks: true,
    ticksWidth: 2,
    ticksColor: '#000',
    tickValuesColor: '#000',
    tickValuesFontSize: 12,
    tickValuesPrefix: '',
    tickValuesSuffix: '',
    tickValuesFontFamily: 'Arial',
};

const Ticks = ({ settings = defaultSettings, svg = {}, data = { data: [] } }) => {
    const [ticksSettings, setTicksSettings] = useState(null);
    const [ticks, setTicks] = useState([]);

    useEffect(() => {
        setTicksSettings(getTicksSettings(settings, data));
    }, [settings, data]);

    useEffect(() => {
        if (!ticksSettings || !svg.startAngleDeg || !svg.endAngleDeg) return;
        let endAngleDeg = svg.endAngleDeg;
        if (endAngleDeg < svg.startAngleDeg) {
            endAngleDeg += 360;
        }
        setTicks(getTicks(ticksSettings, ticksSettings.ticksCount, svg.startAngleDeg, endAngleDeg, svg, data));
    }, [data, svg, ticksSettings]);

    return (
        <>
            {ticksSettings && ticksSettings.enableTicks && (
                <g>
                    {ticks.map((tick, i) => {
                        const { x, y, x1, y1, textX, textY, showText, tickValue } = tick;
                        return (
                            <Fragment key={i}>
                                <line
                                    x1={x}
                                    y1={y}
                                    x2={x1}
                                    y2={y1}
                                    strokeWidth={ticksSettings.ticksWidth}
                                    stroke={ticksSettings.ticksColor}
                                    data-type="tick"
                                    className="mz-round-slider-tick"
                                />
                                {showText && (
                                    <text
                                        data-type="tick-text"
                                        className="mz-round-slider-tick-text"
                                        x={textX}
                                        y={textY}
                                        textAnchor="middle"
                                        dominantBaseline="middle"
                                        fill={ticksSettings.tickValuesColor}
                                        fontSize={ticksSettings.tickValuesFontSize}
                                        fontFamily={settings.tickValuesFontFamily || defaultSettings.tickValuesFontFamily}
                                        style={{ userSelect: 'none', whiteSpace: 'pre' }}
                                    >
                                        {settings.tickValuesPrefix}
                                        {tickValue}
                                        {settings.tickValuesSuffix}
                                    </text>
                                )}
                            </Fragment>
                        );
                    })}
                </g>
            )}
        </>
    );
};

export default Ticks;

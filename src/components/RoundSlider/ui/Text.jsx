import React, { useEffect, useState } from 'react';
import { angle2value } from '../domain/pointers-provider';
import { getNumber, getString } from '../domain/common-provider';
import { DEFAULT_TEXT_COLOR, DEFAULT_TEXT_FONT_SIZE } from '../domain/defaults-provider';

const Text = ({ settings, pointers, svg, data }) => {
    // Standardwerte aus SVG, falls nicht vorhanden
    const { cx, cy, startAngleDeg, endAngleDeg } =
    svg || { cx: 0, cy: 0, startAngleDeg: 0, endAngleDeg: 360 };

    // Lese und setze Standard-Text-Einstellungen:
    const currentSettings = {
        textPrefix: settings.textPrefix || '',
        textSuffix: settings.textSuffix || '',
        textBetween: settings.textBetween || ' ',
        textOffsetX: settings.textOffsetX || 0,
        textOffsetY: settings.textOffsetY || 0,
        textColor: settings.textColor || DEFAULT_TEXT_COLOR,
        textFontSize: getNumber(settings.textFontSize, DEFAULT_TEXT_FONT_SIZE),
        textFontFamily: settings.textFontFamily,
        hideText: settings.hideText || false,
        // Neue Properties:
        valueStep: settings.valueStep !== undefined ? Number(settings.valueStep) : 1,
        displayFixedDecimal: settings.displayFixedDecimal || false,
        decimalSeparator: settings.decimalSeparator || '.',
        enableTextAnimation: settings.enableTextAnimation || false,
    };

    // Globale States zum Vergleichen des alten und neuen numerischen Werts
    const [prevNumeric, setPrevNumeric] = useState(null);
    const [finalText, setFinalText] = useState('');
    // Globaler Animationsmodus ('up' bei steigenden, 'down' bei fallenden Werten)
    const [animDirection, setAnimDirection] = useState('');

    // Beim Aktualisieren der Pointer-Winkel wird der neue numerische Wert berechnet,
    // formatiert und als String (z.B. "34.0") erzeugt.
    useEffect(() => {
        if (!pointers || !pointers.pointers || pointers.pointers.length === 0 || !data) return;
        // Wir nehmen den ersten Pointer
        const pointer = pointers.pointers[0];
        if (pointer.angleDeg === undefined || pointer.angleDeg === null || isNaN(pointer.angleDeg)) {
            console.warn('[Text] Invalid angleDeg:', pointer.angleDeg);
            return;
        }
        const rawValue = angle2value(data, pointer.angleDeg, startAngleDeg, endAngleDeg);
        const step = currentSettings.valueStep;
        const roundedValue = Math.round(rawValue / step) * step;

        // Bestimme die globale Animationsrichtung anhand des Vergleichs mit dem vorherigen Wert:
        let direction = '';
        if (prevNumeric !== null) {
            if (roundedValue > prevNumeric) direction = 'up';
            else if (roundedValue < prevNumeric) direction = 'down';
        }
        setPrevNumeric(roundedValue);
        setAnimDirection(direction);

        // Formatiere den Wert: Entweder als Fixed (z.B. "34.0") oder normal (z.B. "34")
        let strValue = currentSettings.displayFixedDecimal
            ? roundedValue.toFixed(1)
            : roundedValue.toString();
        if (currentSettings.decimalSeparator !== '.') {
            strValue = strValue.replace('.', currentSettings.decimalSeparator);
        }
        const textStr = `${currentSettings.textPrefix}${strValue}${currentSettings.textSuffix}`;
        setFinalText(textStr);
    }, [
        data,
        startAngleDeg,
        endAngleDeg,
        currentSettings.textPrefix,
        currentSettings.textSuffix,
        currentSettings.valueStep,
        currentSettings.displayFixedDecimal,
        currentSettings.decimalSeparator,
        // Damit der Effekt neu ausgeführt wird, wenn sich ein Pointer-Winkel ändert:
        pointers.pointers.map(p => p.angleDeg).join(',')
    ]);

    // Komponente, die eine einzelne Ziffer animiert,
    // wenn sich ihr Wert ändert.
    const AnimatedDigit = ({ char, animDirection }) => {
        const [prevChar, setPrevChar] = useState(char);
        const [animating, setAnimating] = useState(false);

        useEffect(() => {
            if (char !== prevChar) {
                setAnimating(true);
                const timer = setTimeout(() => {
                    setPrevChar(char);
                    setAnimating(false);
                }, 300); // Animationsdauer in ms
                return () => clearTimeout(timer);
            }
        }, [char, prevChar]);

        // Definiere Inline-Stile für Exit- und Enter-Animation
        const exitStyle = {
            position: 'absolute',
            left: 0,
            top: animDirection === 'up' ? '-10px' : '10px',
            opacity: 0,
            transition: 'all 0.3s ease'
        };

        const enterStyle = {
            transform: animating ? `translateY(${animDirection === 'up' ? '10px' : '-10px'})` : 'translateY(0)',
            opacity: animating ? 0 : 1,
            transition: 'all 0.3s ease'
        };

        return (
            <tspan style={{ position: 'relative', display: 'inline-block', width: '1ch' }}>
                {animating && (
                    <tspan style={exitStyle}>
                        {prevChar}
                    </tspan>
                )}
                <tspan style={enterStyle}>
                    {char}
                </tspan>
            </tspan>
        );
    };

    if (currentSettings.hideText) return null;

    return (
        <text
            data-type="text"
            className="mz-round-slider-text"
            x={cx + getNumber(currentSettings.textOffsetX, 0)}
            y={cy + getNumber(currentSettings.textOffsetY, 0)}
            fill={getString(currentSettings.textColor, DEFAULT_TEXT_COLOR)}
            fontSize={getNumber(currentSettings.textFontSize, DEFAULT_TEXT_FONT_SIZE)}
            fontFamily={currentSettings.textFontFamily}
            style={{ userSelect: 'none', whiteSpace: 'pre' }}
            textAnchor="middle"
        >
            {currentSettings.enableTextAnimation
                ? finalText.split('').map((c, i) => (
                    <AnimatedDigit key={i} char={c} animDirection={animDirection} />
                ))
                : finalText}
        </text>
    );
};

export default Text;

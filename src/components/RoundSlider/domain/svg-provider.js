import { setDecimalPlaces } from 'mz-math';

export const getSvg = (circleRadius, circleThickness, circleBorder, pointerRadius, startAngleDeg, endAngleDeg) => {
    const thickness = circleThickness + (circleBorder || 0) * 2;
    // Gesamtgröße: Kreisdiameter + Strichstärke
    const size = circleRadius * 2 + thickness;
    const cx = size / 2;
    const cy = size / 2;
    return {
        cx,
        cy,
        radius: circleRadius,
        thickness,
        border: circleBorder || 0,
        startAngleDeg,
        endAngleDeg,
    };
};



export const getSVGCenter = (circleRadius, maxPointerRadius, circleThickness, circleBorder) => {
    const size = getSVGSize(circleRadius, maxPointerRadius, circleThickness, circleBorder);
    const val = setDecimalPlaces(size / 2, 2);
    return [val, val];
};

export const getSVGSize = (circleRadius, maxPointerRadius, circleThickness, circleBorder) => {
    const thickness = circleThickness + circleBorder * 2;
    const diff = Math.max(0, maxPointerRadius * 2 - thickness);
    return circleRadius * 2 + thickness + diff;
};

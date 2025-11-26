import { getAnglesDistance } from './pointers-provider.js';

export const getConnection = (
    pointers,
    radius,
    cx,
    cy,
    pathStartAngle,
    pathEndAngle
) => {
    if (!pointers.pointers || pointers.pointers.length <= 0) return null;

    const result = {
        radius,
        cx,
        cy,
        startAngleDeg: pathStartAngle,
        endAngleDeg: pathStartAngle,
        strokeDasharray: [0, 0],
        strokeOffset: 0,
    };

    if (pointers.pointers.length === 1) {
        result.startAngleDeg = pathStartAngle;
        result.endAngleDeg = pointers.pointers[0].angleDeg;
    } else {
        result.startAngleDeg = pointers.pointers[0].angleDeg;
        result.endAngleDeg = pointers.pointers[pointers.pointers.length - 1].angleDeg;
    }

    const pathAnglesDistance = getAnglesDistance(pathStartAngle, pathEndAngle);

    if (result.startAngleDeg > result.endAngleDeg) {
        result.endAngleDeg += 360;
    }

    let angleDistance = getAnglesDistance(result.startAngleDeg, result.endAngleDeg);
    const shouldSwitch = angleDistance > pathAnglesDistance;

    if (shouldSwitch) {
        angleDistance = 360 - angleDistance;
        [result.startAngleDeg, result.endAngleDeg] = [result.endAngleDeg, result.startAngleDeg];
    }

    const circumference = 2 * Math.PI * radius;
    const strokeOffset = -(result.startAngleDeg / 360) * circumference;
    const strokeDasharray = (angleDistance / 360) * circumference;
    const complement = circumference - strokeDasharray;

    result.strokeDasharray = [strokeDasharray, complement];
    result.strokeOffset = strokeOffset;

    return result;
};

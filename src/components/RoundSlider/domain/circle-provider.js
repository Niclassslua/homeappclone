// Berechnet stroke-dasharray und stroke-dashoffset für den äußeren Kreispfad
export const getCircle = (startAngleDeg, endAngleDeg, radius) => {
    startAngleDeg = ((startAngleDeg % 360) + 360) % 360;
    endAngleDeg = ((endAngleDeg % 360) + 360) % 360;

    const circumference = 2 * Math.PI * radius;
    let angleDiff = endAngleDeg - startAngleDeg;
    if (angleDiff < 0) angleDiff += 360;
    const dash = (angleDiff / 360) * circumference;
    const offset = -(startAngleDeg / 360) * circumference;
    return {
        strokeDasharray: `${dash} ${circumference - dash}`,
        strokeOffset: offset,
    };
};

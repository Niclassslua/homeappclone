import {mod, setDecimalPlaces} from 'mz-math';
import { getNumber, getString, getBoolean } from './common-provider.js';
import {
    DEFAULT_PATH_START_ANGLE,
    DEFAULT_PATH_END_ANGLE,
    DEFAULT_POINTER_RADIUS,
    DEFAULT_POINTER_BG_COLOR,
    DEFAULT_POINTER_BG_COLOR_SELECTED,
    DEFAULT_POINTER_BG_COLOR_DISABLED,
    DEFAULT_POINTER_BORDER,
    DEFAULT_POINTER_BORDER_COLOR,
} from './defaults-provider.js';
import { convertRange, degreesToRadians, circleMovement, v2Distance } from 'mz-math';

export const isAngleInArc = (startAngleDeg, endAngleDeg, currentDegrees) => {
    if (currentDegrees === undefined || currentDegrees === null || isNaN(currentDegrees)) {
        return false;
    }
    if (startAngleDeg > endAngleDeg) {
        endAngleDeg += 360;
    }
    return (
        (currentDegrees >= startAngleDeg && currentDegrees <= endAngleDeg) ||
        ((currentDegrees + 360) >= startAngleDeg && (currentDegrees + 360) <= endAngleDeg)
    );
};

export const value2angle = (data, value, startAngle, endAngle) => {
    const min = data.min || 0;
    const max = data.max || 100;
    const ratio = (value - min) / (max - min);
    return startAngle + ratio * (endAngle - startAngle);
};

export const angle2value = (data, angleDeg, startAngleDeg, endAngleDeg) => {
    // Handle undefined or NaN values
    if (angleDeg === undefined || angleDeg === null || isNaN(angleDeg)) {
        console.warn('[angle2value] Invalid angleDeg:', angleDeg, 'returning min value');
        return data.min || 0;
    }

    // Normalize angles to 0-360 range
    startAngleDeg = ((startAngleDeg % 360) + 360) % 360;
    endAngleDeg = ((endAngleDeg % 360) + 360) % 360;

    // Handle wrap-around cases
    const totalAngle = endAngleDeg > startAngleDeg
        ? endAngleDeg - startAngleDeg
        : 360 - startAngleDeg + endAngleDeg;

    let normalizedAngle = ((angleDeg - startAngleDeg) + 360) % 360;

    // Prevent values beyond total angle
    if(normalizedAngle > totalAngle) {
        normalizedAngle = totalAngle;
    }

    const percentage = normalizedAngle / totalAngle;

    const finalValue = data.min + percentage * (data.max - data.min);
    return finalValue;
};

export const initPointers = (settings, data) => {
    if (!settings || !settings.pointers || settings.pointers.length < 0 || !data) {
        const angleDeg = mod(getNumber(settings.pathStartAngle, DEFAULT_PATH_START_ANGLE), 360);
        const bgColor = getString(settings.pointerBgColor, DEFAULT_POINTER_BG_COLOR);
        const bgColorSelected = getString(settings.pointerBgColorSelected, DEFAULT_POINTER_BG_COLOR_SELECTED);
        const bgColorDisabled = getString(settings.pointerBgColorDisabled, DEFAULT_POINTER_BG_COLOR_DISABLED);
        const bgColorHover = getString(settings.pointerBgColorHover, bgColorSelected);
        return [
            {
                id: '0',
                index: 0,
                radius: getNumber(settings.pointerRadius, DEFAULT_POINTER_RADIUS),
                angleDeg,
                prevAngleDeg: angleDeg,
                bgColor,
                bgColorSelected,
                bgColorDisabled,
                bgColorHover,
                border: getNumber(settings.pointerBorder, DEFAULT_POINTER_BORDER),
                borderColor: getString(settings.pointerBorderColor, DEFAULT_POINTER_BORDER_COLOR),
                disabled: !!settings.disabled,
            },
        ];
    }

    const pointers = [];

    for (let i = 0; i < settings.pointers.length; i++) {
        const settingPointer = settings.pointers[i];
        const radius =
            settingPointer.radius !== undefined
                ? settingPointer.radius
                : getNumber(settings.pointerRadius, DEFAULT_POINTER_RADIUS);
        const bgColor = settingPointer.bgColor
            ? settingPointer.bgColor
            : getString(settings.pointerBgColor, DEFAULT_POINTER_BG_COLOR);
        const bgColorSelected = settingPointer.bgColorSelected
            ? settingPointer.bgColorSelected
            : getString(settings.pointerBgColorSelected, DEFAULT_POINTER_BG_COLOR_SELECTED);
        const bgColorDisabled = settingPointer.bgColorDisabled
            ? settingPointer.bgColorDisabled
            : getString(settings.pointerBgColorDisabled, DEFAULT_POINTER_BG_COLOR_DISABLED);
        const bgColorHover = settingPointer.bgColorHover
            ? settingPointer.bgColorHover
            : getString(settings.pointerBgColorHover, bgColorSelected);
        const border = settingPointer.border
            ? settingPointer.border
            : getNumber(settings.pointerBorder, DEFAULT_POINTER_BORDER);
        const borderColor = settingPointer.borderColor
            ? settingPointer.borderColor
            : getString(settings.pointerBorderColor, DEFAULT_POINTER_BORDER_COLOR);
        const disabled =
            settingPointer.disabled !== undefined
                ? settingPointer.disabled
                : getBoolean(settings.disabled, false);
        const pathStartAngle = getNumber(settings.pathStartAngle, DEFAULT_PATH_START_ANGLE);
        const pathEndAngle = getNumber(settings.pathEndAngle, DEFAULT_PATH_END_ANGLE);
        const angleDeg = value2angle(data, settingPointer.value, pathStartAngle, pathEndAngle);
        let angleAfterStep = roundToStep(angleDeg, data.stepAngleDeg, pathStartAngle, pathEndAngle);
        if (data.isClosedShape && mod(angleAfterStep, 360) === mod(pathEndAngle, 360)) {
            angleAfterStep = pathStartAngle;
        }
        pointers.push({
            id: i.toString(),
            index: i,
            radius,
            angleDeg: angleAfterStep,
            prevAngleDeg: angleAfterStep,
            bgColor,
            bgColorSelected,
            bgColorDisabled,
            bgColorHover,
            border,
            borderColor,
            disabled,
            ariaLabel: settingPointer.ariaLabel,
        });
    }

    return pointers;
};

export const getPointers = (settings, data) => {
    const pointers = initPointers(settings, data);
    return {
        pointers,
        maxRadius: getMaxRadius(pointers),
    };
};

const getMaxRadius = (pointers) => {
    if (pointers.length <= 0) return 0;
    let max = -Infinity;
    for (const pointer of pointers) {
        max = Math.max(max, Math.max(0, pointer.radius + pointer.border / 2));
    }
    return max;
};

export const getClosestPointer = (pointers, currentPlaceDegrees, cx, cy, pathRadius) => {
    if (!pointers || pointers.length <= 0) return null;
    if (pointers.length === 1) return pointers[0];
    if (currentPlaceDegrees === undefined || currentPlaceDegrees === null || isNaN(currentPlaceDegrees)) {
        console.warn('[getClosestPointer] Invalid currentPlaceDegrees:', currentPlaceDegrees);
        return null;
    }
    const angleRad = convertRange(degreesToRadians(currentPlaceDegrees), 0, Math.PI * 2, 0, Math.PI);
    const currentPointOnArc = circleMovement([cx, cy], angleRad, pathRadius);
    let min;
    let closestPointer = null;
    const enabledPointers = pointers.filter((p) => !p.disabled && p.angleDeg !== undefined && p.angleDeg !== null && !isNaN(p.angleDeg));
    for (const pointer of enabledPointers) {
        const pointerAngleRad = convertRange(degreesToRadians(pointer.angleDeg), 0, Math.PI * 2, 0, Math.PI);
        const pointOnArc = circleMovement([cx, cy], pointerAngleRad, pathRadius);
        const distance = v2Distance(currentPointOnArc, pointOnArc);
        if (min === undefined || distance < min) {
            min = distance;
            closestPointer = pointer;
        }
    }
    return closestPointer ? { ...closestPointer } : null;
};

export const getClosestEdge = (startAngleDegrees, endAngleDegrees, currentPlaceDegrees, cx, cy, pathRadius) => {
    if (currentPlaceDegrees === undefined || currentPlaceDegrees === null || isNaN(currentPlaceDegrees)) {
        console.warn('[getClosestEdge] Invalid currentPlaceDegrees:', currentPlaceDegrees, 'returning startAngleDegrees');
        return startAngleDegrees;
    }
    const angleRad = convertRange(degreesToRadians(currentPlaceDegrees), 0, Math.PI * 2, 0, Math.PI);
    const currentPointOnArc = circleMovement([cx, cy], angleRad, pathRadius);
    const startAngleRad = convertRange(degreesToRadians(startAngleDegrees), 0, Math.PI * 2, 0, Math.PI);
    const startPointOnArc = circleMovement([cx, cy], startAngleRad, pathRadius);
    const endAngleRad = convertRange(degreesToRadians(endAngleDegrees), 0, Math.PI * 2, 0, Math.PI);
    const endPointOnArc = circleMovement([cx, cy], endAngleRad, pathRadius);
    const distance1 = v2Distance(currentPointOnArc, startPointOnArc);
    const distance2 = v2Distance(currentPointOnArc, endPointOnArc);
    return distance1 <= distance2 ? startAngleDegrees : endAngleDegrees;
};

export const getAnglesDistance = (startAngle, endAngle) => {
    if (endAngle < startAngle) {
        endAngle += 360;
    }
    const diff = endAngle - startAngle;
    const diffMod = mod(diff, 360);
    return diffMod === 0 && diff > 0 ? 360 : diffMod;
};

export const getMinMaxDistancePointers = (pointers, pathStartAngle) => {
    if (!pointers || pointers.length <= 0) return null;
    let minDistance;
    let maxDistance;
    let minPointer = null;
    let maxPointer = null;
    for (const pointer of pointers) {
        const distance = getAnglesDistance(pathStartAngle, pointer.angleDeg);
        if (minDistance === undefined || distance < minDistance) {
            minPointer = pointer;
            minDistance = distance;
        }
        if (maxDistance === undefined || distance > maxDistance) {
            maxPointer = pointer;
            maxDistance = distance;
        }
    }
    if (minPointer === null || maxPointer === null) return null;
    return [minPointer, maxPointer];
};

export const roundToStep = (angleDeg, step, pathStartAngle, pathEndAngle) => {
    if (
        mod(angleDeg, 360) === mod(pathStartAngle, 360) ||
        mod(angleDeg, 360) === mod(pathEndAngle, 360)
    )
        return angleDeg;
    return step === 0 ? 0 : Math.round(angleDeg / step) * step;
};

export const getAngleByMouse = ($svg, clientX, clientY, cx, cy, rx, ry) => {
    const { left, top } = $svg.getBoundingClientRect();
    const relativeMouse = [clientX - left, clientY - top];
    const vector = [relativeMouse[0] - cx, relativeMouse[1] - cy];
    let angle = Math.atan2(vector[1] / ry, vector[0] / rx);
    if (angle < 0) angle += 2 * Math.PI;
    return angle * (180 / Math.PI);
};
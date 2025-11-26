// src/utils/helpers.js
import { serviceTypeMapping, serviceTypeIcons, typeColorMapping } from '../config/mappings';

export function getIconUrl(device) {
    if (device.isOn && device.customIconOn) return device.customIconOn;
    if (!device.isOn && device.customIconOff) return device.customIconOff;
    const mappedType = serviceTypeMapping[device.humanType];
    const icon = serviceTypeIcons[mappedType];
    return icon ? (device.isOn ? icon.on : icon.off) : "/icons/default.svg";
}

export function getOffColor(humanType) {
    const mappedType = serviceTypeMapping[humanType];
    return typeColorMapping[mappedType] || "#3B82F6";
}

export function getReadCharacteristicType(humanType) {
    const readCharacteristicMapping = {
        "Air Purifier": "Active",
        "Heater Cooler": "Active",
        "Fan": "Active",
        "Humidifier Dehumidifier": "Active",
        "Ventilation Fan": "Active",
        "Television": "Active",
    };
    return readCharacteristicMapping[humanType] || "On";
}
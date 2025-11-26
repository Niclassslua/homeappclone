export const getNumber = (value, defaultValue) =>
    typeof value === 'number' ? value : defaultValue;

export const getString = (value, defaultValue) =>
    value !== undefined && value !== null ? value : defaultValue;

export const getBoolean = (value, defaultValue) =>
    typeof value === 'boolean' ? value : defaultValue;

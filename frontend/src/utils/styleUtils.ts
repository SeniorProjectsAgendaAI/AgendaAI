// a utility so i dont hve to rewrite every file instance that shows an event (most of them)
export const DEFAULT_TASK_COLOR = "#4A90E2";
export const DEFAULT_EVENT_COLOR = "#4A90E2";

export const normalizeHexColor = (value?: string | null, fallback = DEFAULT_TASK_COLOR) => {
    if (!value) return fallback;
    const color = value.trim();
    return /^#[0-9A-Fa-f]{6}$/.test(color) ? color : fallback;
};

export const parseColorAndPattern = (value?: string | null, fallbackColor = DEFAULT_TASK_COLOR) => {
    if (!value) return { color: fallbackColor, pattern: "solid" };
    const str = value.trim();
    if (str.includes(":")) {
        const [pattern, color] = str.split(":");
        return { pattern, color: normalizeHexColor(color, fallbackColor) };
    }
    return { pattern: "solid", color: normalizeHexColor(str, fallbackColor) };
};

export const encodeColorAndPattern = (color: string, pattern: string) => {
    return `${pattern}:${normalizeHexColor(color)}`;
};

export const getPatternStyle = (color: string, pattern: string): React.CSSProperties => {
    const spacing = "5px";
    const transparentSpacing = "10px";
    switch (pattern) {
        case "diagonal-right":
            return { backgroundImage: `repeating-linear-gradient(45deg, ${color}, ${color} ${spacing}, transparent ${spacing}, transparent ${transparentSpacing})` };
        case "diagonal-left":
            return { backgroundImage: `repeating-linear-gradient(-45deg, ${color}, ${color} ${spacing}, transparent ${spacing}, transparent ${transparentSpacing})` };
        case "vertical":
            return { backgroundImage: `repeating-linear-gradient(90deg, ${color}, ${color} ${spacing}, transparent ${spacing}, transparent ${transparentSpacing})` };
        case "horizontal":
            return { backgroundImage: `repeating-linear-gradient(0deg, ${color}, ${color} ${spacing}, transparent ${spacing}, transparent ${transparentSpacing})` };
        case "solid":
        default:
            return { backgroundColor: color };
    }
};
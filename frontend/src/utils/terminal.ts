export const cleanTerminalTitle = (title: string): string => {
    // 1. Clean up common shell suffixes
    let cleanTitle = title.trim()
        .replace(/ - powershell/gi, "")
        .replace(/ - cmd/gi, "")
        .replace(/ - bash/gi, "")
        .replace(/ - zsh/gi, "")
        .replace(/Administrator: /gi, "");
    
    // 2. Extract only the last folder name if it's a path
    const parts = cleanTitle.split(/[\\/]/);
    const lastPart = parts[parts.length - 1];
    
    if (lastPart && lastPart.length > 0) {
        return lastPart;
    }
    return cleanTitle;
};

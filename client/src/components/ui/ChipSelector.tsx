import React, { useState, useRef } from "react";
import {
    Box,
    Chip,
    Typography,
    TextField,
    Collapse,
    InputAdornment,
} from "@mui/material";
import { Check, Close } from "@mui/icons-material";

interface ChipSelectorProps {
    label: string;
    options: string[];
    selected: string[];
    onChange: (values: string[]) => void;
    allowCreate?: boolean;
    helperText?: string;
    error?: boolean;
}

export const ChipSelector: React.FC<ChipSelectorProps> = ({
    label,
    options,
    selected,
    onChange,
    allowCreate = true,
    helperText,
    error,
}) => {
    const [createMode, setCreateMode] = useState(false);
    const [inputValue, setInputValue] = useState("");
    const [localError, setLocalError] = useState("");
    const inputRef = useRef<HTMLInputElement>(null);

    const toggleChip = (value: string) => {
        if (selected.includes(value)) {
            onChange(selected.filter((v) => v !== value));
        } else {
            onChange([...selected, value]);
        }
    };

    const handleCreateClick = () => {
        setCreateMode(true);
        setTimeout(() => inputRef.current?.focus(), 50);
    };

    const handleCreateConfirm = (isEnter: boolean = false) => {
        const trimmed = inputValue.trim();
        if (!trimmed) {
            setInputValue("");
            setCreateMode(false);
            setLocalError("");
            return;
        }

        const lowerTrimmed = trimmed.toLowerCase();

        // Find if the typed value exists case-insensitively in selected or options
        const alreadySelected = selected.find((s) => s.toLowerCase() === lowerTrimmed);
        const alreadyInOptions = options.find((o) => o.toLowerCase() === lowerTrimmed);

        if (alreadySelected) {
            if (isEnter) {
                setLocalError("This chip already exists");
            } else {
                setInputValue("");
                setCreateMode(false);
                setLocalError("");
            }
            return;
        }

        if (alreadyInOptions) {
            // It's in options but not selected, select it with original casing
            onChange([...selected, alreadyInOptions]);
            setInputValue("");
            setCreateMode(false);
            setLocalError("");
            return;
        }

        // New chip, add it with the casing the user typed
        onChange([...selected, trimmed]);
        setInputValue("");
        setCreateMode(false);
        setLocalError("");
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter") {
            e.preventDefault();
            handleCreateConfirm(true);
        }
        if (e.key === "Escape") {
            setInputValue("");
            setCreateMode(false);
            setLocalError("");
        }
    };

    // All chips to show = predefined options + any custom ones not already in options
    const customSelected = selected.filter((s) => !options.includes(s));
    const allOptions = [...options, ...customSelected];

    return (
        <Box>
            <Typography
                variant="body2"
                fontWeight={600}
                color={error ? "error.main" : "#344054"}
                mb={1.2}
            >
                {label}
            </Typography>
            <Box display="flex" flexWrap="wrap" gap={1} alignItems="center">
                {allOptions.map((option) => {
                    const isSelected = selected.includes(option);
                    return (
                        <Chip
                            key={option}
                            label={
                                <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                                    <Box sx={{ width: 14, height: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', mr: 0.5 }}>
                                        <Check
                                            sx={{
                                                fontSize: "14px !important",
                                                opacity: isSelected ? 1 : 0,
                                                transition: "opacity 0.15s ease",
                                            }}
                                        />
                                    </Box>
                                    <Typography sx={{ flex: 1, textAlign: 'center', fontSize: 'inherit', fontWeight: 'inherit', lineHeight: 1 }}>
                                        {option}
                                    </Typography>
                                    <Box sx={{ width: 14, mr: 0.5 }} /> {/* Invisible spacer to perfectly center the text */}
                                </Box>
                            }
                            onClick={() => toggleChip(option)}
                            size="medium"
                            sx={{
                                cursor: "pointer",
                                fontWeight: isSelected ? 600 : 400,
                                borderRadius: "8px",
                                transition: "all 0.15s ease",
                                bgcolor: isSelected ? "#E57B2C" : "#F9FAFB",
                                color: isSelected ? "#fff" : "#344054",
                                border: isSelected ? "1.5px solid #E57B2C" : "1.5px solid #EAECF0",
                                "& .MuiChip-label": {
                                    px: 1, // reduced horizontal padding since we added internal spacing
                                    width: "100%",
                                },
                                "&:hover": {
                                    bgcolor: isSelected ? "#C96A21" : "#F2F4F7",
                                    borderColor: isSelected ? "#C96A21" : "#D0D5DD",
                                },
                            }}
                        />
                    );
                })}

                {/* Create chip */}
                {allowCreate && !createMode && (
                    <Chip
                        label="+ Create"
                        onClick={handleCreateClick}
                        size="medium"
                        variant="outlined"
                        sx={{
                            cursor: "pointer",
                            borderRadius: "8px",
                            borderStyle: "dashed",
                            borderColor: "#D0D5DD",
                            color: "#667085",
                            fontWeight: 500,
                            bgcolor: "transparent",
                            "&:hover": {
                                bgcolor: "#F9FAFB",
                                borderColor: "#98A2B3",
                                color: "#344054",
                            },
                        }}
                    />
                )}

                {/* Inline input when creating */}
                <Collapse in={createMode} orientation="horizontal" unmountOnExit>
                    <Box display="flex" alignItems="center" gap={0.5}>
                        <TextField
                            inputRef={inputRef}
                            value={inputValue}
                            onChange={(e) => {
                                setInputValue(e.target.value);
                                if (localError) setLocalError("");
                            }}
                            onKeyDown={handleKeyDown}
                            onBlur={() => handleCreateConfirm(false)}
                            placeholder="Type and press Enter"
                            size="small"
                            autoComplete="off"
                            InputProps={{
                                endAdornment: (
                                    <InputAdornment position="end">
                                        <Close
                                            sx={{ fontSize: 16, cursor: "pointer", color: "#98A2B3" }}
                                            onMouseDown={(e) => {
                                                e.preventDefault();
                                                setInputValue("");
                                                setCreateMode(false);
                                            }}
                                        />
                                    </InputAdornment>
                                ),
                                sx: {
                                    borderRadius: "8px",
                                    height: 32,
                                    fontSize: 13,
                                    bgcolor: "#fff",
                                },
                            }}
                            sx={{ width: 180 }}
                        />
                    </Box>
                </Collapse>
            </Box>
            {localError ? (
                <Typography
                    variant="caption"
                    color="error.main" // same as MUI error
                    mt={0.5}
                    display="block"
                >
                    {localError}
                </Typography>
            ) : helperText && (
                <Typography
                    variant="caption"
                    color={error ? "error.main" : "#667085"}
                    mt={0.5}
                    display="block"
                >
                    {helperText}
                </Typography>
            )}
        </Box>
    );
};

export default ChipSelector;

import { useState } from "react";
import type { CSSProperties, ChangeEventHandler, FocusEventHandler } from "react";

interface FFInputFieldProps {
    label?: string;
    type?: string;
    placeholder?: string;
    value?: string | number | readonly string[];
    onChange?: ChangeEventHandler<HTMLInputElement>;
    name?: string;
    id?: string;
    error?: string;
    disabled?: boolean;
    required?: boolean;
    autoComplete?: string;
    style?: CSSProperties;
    onBlur?: FocusEventHandler<HTMLInputElement>;
    onFocus?: FocusEventHandler<HTMLInputElement>;
}

// ─── Reusable InputField Component ────────────────────────────────────────────
export const FFInputField = ({
    label,
    type = "text",
    placeholder = "",
    value,
    onChange,
    name,
    id,
    error = "",
    disabled = false,
    required = false,
    autoComplete,
    style = {},
    onBlur,
    onFocus,
}: FFInputFieldProps) => {
    const [focused, setFocused] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const isPassword = type === "password";
    const inputType = isPassword ? (showPassword ? "text" : "password") : type;

    const inputId = id || name || label?.toLowerCase().replace(/\s+/g, "-");

    const styles = {
        wrapper: {
            display: "flex",
            flexDirection: "column" as const, // Explicit cast for TypeScript
            gap: "6px",
            width: "100%",
            // maxWidth: "360px", // Removed hardcoded maxWidth to fixing width consistency
            ...style,
        },
        label: {
            fontSize: "14px",
            fontWeight: 500,
            color: "#344054",
            fontFamily:
                '"Inter", "SF Pro Display", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
            lineHeight: "20px",
        },
        inputWrapper: {
            position: "relative" as const,
            display: "flex",
            alignItems: "center",
        },
        input: {
            width: "100%",
            height: "44px",
            borderRadius: "8px", // radius-md
            border: error
                ? "1px solid #FDA29B"
                : focused
                    ? "1px solid #E57B2C"
                    : "1px solid #D0D5DD",
            boxShadow: error
                ? "0px 1px 2px 0px #1018280D, 0 0 0 4px #FEE4E2"
                : focused
                    ? "0px 1px 2px 0px #1018280D, 0 0 0 4px rgba(229, 123, 44, 0.12)"
                    : "0px 1px 2px 0px #1018280D",
            background: disabled ? "#F9FAFB" : "#FFFFFF",
            padding: "10px 14px",
            paddingRight: isPassword ? "42px" : "14px",
            boxSizing: "border-box" as const,
            fontSize: "16px",
            color: disabled ? "#667085" : "#101828",
            fontFamily:
                '"Inter", "SF Pro Display", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
            lineHeight: "24px",
            outline: "none",
            transition: "border-color 0.2s ease, box-shadow 0.2s ease",
            cursor: disabled ? "not-allowed" : "text",
            appearance: "none" as const,
            WebkitAppearance: "none",
        } as CSSProperties,
        placeholder: {
            color: "#667085",
        },
        toggleButton: {
            position: "absolute" as const,
            right: "14px",
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: "0",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#98A2B3",
            transition: "color 0.15s ease",
        },
        errorText: {
            fontSize: "14px",
            color: "#F04438",
            fontFamily:
                '"Inter", "SF Pro Display", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
            lineHeight: "20px",
        },
    };

    const handleFocus: FocusEventHandler<HTMLInputElement> = (e) => {
        setFocused(true);
        if (onFocus) onFocus(e);
    };

    const handleBlur: FocusEventHandler<HTMLInputElement> = (e) => {
        setFocused(false);
        if (onBlur) onBlur(e);
    };

    const EyeIcon = ({ open }: { open: boolean }) =>
        open ? (
            // Eye open
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
                <path
                    d="M2.017 10C3.733 6.27 6.633 4 10 4s6.267 2.27 7.983 6C16.267 13.73 13.367 16 10 16s-6.267-2.27-7.983-6z"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />
                <circle cx="10" cy="10" r="2.5" stroke="currentColor" strokeWidth="1.5" />
            </svg>
        ) : (
            // Eye closed
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
                <path
                    d="M3 3l14 14M8.7 8.7A2.5 2.5 0 0012.3 12M4.9 4.9A9.9 9.9 0 002 10c1.716 3.73 4.616 6 7.983 6a9.5 9.5 0 004.117-.92m2-1.08C17.117 12.73 18 11.43 18 10c-1.717-3.73-4.617-6-7.983-6a9.6 9.6 0 00-2.04.22"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />
            </svg>
        );

    return (
        <div style={styles.wrapper}>
            {label && (
                <label htmlFor={inputId} style={styles.label}>
                    {label}
                    {required && (
                        <span style={{ color: "#F04438", marginLeft: "2px" }}>*</span>
                    )}
                </label>
            )}

            <div style={styles.inputWrapper}>
                <input
                    id={inputId}
                    name={name}
                    type={inputType}
                    placeholder={placeholder}
                    value={value}
                    onChange={onChange}
                    onFocus={handleFocus}
                    onBlur={handleBlur}
                    disabled={disabled}
                    required={required}
                    autoComplete={autoComplete}
                    style={styles.input}
                />

                {isPassword && (
                    <button
                        type="button"
                        style={styles.toggleButton}
                        onClick={() => setShowPassword((v) => !v)}
                        tabIndex={-1}
                        aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                        <EyeIcon open={showPassword} />
                    </button>
                )}
            </div>

            {error && <span style={styles.errorText}>{error}</span>}
        </div>
    );
};

export default FFInputField;


// usecase example 

// import FFInputField from "@/components/ui/FFInputField";

// <FFInputField
//   label="Email"
//   type="email"
//   placeholder="Enter email"
//   value={email}
//   onChange={handleChange}
// />
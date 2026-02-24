import { useState } from "react";
import type { CSSProperties, MouseEventHandler, ReactNode } from "react";

interface FFButtonProps {
    children?: ReactNode;
    onClick?: MouseEventHandler<HTMLButtonElement>;
    type?: "button" | "submit" | "reset";
    variant?: "primary" | "secondary" | "ghost" | "danger";
    size?: "sm" | "md" | "lg";
    fullWidth?: boolean;
    disabled?: boolean;
    loading?: boolean;
    iconLeft?: ReactNode;
    iconRight?: ReactNode;
    style?: CSSProperties;
}

// ─── Reusable Button Component ─────────────────────────────────────────────────
export const FFButton = ({
    children,
    onClick,
    type = "button",
    variant = "primary",      // "primary" | "secondary" | "ghost" | "danger"
    size = "md",              // "sm" | "md" | "lg"
    fullWidth = false,
    disabled = false,
    loading = false,
    iconLeft = null,
    iconRight = null,
    style = {},
}: FFButtonProps) => {
    const [pressed, setPressed] = useState(false);
    const [hovered, setHovered] = useState(false);

    // ── Size tokens ──────────────────────────────────────────────────────────────
    const sizes = {
        sm: { height: "36px", padding: "8px 16px", fontSize: "14px" },
        md: { height: "44px", padding: "10px 28px", fontSize: "15px" },  // spacing-xl = 28px
        lg: { height: "44px", padding: "10px 36px", fontSize: "16px" },
    };

    // ── Variant tokens ───────────────────────────────────────────────────────────
    const variants = {
        primary: {
            background: "#E57B2C",
            border: "1px solid #E57B2C",
            color: "#FFFFFF",
            hoverBackground: "#C96A21",
            hoverBorder: "1px solid #C96A21",
            hoverShadow: "0px 4px 12px rgba(229, 123, 44, 0.32)",
            activeShadow: "0px 1px 2px 0px #1018280D",
        },
        secondary: {
            background: "#FFFFFF",
            border: "1px solid #D0D5DD",
            color: "#344054",
            hoverBackground: "#F9FAFB",
            hoverBorder: "1px solid #D0D5DD",
            hoverShadow: "0px 4px 8px rgba(45, 36, 31, 0.10)",
            activeShadow: "0px 1px 2px 0px #1018280D",
        },
        ghost: {
            background: "transparent",
            border: "1px solid transparent",
            color: "#E57B2C",
            hoverBackground: "rgba(229, 123, 44, 0.06)",
            hoverBorder: "1px solid transparent",
            hoverShadow: "none",
            activeShadow: "none",
        },
        danger: {
            background: "#D92D20",
            border: "1px solid #D92D20",
            color: "#FFFFFF",
            hoverBackground: "#B42318",
            hoverBorder: "1px solid #B42318",
            hoverShadow: "0px 4px 12px rgba(217, 45, 32, 0.28)",
            activeShadow: "0px 1px 2px 0px #1018280D",
        },
    };

    const v = variants[variant] || variants.primary;
    const s = sizes[size] || sizes.md;

    const baseStyle: CSSProperties = {
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "6px",
        width: fullWidth ? "100%" : "auto",
        minWidth: fullWidth ? "auto" : "auto",
        height: s.height,
        borderRadius: "8px",
        border: hovered ? v.hoverBorder : v.border,
        background: disabled
            ? variant === "primary" ? "#F4A96D" : "#F2F4F7"
            : hovered
                ? v.hoverBackground
                : v.background,
        boxShadow: pressed
            ? v.activeShadow
            : hovered
                ? v.hoverShadow
                : "0px 1px 2px 0px #1018280D",
        color: disabled ? (variant === "primary" ? "#FFFFFF" : "#98A2B3") : v.color,
        padding: s.padding,
        fontSize: s.fontSize,
        fontWeight: 600,
        fontFamily:
            '"Inter", "SF Pro Display", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        lineHeight: "24px",
        letterSpacing: "0.01em",
        cursor: disabled || loading ? "not-allowed" : "pointer",
        opacity: disabled ? 0.72 : 1,
        transition: "background 0.18s ease, box-shadow 0.18s ease, border 0.18s ease, transform 0.12s ease",
        transform: pressed && !disabled ? "translateY(1px)" : "translateY(0)",
        outline: "none",
        userSelect: "none",
        boxSizing: "border-box",
        whiteSpace: "nowrap",
        ...style,
    };

    // ── Spinner ──────────────────────────────────────────────────────────────────
    const Spinner = () => (
        <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            style={{
                animation: "ff-spin 0.75s linear infinite",
            }}
        >
            <circle
                cx="8" cy="8" r="6"
                stroke="currentColor"
                strokeWidth="2"
                strokeOpacity="0.3"
            />
            <path
                d="M14 8a6 6 0 00-6-6"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
            />
            <style>{`
        @keyframes ff-spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
      `}</style>
        </svg>
    );

    return (
        <button
            type={type}
            style={baseStyle}
            onClick={!disabled && !loading ? onClick : undefined}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => { setHovered(false); setPressed(false); }}
            onMouseDown={() => setPressed(true)}
            onMouseUp={() => setPressed(false)}
            disabled={disabled}
            aria-disabled={disabled}
            aria-busy={loading}
        >
            {loading ? (
                <>
                    <Spinner />
                    <span style={{ opacity: 0.85 }}>Loading…</span>
                </>
            ) : (
                <>
                    {iconLeft && <span style={{ display: "flex", alignItems: "center" }}>{iconLeft}</span>}
                    {children}
                    {iconRight && <span style={{ display: "flex", alignItems: "center" }}>{iconRight}</span>}
                </>
            )}
        </button>
    );
};

export default FFButton;


// usecase example 

// import FFButton from "@/components/ui/FFButton";

// <FFButton 
//   variant="primary" 
//   onClick={handleClick}
//   loading={isLoading}
// >
//   Sign In
// </FFButton>
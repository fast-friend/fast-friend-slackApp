import { createTheme } from "@mui/material/styles";

// Fast Friends Color Palette
const colors = {
  darkBrown: "#2D241F", // Raccoon body & outline
  white: "#FFF", // Facial markings & muzzle
  lightBeige: "#D9C7AC", // Inner ears, highlights
  gray: "#5B514A", // Subtle shading
  orange: "#E57B2C", // Clipboard (primary accent)
};

const baseTheme = createTheme({
  palette: {
    mode: "light",
    primary: {
      main: colors.orange,
      light: "#F39857",
      dark: "#C66A23",
      contrastText: colors.white,
    },
    secondary: {
      main: colors.darkBrown,
      light: colors.gray,
      dark: "#1A1410",
      contrastText: colors.white,
    },
    background: {
      default: colors.white,
      paper: "#FFFFFF",
    },
    text: {
      primary: colors.darkBrown,
      secondary: colors.gray,
    },
    divider: colors.lightBeige,
    grey: {
      50: "#FAF9F7",
      100: colors.white,
      200: "#EAE6DD",
      300: colors.lightBeige,
      400: "#C4B39A",
      500: colors.gray,
      600: "#4A4139",
      700: "#3A332C",
      800: colors.darkBrown,
      900: "#1A1410",
    },
  },
  typography: {
    fontFamily:
      '"Inter", "SF Pro Display", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    fontSize: 14,
    fontWeightLight: 300,
    fontWeightRegular: 400,
    fontWeightMedium: 500,
    fontWeightBold: 700,
    h1: {
      fontSize: "2.5rem",
      fontWeight: 700,
      lineHeight: 1.2,
      letterSpacing: "-0.02em",
    },
    h2: {
      fontSize: "2rem",
      fontWeight: 700,
      lineHeight: 1.3,
      letterSpacing: "-0.01em",
    },
    h3: {
      fontSize: "1.75rem",
      fontWeight: 600,
      lineHeight: 1.3,
    },
    h4: {
      fontSize: "1.5rem",
      fontWeight: 600,
      lineHeight: 1.4,
    },
    h5: {
      fontSize: "1.25rem",
      fontWeight: 600,
      lineHeight: 1.4,
    },
    h6: {
      fontSize: "1rem",
      fontWeight: 600,
      lineHeight: 1.5,
    },
    body1: {
      fontSize: "1rem",
      lineHeight: 1.6,
    },
    body2: {
      fontSize: "0.875rem",
      lineHeight: 1.6,
    },
    button: {
      fontSize: "0.875rem",
      fontWeight: 500,
      letterSpacing: "0.02em",
    },
  },
  shape: {
    borderRadius: 12,
  },
  spacing: 8,
  shadows: [
    "none",
    "0px 2px 4px rgba(45, 36, 31, 0.08)",
    "0px 4px 8px rgba(45, 36, 31, 0.12)",
    "0px 8px 16px rgba(45, 36, 31, 0.12)",
    "0px 12px 24px rgba(45, 36, 31, 0.15)",
    "0px 16px 32px rgba(45, 36, 31, 0.15)",
    "0px 20px 40px rgba(45, 36, 31, 0.18)",
    "0px 24px 48px rgba(45, 36, 31, 0.18)",
    "0px 2px 4px rgba(45, 36, 31, 0.08)",
    "0px 4px 8px rgba(45, 36, 31, 0.12)",
    "0px 8px 16px rgba(45, 36, 31, 0.12)",
    "0px 12px 24px rgba(45, 36, 31, 0.15)",
    "0px 16px 32px rgba(45, 36, 31, 0.15)",
    "0px 20px 40px rgba(45, 36, 31, 0.18)",
    "0px 24px 48px rgba(45, 36, 31, 0.18)",
    "0px 2px 4px rgba(45, 36, 31, 0.08)",
    "0px 4px 8px rgba(45, 36, 31, 0.12)",
    "0px 8px 16px rgba(45, 36, 31, 0.12)",
    "0px 12px 24px rgba(45, 36, 31, 0.15)",
    "0px 16px 32px rgba(45, 36, 31, 0.15)",
    "0px 20px 40px rgba(45, 36, 31, 0.18)",
    "0px 24px 48px rgba(45, 36, 31, 0.18)",
    "0px 2px 4px rgba(45, 36, 31, 0.08)",
    "0px 4px 8px rgba(45, 36, 31, 0.12)",
    "0px 8px 16px rgba(45, 36, 31, 0.12)",
  ],
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          textTransform: "none",
          fontWeight: 500,
          padding: "10px 24px",
          boxShadow: "none",
          transition: "all 0.2s ease-in-out",
          "&:hover": {
            boxShadow: "0px 4px 12px rgba(229, 123, 44, 0.25)",
            transform: "translateY(-1px)",
          },
          "&:active": {
            transform: "translateY(0)",
          },
        },
        contained: {
          "&:hover": {
            boxShadow: "0px 4px 12px rgba(229, 123, 44, 0.3)",
          },
        },
        outlined: {
          borderWidth: 1.5,
          "&:hover": {
            borderWidth: 1.5,
          },
        },
        sizeLarge: {
          padding: "12px 32px",
          fontSize: "1rem",
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          boxShadow: "0px 2px 8px rgba(45, 36, 31, 0.08)",
          border: "1px solid",
          borderColor: colors.lightBeige,
          transition: "all 0.3s ease",
          "&:hover": {
            boxShadow: "0px 8px 24px rgba(45, 36, 31, 0.12)",
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          backgroundImage: "none",
        },
        elevation1: {
          boxShadow: "0px 2px 4px rgba(45, 36, 31, 0.08)",
        },
        elevation2: {
          boxShadow: "0px 4px 8px rgba(45, 36, 31, 0.12)",
        },
      },
    },
    MuiTextField: {
      defaultProps: {
        variant: "outlined",
      },
      styleOverrides: {
        root: {
          "& .MuiOutlinedInput-root": {
            borderRadius: 10,
            "&:hover .MuiOutlinedInput-notchedOutline": {
              borderColor: colors.orange,
            },
            "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
              borderWidth: 2,
            },
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          fontWeight: 500,
        },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: {
          borderRadius: 10,
        },
      },
    },
    MuiAvatar: {
      styleOverrides: {
        root: {
          borderRadius: 10,
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          borderRight: "1px solid",
          borderColor: colors.lightBeige,
          backgroundColor: colors.white,
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          boxShadow: "none",
          borderBottom: "1px solid",
          borderColor: colors.lightBeige,
        },
      },
    },
  },
});

export const theme = baseTheme;

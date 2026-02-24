import React from "react";
import {
    Box,
    Typography,
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Avatar,
    Chip,
    LinearProgress,
    Alert,
    IconButton,
} from "@mui/material";
import {
    CloudUpload as CloudUploadIcon,
    Close as CloseIcon,
    CheckCircle as CheckCircleIcon,
    Cancel as CancelIcon,
} from "@mui/icons-material";
import type { PhotoUploadState } from "../types/onboardingForm.types";

interface PhotoUploadModalProps {
    open: boolean;
    onClose: () => void;
    token: string;
    onPhotoUploaded: (url: string) => void;
    currentPhotoUrl: string | null;
}

const MAX_SIZE_BYTES = 1 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

// ─── SVG Face Illustrations ───────────────────────────────────────────────────

/** Clear face, smiling, plain background — GOOD */
const GoodFace1 = () => (
    <svg viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
        <rect width="80" height="80" fill="#EEF4FF" />
        {/* torso */}
        <ellipse cx="40" cy="74" rx="20" ry="12" fill="#4F7EFF" />
        {/* collar */}
        <path d="M33 64 Q40 70 47 64" stroke="white" strokeWidth="1.5" fill="none" />
        {/* head */}
        <circle cx="40" cy="34" r="18" fill="#FDDAB5" />
        {/* hair */}
        <path d="M22 30 Q24 14 40 14 Q56 14 58 30" fill="#4A3728" />
        {/* eyes */}
        <circle cx="33" cy="31" r="2.5" fill="#333" />
        <circle cx="47" cy="31" r="2.5" fill="#333" />
        <circle cx="34.2" cy="30" r="0.8" fill="white" />
        <circle cx="48.2" cy="30" r="0.8" fill="white" />
        {/* smile */}
        <path d="M33 39 Q40 46 47 39" stroke="#C97B4B" strokeWidth="1.8" fill="none" strokeLinecap="round" />
    </svg>
);

/** Looking at camera, good lighting, simple bg — GOOD */
const GoodFace2 = () => (
    <svg viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
        <rect width="80" height="80" fill="#F0FAF0" />
        <ellipse cx="40" cy="74" rx="20" ry="12" fill="#3C9E5F" />
        <circle cx="40" cy="34" r="18" fill="#F5C6A0" />
        {/* curly hair */}
        <path d="M22 28 Q23 12 40 12 Q57 12 58 28 Q54 16 40 18 Q26 16 22 28Z" fill="#1A0A00" />
        <circle cx="33" cy="32" r="2.5" fill="#4A2C0A" />
        <circle cx="47" cy="32" r="2.5" fill="#4A2C0A" />
        <circle cx="34.2" cy="31" r="0.8" fill="white" />
        <circle cx="48.2" cy="31" r="0.8" fill="white" />
        <path d="M34 39 Q40 45 46 39" stroke="#B07040" strokeWidth="1.8" fill="none" strokeLinecap="round" />
    </svg>
);

/** Professional, clean background — GOOD */
const GoodFace3 = () => (
    <svg viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
        <rect width="80" height="80" fill="#F5F0FF" />
        <ellipse cx="40" cy="74" rx="20" ry="12" fill="#7C5CBF" />
        {/* tie */}
        <path d="M38 64 L40 72 L42 64 Q40 61 38 64Z" fill="#A07EE8" />
        <circle cx="40" cy="34" r="18" fill="#FFD6C0" />
        <path d="M22 26 Q26 10 40 10 Q54 10 58 26" fill="#C0895A" />
        <circle cx="33" cy="32" r="2.5" fill="#333" />
        <circle cx="47" cy="32" r="2.5" fill="#333" />
        <circle cx="34.2" cy="31" r="0.8" fill="white" />
        <circle cx="48.2" cy="31" r="0.8" fill="white" />
        <path d="M34 39 Q40 45 46 39" stroke="#C0895A" strokeWidth="1.8" fill="none" strokeLinecap="round" />
    </svg>
);

/** Group of people (BAD) */
const BadGroup = () => (
    <svg viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
        <rect width="80" height="80" fill="#FFF3F0" />
        {/* left person */}
        <circle cx="22" cy="32" r="11" fill="#FDDAB5" />
        <path d="M11 26 Q13 16 22 16 Q31 16 33 26" fill="#6B4C35" />
        <ellipse cx="22" cy="68" rx="13" ry="8" fill="#888" />
        {/* middle person (bigger) */}
        <circle cx="40" cy="28" r="13" fill="#F5C6A0" />
        <path d="M27 22 Q29 10 40 10 Q51 10 53 22" fill="#1A0A00" />
        <ellipse cx="40" cy="68" rx="16" ry="9" fill="#555" />
        {/* right person */}
        <circle cx="58" cy="32" r="11" fill="#FFD6C0" />
        <path d="M47 26 Q49 16 58 16 Q67 16 69 26" fill="#C0895A" />
        <ellipse cx="58" cy="68" rx="13" ry="8" fill="#999" />
        {/* faces dots */}
        <circle cx="36" cy="27" r="1.5" fill="#333" />
        <circle cx="44" cy="27" r="1.5" fill="#333" />
    </svg>
);

/** Blurry face (BAD) */
const BadBlurry = () => (
    <svg viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
        <rect width="80" height="80" fill="#FFF8F0" />
        <filter id="blur1"><feGaussianBlur stdDeviation="3" /></filter>
        <g filter="url(#blur1)">
            <circle cx="40" cy="34" r="18" fill="#FDDAB5" />
            <path d="M22 26 Q26 14 40 14 Q54 14 58 26" fill="#8B6914" />
            <ellipse cx="40" cy="72" rx="20" ry="11" fill="#778" />
            <circle cx="33" cy="32" r="3" fill="#333" />
            <circle cx="47" cy="32" r="3" fill="#333" />
            <path d="M33 40 Q40 47 47 40" stroke="#C97B4B" strokeWidth="2" fill="none" />
        </g>
        {/* blur lines overlay */}
        <rect x="0" y="0" width="80" height="80" fill="rgba(255,255,255,0.25)" />
    </svg>
);

/** Sunglasses / hidden face (BAD) */
const BadSunglasses = () => (
    <svg viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
        <rect width="80" height="80" fill="#FFFBF0" />
        <circle cx="40" cy="34" r="18" fill="#FDDAB5" />
        <path d="M22 26 Q26 14 40 14 Q54 14 58 26" fill="#4A3728" />
        <ellipse cx="40" cy="72" rx="20" ry="11" fill="#2c5f9e" />
        {/* big sunglasses */}
        <rect x="23" y="27" width="14" height="10" rx="5" fill="#1A1A1A" />
        <rect x="43" y="27" width="14" height="10" rx="5" fill="#1A1A1A" />
        <line x1="37" y1="32" x2="43" y2="32" stroke="#1A1A1A" strokeWidth="2" />
        <line x1="10" y1="30" x2="23" y2="30" stroke="#1A1A1A" strokeWidth="2" />
        <line x1="57" y1="30" x2="70" y2="30" stroke="#1A1A1A" strokeWidth="2" />
        {/* small glare */}
        <path d="M26 29 L28 31" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M46 29 L48 31" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M33 40 Q40 45 47 40" stroke="#C97B4B" strokeWidth="1.5" fill="none" />
    </svg>
);

/** Far away / tiny person (BAD) */
const BadFarAway = () => (
    <svg viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
        <rect width="80" height="80" fill="#F0F8FF" />
        {/* big background scenery */}
        <rect x="0" y="50" width="80" height="30" fill="#90B870" />
        <rect x="0" y="30" width="80" height="22" fill="#87CEEB" />
        {/* tiny person in distance */}
        <circle cx="40" cy="44" r="4" fill="#FDDAB5" />
        <rect x="37" y="48" width="6" height="8" rx="1" fill="#4F7EFF" />
        {/* zoom-in indicator */}
        <circle cx="40" cy="45" r="12" stroke="#FF6B6B" strokeWidth="1.5" strokeDasharray="3 2" fill="none" />
        <line x1="49" y1="54" x2="58" y2="63" stroke="#FF6B6B" strokeWidth="2" />
        <circle cx="61" cy="66" r="4" stroke="#FF6B6B" strokeWidth="2" fill="none" />
    </svg>
);

// ─── Photo Example Card ───────────────────────────────────────────────────────

const PhotoCard = ({
    children,
    label,
    type,
}: {
    children: React.ReactNode;
    label: string;
    type: "good" | "bad";
}) => (
    <Box
        sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 0.5,
            flex: "1 1 0",
            minWidth: 0,
        }}
    >
        <Box
            sx={{
                width: "100%",
                aspectRatio: "1",
                borderRadius: "10px",
                overflow: "hidden",
                border: `2px solid ${type === "good" ? "#A9EFC5" : "#FECDCA"}`,
                position: "relative",
                bgcolor: type === "good" ? "#ECFDF3" : "#FEF3F2",
            }}
        >
            {children}
            {/* badge */}
            <Box
                sx={{
                    position: "absolute",
                    top: 4,
                    right: 4,
                    width: 16,
                    height: 16,
                    borderRadius: "50%",
                    bgcolor: type === "good" ? "#12B76A" : "#F04438",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                }}
            >
                {type === "good" ? (
                    <CheckCircleIcon sx={{ fontSize: 12, color: "white" }} />
                ) : (
                    <CancelIcon sx={{ fontSize: 12, color: "white" }} />
                )}
            </Box>
        </Box>
        <Typography
            variant="caption"
            textAlign="center"
            sx={{
                fontSize: "10px",
                lineHeight: 1.3,
                color: type === "good" ? "#027A48" : "#B42318",
                fontWeight: 500,
            }}
        >
            {label}
        </Typography>
    </Box>
);

// ─── Main Component ───────────────────────────────────────────────────────────

export const PhotoUploadModal: React.FC<PhotoUploadModalProps> = ({
    open,
    onClose,
    token,
    onPhotoUploaded,
    currentPhotoUrl,
}) => {
    const [uploadState, setUploadState] = React.useState<PhotoUploadState>("idle");
    const [previewUrl, setPreviewUrl] = React.useState<string | null>(currentPhotoUrl);
    const [uploadedUrl, setUploadedUrl] = React.useState<string | null>(null);
    const [error, setError] = React.useState<string | null>(null);
    const [dragOver, setDragOver] = React.useState(false);
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    const handleFileSelect = (file: File) => {
        setError(null);

        if (!ALLOWED_TYPES.includes(file.type)) {
            setError("Please upload a JPEG, PNG, or WebP image.");
            return;
        }

        if (file.size > MAX_SIZE_BYTES) {
            setError("Photo must be 1 MB or smaller. Please choose a smaller image.");
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => setPreviewUrl(e.target?.result as string);
        reader.readAsDataURL(file);

        handleUpload(file);
    };

    const handleUpload = async (file: File) => {
        setUploadState("uploading");
        setError(null);

        try {
            const formData = new FormData();
            formData.append("photo", file);

            const res = await fetch(
                `${import.meta.env.VITE_API_URL || "http://localhost:8000/api/v1"}/onboard/${token}/photo`,
                { method: "POST", body: formData }
            );

            const json = await res.json();

            if (!res.ok || !json.success) {
                throw new Error(json.message || "Upload failed.");
            }

            setUploadedUrl(json.data.photoUrl);
            setUploadState("done");
        } catch (err: any) {
            setError(err.message || "Failed to upload. Please try again.");
            setUploadState("error");
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setDragOver(false);
        const file = e.dataTransfer.files[0];
        if (file) handleFileSelect(file);
    };

    const handleConfirm = () => {
        if (uploadedUrl) {
            onPhotoUploaded(uploadedUrl);
            onClose();
        }
    };

    const handleClose = () => {
        setUploadState("idle");
        setError(null);
        setUploadedUrl(null);
        setPreviewUrl(currentPhotoUrl);
        onClose();
    };

    return (
        <Dialog
            open={open}
            onClose={handleClose}
            maxWidth="sm"
            fullWidth
            PaperProps={{ sx: { borderRadius: "16px", p: 1 } }}
        >
            <DialogTitle sx={{ pb: 1, pr: 6 }}>
                <Typography variant="h6" fontWeight={700} color="#101828">
                    Upload Profile Photo
                </Typography>
                <Typography variant="body2" color="#667085" mt={0.5}>
                    Choose a clear photo so your teammates can recognise you.
                </Typography>
                <IconButton
                    onClick={handleClose}
                    sx={{ position: "absolute", right: 16, top: 16, color: "#667085" }}
                >
                    <CloseIcon />
                </IconButton>
            </DialogTitle>

            <DialogContent sx={{ pt: 0 }}>
                {/* ─── Visual Guidelines ─── */}
                <Box
                    sx={{
                        bgcolor: "#FAFAFA",
                        border: "1px solid #EAECF0",
                        borderRadius: "12px",
                        p: 2,
                        mb: 3,
                    }}
                >
                    {/* Good examples */}
                    <Box mb={2}>
                        <Box display="flex" alignItems="center" gap={0.75} mb={1.5}>
                            <CheckCircleIcon sx={{ color: "#12B76A", fontSize: 15 }} />
                            <Typography variant="caption" fontWeight={700} color="#027A48" sx={{ textTransform: "uppercase", letterSpacing: "0.5px" }}>
                                Good examples
                            </Typography>
                        </Box>
                        <Box display="flex" gap={1.5}>
                            <PhotoCard label="Clear face" type="good">
                                <GoodFace1 />
                            </PhotoCard>
                            <PhotoCard label="Good lighting" type="good">
                                <GoodFace2 />
                            </PhotoCard>
                            <PhotoCard label="Professional" type="good">
                                <GoodFace3 />
                            </PhotoCard>
                        </Box>
                    </Box>

                    {/* Divider */}
                    <Box sx={{ borderTop: "1px solid #EAECF0", mb: 2 }} />

                    {/* Bad examples */}
                    <Box>
                        <Box display="flex" alignItems="center" gap={0.75} mb={1.5}>
                            <CancelIcon sx={{ color: "#F04438", fontSize: 15 }} />
                            <Typography variant="caption" fontWeight={700} color="#B42318" sx={{ textTransform: "uppercase", letterSpacing: "0.5px" }}>
                                Avoid these
                            </Typography>
                        </Box>
                        <Box display="flex" gap={1.5}>
                            <PhotoCard label="Group photo" type="bad">
                                <BadGroup />
                            </PhotoCard>
                            <PhotoCard label="Blurry" type="bad">
                                <BadBlurry />
                            </PhotoCard>
                            <PhotoCard label="Sunglasses" type="bad">
                                <BadSunglasses />
                            </PhotoCard>
                            <PhotoCard label="Too far away" type="bad">
                                <BadFarAway />
                            </PhotoCard>
                        </Box>
                    </Box>
                </Box>

                {/* ─── Upload Area ─── */}
                <Box
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={handleDrop}
                    sx={{
                        border: `2px dashed ${dragOver ? "#E57B2C" : "#D0D5DD"}`,
                        borderRadius: "12px",
                        p: 3,
                        textAlign: "center",
                        cursor: "pointer",
                        transition: "all 0.2s",
                        bgcolor: dragOver ? "#FFF6EE" : "#FAFAFA",
                        "&:hover": { borderColor: "#E57B2C", bgcolor: "#FFF6EE" },
                    }}
                >
                    {previewUrl ? (
                        <Box display="flex" flexDirection="column" alignItems="center" gap={1.5}>
                            <Avatar
                                src={previewUrl}
                                sx={{ width: 80, height: 80, border: "3px solid #E57B2C" }}
                            />
                            {uploadState === "uploading" && (
                                <Box width="100%">
                                    <LinearProgress
                                        sx={{ borderRadius: 4, "& .MuiLinearProgress-bar": { bgcolor: "#E57B2C" } }}
                                    />
                                    <Typography variant="caption" color="#667085" mt={0.5} display="block">
                                        Uploading…
                                    </Typography>
                                </Box>
                            )}
                            {uploadState === "done" && (
                                <Chip
                                    icon={<CheckCircleIcon />}
                                    label="Upload successful!"
                                    size="small"
                                    sx={{ bgcolor: "#ECFDF3", color: "#027A48" }}
                                />
                            )}
                            {(uploadState === "idle" || uploadState === "error") && (
                                <Typography variant="caption" color="#667085">
                                    Click to change photo
                                </Typography>
                            )}
                        </Box>
                    ) : (
                        <Box display="flex" flexDirection="column" alignItems="center" gap={1}>
                            <Box
                                sx={{
                                    width: 48,
                                    height: 48,
                                    borderRadius: "50%",
                                    bgcolor: "#FFF6EE",
                                    border: "1px solid #FDDCAB",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                }}
                            >
                                <CloudUploadIcon sx={{ color: "#E57B2C", fontSize: 24 }} />
                            </Box>
                            <Typography variant="body2" fontWeight={600} color="#344054">
                                Click to upload or drag & drop
                            </Typography>
                            <Typography variant="caption" color="#667085">
                                JPEG, PNG, WebP • Max 1 MB
                            </Typography>
                        </Box>
                    )}
                </Box>

                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    hidden
                    onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleFileSelect(file);
                        e.target.value = "";
                    }}
                />

                {error && (
                    <Alert severity="error" sx={{ mt: 2, borderRadius: "8px" }}>
                        {error}
                    </Alert>
                )}
            </DialogContent>

            <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
                <Button
                    onClick={handleClose}
                    variant="outlined"
                    sx={{ borderRadius: "8px", borderColor: "#D0D5DD", color: "#344054" }}
                >
                    Cancel
                </Button>
                <Button
                    onClick={handleConfirm}
                    variant="contained"
                    disabled={uploadState !== "done" || !uploadedUrl}
                    sx={{
                        borderRadius: "8px",
                        bgcolor: "#E57B2C",
                        "&:hover": { bgcolor: "#C96A21" },
                    }}
                >
                    Use This Photo
                </Button>
            </DialogActions>
        </Dialog>
    );
};

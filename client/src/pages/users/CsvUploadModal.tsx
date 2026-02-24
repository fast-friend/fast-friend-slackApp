import { useState, useRef, useCallback } from "react";
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Box,
    Typography,
    Button,
    Alert,
    CircularProgress,
    Chip,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableRow,
    Paper,
    Divider,
    IconButton,
    Link,
} from "@mui/material";
import {
    UploadFile as UploadFileIcon,
    CheckCircle as CheckCircleIcon,
    Error as ErrorIcon,
    Close as CloseIcon,
    Download as DownloadIcon,
    InsertDriveFile as FileIcon,
} from "@mui/icons-material";
import {
    useUploadUsersFromCsvMutation,
    type CsvUserRow,
    type CsvRowError,
} from "@/features/slack/api/slackApi";

// ─── Types ────────────────────────────────────────────────────────────────────

type Step = "upload" | "validation" | "result";

interface ParsedCsvResult {
    rows: CsvUserRow[];
    errors: CsvRowError[];
}

// ─── CSV helpers ──────────────────────────────────────────────────────────────

const REQUIRED_FIELDS: (keyof CsvUserRow)[] = [
    "userId",
    "userName",
    "realName",
    "jobTitle",
];

const OPTIONAL_FIELDS: (keyof CsvUserRow)[] = [
    "displayName",
    "email",
    "phone",
    "pronouns",
    "department",
];

const ALL_HEADERS = [...REQUIRED_FIELDS, ...OPTIONAL_FIELDS];

const SAMPLE_CSV_ROWS: CsvUserRow[] = [
    {
        userId: "U001ABC123",
        userName: "alice.johnson",
        realName: "Alice Johnson",
        jobTitle: "Product Manager",
        displayName: "Alice",
        email: "alice@company.com",
        phone: "+1-555-0101",
        pronouns: "she/her",
        department: "Product",
    },
    {
        userId: "U002DEF456",
        userName: "bob.smith",
        realName: "Bob Smith",
        jobTitle: "Software Engineer",
        displayName: "Bob",
        email: "bob@company.com",
        phone: "+1-555-0102",
        pronouns: "he/him",
        department: "Engineering",
    },
    {
        userId: "U003GHI789",
        userName: "carol.white",
        realName: "Carol White",
        jobTitle: "UX Designer",
        displayName: "Carol",
        email: "carol@company.com",
        phone: "",
        pronouns: "she/her",
        department: "Design",
    },
    {
        userId: "U004JKL012",
        userName: "david.brown",
        realName: "David Brown",
        jobTitle: "Sales Manager",
        displayName: "Dave",
        email: "david@company.com",
        phone: "+1-555-0104",
        pronouns: "he/him",
        department: "Sales",
    },
    {
        userId: "U005MNO345",
        userName: "emma.davis",
        realName: "Emma Davis",
        jobTitle: "Marketing Lead",
        displayName: "Emma",
        email: "emma@company.com",
        phone: "+1-555-0105",
        pronouns: "she/her",
        department: "Marketing",
    },
];

function generateSampleCsv(): string {
    const header = ALL_HEADERS.join(",");
    const rows = SAMPLE_CSV_ROWS.map((row) =>
        ALL_HEADERS.map((h) => `"${(row[h as keyof CsvUserRow] as string) || ""}"`).join(","),
    );
    return [header, ...rows].join("\n");
}

function downloadSampleCsv() {
    const content = generateSampleCsv();
    const blob = new Blob([content], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "sample_users.csv";
    a.click();
    URL.revokeObjectURL(url);
}

/** Parse a CSV string into rows and validate required fields */
function parseCsv(text: string): ParsedCsvResult {
    const lines = text.trim().split(/\r?\n/);
    if (lines.length < 2) return { rows: [], errors: [] };

    const rawHeaders = lines[0]
        .split(",")
        .map((h) => h.trim().replace(/^"|"$/g, ""));

    const rows: CsvUserRow[] = [];
    const errors: CsvRowError[] = [];

    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        // Split respecting quoted fields
        const values: string[] = [];
        let current = "";
        let inQuotes = false;
        for (const ch of line) {
            if (ch === '"') {
                inQuotes = !inQuotes;
            } else if (ch === "," && !inQuotes) {
                values.push(current.trim());
                current = "";
            } else {
                current += ch;
            }
        }
        values.push(current.trim());

        const row: Record<string, string> = {};
        rawHeaders.forEach((header, idx) => {
            row[header] = values[idx] || "";
        });

        const typed: CsvUserRow = {
            userId: row.userId || "",
            userName: row.userName || "",
            realName: row.realName || "",
            jobTitle: row.jobTitle || "",
            displayName: row.displayName || undefined,
            email: row.email || undefined,
            phone: row.phone || undefined,
            pronouns: row.pronouns || undefined,
            department: row.department || undefined,
        };

        const missing = REQUIRED_FIELDS.filter(
            (f) => !typed[f] || typed[f]!.trim() === "",
        );

        if (missing.length > 0) {
            errors.push({
                row: i,
                userId: typed.userId,
                name: typed.realName || typed.userName || `Row ${i}`,
                missingFields: missing,
            });
        } else {
            rows.push(typed);
        }
    }

    return { rows, errors };
}

// ─── Component ────────────────────────────────────────────────────────────────

interface CsvUploadModalProps {
    open: boolean;
    onClose: () => void;
    workspaceId: string;
}

export const CsvUploadModal = ({
    open,
    onClose,
    workspaceId,
}: CsvUploadModalProps) => {
    const [step, setStep] = useState<Step>("upload");
    const [fileName, setFileName] = useState<string | null>(null);
    const [parsed, setParsed] = useState<ParsedCsvResult | null>(null);
    const [parseError, setParseError] = useState<string | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [resultData, setResultData] = useState<{
        uploaded: number;
        skipped: CsvRowError[];
    } | null>(null);

    const fileRef = useRef<HTMLInputElement>(null);

    const [uploadCsv, { isLoading }] = useUploadUsersFromCsvMutation();

    const reset = () => {
        setStep("upload");
        setFileName(null);
        setParsed(null);
        setParseError(null);
        setIsDragging(false);
        setResultData(null);
    };

    const handleClose = () => {
        reset();
        onClose();
    };

    const processFile = (file: File) => {
        if (!file.name.endsWith(".csv")) {
            setParseError("Please upload a .csv file.");
            return;
        }
        setParseError(null);
        setFileName(file.name);
        const reader = new FileReader();
        reader.onload = (e) => {
            const text = e.target?.result as string;
            const result = parseCsv(text);
            if (result.rows.length === 0 && result.errors.length === 0) {
                setParseError("The CSV file appears to be empty or has no data rows.");
                return;
            }
            setParsed(result);
            setStep("validation");
        };
        reader.readAsText(file);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) processFile(file);
        // Reset input so same file can be re-uploaded
        e.target.value = "";
    };

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files?.[0];
        if (file) processFile(file);
    }, []);

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = () => setIsDragging(false);

    const handleUpload = async (skipInvalid: boolean) => {
        if (!parsed) return;
        const rowsToUpload = skipInvalid ? parsed.rows : [...parsed.rows];

        try {
            const res = await uploadCsv({
                workspaceId,
                users: rowsToUpload,
                skipInvalid,
            }).unwrap();

            setResultData(res.data ?? { uploaded: rowsToUpload.length, skipped: [] });
            setStep("result");
        } catch (err: any) {
            // Server-side validation errors
            const serverErrors: CsvRowError[] = err?.data?.errors || [];
            if (serverErrors.length > 0) {
                setParsed((prev) =>
                    prev ? { ...prev, errors: [...prev.errors, ...serverErrors] } : prev,
                );
            }
            setParseError(
                err?.data?.message || "Upload failed. Please try again.",
            );
        }
    };

    // ── Render ─────────────────────────────────────────────────────────────────

    const validCount = parsed?.rows.length ?? 0;
    const invalidCount = parsed?.errors.length ?? 0;
    const totalCount = validCount + invalidCount;

    return (
        <Dialog
            open={open}
            onClose={handleClose}
            maxWidth="md"
            fullWidth
            PaperProps={{
                sx: { borderRadius: 3, overflow: "hidden" },
            }}
        >
            {/* ── Header ── */}
            <DialogTitle
                sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    bgcolor: "primary.main",
                    color: "white",
                    py: 2,
                    px: 3,
                }}
            >
                <Box display="flex" alignItems="center" gap={1.5}>
                    <UploadFileIcon />
                    <Typography variant="h6" fontWeight={700}>
                        {step === "upload" && "Upload Users via CSV"}
                        {step === "validation" && "Validation Results"}
                        {step === "result" && "Upload Complete"}
                    </Typography>
                </Box>
                <IconButton onClick={handleClose} sx={{ color: "white" }} size="small">
                    <CloseIcon />
                </IconButton>
            </DialogTitle>

            <DialogContent sx={{ p: 0 }}>
                {/* ══════════════════ STEP 1: Upload ══════════════════ */}
                {step === "upload" && (
                    <Box p={3}>
                        {/* Column reference */}
                        <Box mb={3}>
                            <Typography variant="subtitle2" fontWeight={700} mb={1}>
                                CSV Column Reference
                            </Typography>
                            <Box display="flex" gap={1} flexWrap="wrap">
                                {REQUIRED_FIELDS.map((f) => (
                                    <Chip
                                        key={f}
                                        label={`${f} *`}
                                        size="small"
                                        color="error"
                                        variant="outlined"
                                        sx={{ fontWeight: 600, fontSize: "0.72rem" }}
                                    />
                                ))}
                                {OPTIONAL_FIELDS.map((f) => (
                                    <Chip
                                        key={f}
                                        label={f}
                                        size="small"
                                        color="default"
                                        variant="outlined"
                                        sx={{ fontSize: "0.72rem" }}
                                    />
                                ))}
                            </Box>
                            <Typography variant="caption" color="text.secondary" mt={0.5} display="block">
                                * Required fields — all others are optional
                            </Typography>
                        </Box>

                        {/* Drop zone */}
                        <Box
                            onClick={() => fileRef.current?.click()}
                            onDrop={handleDrop}
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            sx={{
                                border: "2px dashed",
                                borderColor: isDragging ? "primary.main" : "divider",
                                borderRadius: 2,
                                p: 5,
                                display: "flex",
                                flexDirection: "column",
                                alignItems: "center",
                                justifyContent: "center",
                                gap: 1.5,
                                cursor: "pointer",
                                transition: "all 0.2s",
                                bgcolor: isDragging ? "primary.lighter" : "background.paper",
                                "&:hover": {
                                    borderColor: "primary.main",
                                    bgcolor: "action.hover",
                                },
                            }}
                        >
                            <input
                                ref={fileRef}
                                type="file"
                                accept=".csv"
                                hidden
                                onChange={handleFileChange}
                            />
                            <UploadFileIcon
                                sx={{
                                    fontSize: 52,
                                    color: isDragging ? "primary.main" : "text.disabled",
                                }}
                            />
                            <Typography variant="body1" fontWeight={600} color="text.secondary">
                                Drag & drop your CSV file here
                            </Typography>
                            <Typography variant="body2" color="text.disabled">
                                or click to browse
                            </Typography>
                            {fileName && (
                                <Chip
                                    icon={<FileIcon />}
                                    label={fileName}
                                    color="primary"
                                    variant="outlined"
                                    sx={{ mt: 1 }}
                                />
                            )}
                        </Box>

                        {parseError && (
                            <Alert severity="error" sx={{ mt: 2 }}>
                                {parseError}
                            </Alert>
                        )}

                        {/* Sample CSV */}
                        <Box mt={2.5} display="flex" alignItems="center" gap={0.5}>
                            <DownloadIcon fontSize="small" color="primary" />
                            <Link
                                component="button"
                                variant="body2"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    downloadSampleCsv();
                                }}
                                sx={{ fontWeight: 600 }}
                            >
                                Download Sample CSV (5 example users)
                            </Link>
                        </Box>
                    </Box>
                )}

                {/* ══════════════════ STEP 2: Validation ══════════════════ */}
                {step === "validation" && parsed && (
                    <Box p={3}>
                        {/* Summary chips */}
                        <Box display="flex" gap={2} mb={3} flexWrap="wrap">
                            <Paper
                                variant="outlined"
                                sx={{ px: 2.5, py: 1.5, borderRadius: 2, flex: 1, minWidth: 140 }}
                            >
                                <Typography variant="caption" color="text.secondary">
                                    Total Rows
                                </Typography>
                                <Typography variant="h5" fontWeight={700}>
                                    {totalCount}
                                </Typography>
                            </Paper>
                            <Paper
                                variant="outlined"
                                sx={{
                                    px: 2.5,
                                    py: 1.5,
                                    borderRadius: 2,
                                    flex: 1,
                                    minWidth: 140,
                                    borderColor: "success.main",
                                    bgcolor: "success.lighter",
                                }}
                            >
                                <Box display="flex" alignItems="center" gap={0.5}>
                                    <CheckCircleIcon fontSize="small" color="success" />
                                    <Typography variant="caption" color="success.main" fontWeight={600}>
                                        Valid
                                    </Typography>
                                </Box>
                                <Typography variant="h5" fontWeight={700} color="success.main">
                                    {validCount}
                                </Typography>
                            </Paper>
                            <Paper
                                variant="outlined"
                                sx={{
                                    px: 2.5,
                                    py: 1.5,
                                    borderRadius: 2,
                                    flex: 1,
                                    minWidth: 140,
                                    borderColor: invalidCount > 0 ? "error.main" : "divider",
                                    bgcolor: invalidCount > 0 ? "error.lighter" : "background.paper",
                                }}
                            >
                                <Box display="flex" alignItems="center" gap={0.5}>
                                    <ErrorIcon
                                        fontSize="small"
                                        color={invalidCount > 0 ? "error" : "disabled"}
                                    />
                                    <Typography
                                        variant="caption"
                                        color={invalidCount > 0 ? "error.main" : "text.disabled"}
                                        fontWeight={600}
                                    >
                                        Invalid
                                    </Typography>
                                </Box>
                                <Typography
                                    variant="h5"
                                    fontWeight={700}
                                    color={invalidCount > 0 ? "error.main" : "text.disabled"}
                                >
                                    {invalidCount}
                                </Typography>
                            </Paper>
                        </Box>

                        {/* All valid */}
                        {invalidCount === 0 && (
                            <Alert severity="success" sx={{ mb: 2 }}>
                                All {validCount} rows are valid and ready to upload!
                            </Alert>
                        )}

                        {/* Invalid rows table */}
                        {invalidCount > 0 && (
                            <>
                                <Typography variant="subtitle2" fontWeight={700} mb={1.5} color="error.main">
                                    ❌ Invalid Rows — Missing Required Fields
                                </Typography>
                                <Paper variant="outlined" sx={{ borderRadius: 2, overflow: "hidden", mb: 2 }}>
                                    <Table size="small">
                                        <TableHead>
                                            <TableRow sx={{ bgcolor: "error.lighter" }}>
                                                <TableCell sx={{ fontWeight: 700, fontSize: "0.75rem" }}>Row #</TableCell>
                                                <TableCell sx={{ fontWeight: 700, fontSize: "0.75rem" }}>User</TableCell>
                                                <TableCell sx={{ fontWeight: 700, fontSize: "0.75rem" }}>User ID</TableCell>
                                                <TableCell sx={{ fontWeight: 700, fontSize: "0.75rem" }}>Missing Fields</TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {parsed.errors.map((err, i) => (
                                                <TableRow key={i}>
                                                    <TableCell>
                                                        <Chip label={err.row} size="small" color="error" variant="outlined" />
                                                    </TableCell>
                                                    <TableCell>
                                                        <Typography variant="body2" fontWeight={600}>
                                                            {err.name}
                                                        </Typography>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Typography variant="body2" fontFamily="monospace" color="text.secondary">
                                                            {err.userId || "—"}
                                                        </Typography>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Box display="flex" gap={0.5} flexWrap="wrap">
                                                            {err.missingFields.map((f) => (
                                                                <Chip
                                                                    key={f}
                                                                    label={f}
                                                                    size="small"
                                                                    color="error"
                                                                    sx={{ fontFamily: "monospace", fontSize: "0.7rem" }}
                                                                />
                                                            ))}
                                                        </Box>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </Paper>

                                {validCount > 0 && (
                                    <Alert severity="info">
                                        {validCount} valid row{validCount !== 1 ? "s" : ""} can still be uploaded.
                                        Click <strong>"Upload Valid Only"</strong> to skip the {invalidCount} invalid
                                        row{invalidCount !== 1 ? "s" : ""} and proceed.
                                    </Alert>
                                )}

                                {validCount === 0 && (
                                    <Alert severity="error">
                                        All rows have validation errors. Please fix your CSV and try again.
                                    </Alert>
                                )}
                            </>
                        )}

                        {parseError && (
                            <Alert severity="error" sx={{ mt: 2 }}>
                                {parseError}
                            </Alert>
                        )}
                    </Box>
                )}

                {/* ══════════════════ STEP 3: Result ══════════════════ */}
                {step === "result" && resultData && (
                    <Box p={3}>
                        <Box
                            display="flex"
                            flexDirection="column"
                            alignItems="center"
                            py={2}
                            mb={3}
                        >
                            <CheckCircleIcon sx={{ fontSize: 64, color: "success.main", mb: 2 }} />
                            <Typography variant="h5" fontWeight={700} mb={0.5}>
                                Upload Successful!
                            </Typography>
                            <Typography variant="body1" color="text.secondary">
                                <strong>{resultData.uploaded}</strong> user
                                {resultData.uploaded !== 1 ? "s" : ""} uploaded successfully
                                {resultData.skipped.length > 0 &&
                                    `, ${resultData.skipped.length} skipped`}
                                .
                            </Typography>
                        </Box>

                        {resultData.skipped.length > 0 && (
                            <>
                                <Divider sx={{ mb: 2 }} />
                                <Typography variant="subtitle2" fontWeight={700} mb={1.5} color="text.secondary">
                                    Skipped Rows
                                </Typography>
                                <Paper variant="outlined" sx={{ borderRadius: 2, overflow: "hidden" }}>
                                    <Table size="small">
                                        <TableHead>
                                            <TableRow sx={{ bgcolor: "action.hover" }}>
                                                <TableCell sx={{ fontWeight: 700, fontSize: "0.75rem" }}>Row #</TableCell>
                                                <TableCell sx={{ fontWeight: 700, fontSize: "0.75rem" }}>User</TableCell>
                                                <TableCell sx={{ fontWeight: 700, fontSize: "0.75rem" }}>Reason</TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {resultData.skipped.map((s, i) => (
                                                <TableRow key={i}>
                                                    <TableCell>{s.row}</TableCell>
                                                    <TableCell>{s.name}</TableCell>
                                                    <TableCell>
                                                        <Typography variant="caption" color="error.main">
                                                            Missing: {s.missingFields.join(", ")}
                                                        </Typography>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </Paper>
                            </>
                        )}
                    </Box>
                )}
            </DialogContent>

            {/* ── Action buttons ── */}
            <Divider />
            <DialogActions sx={{ px: 3, py: 2, gap: 1 }}>
                {step === "upload" && (
                    <>
                        <Button onClick={handleClose} variant="outlined" color="inherit">
                            Cancel
                        </Button>
                        <Button
                            variant="contained"
                            startIcon={<UploadFileIcon />}
                            onClick={() => fileRef.current?.click()}
                        >
                            Choose File
                        </Button>
                    </>
                )}

                {step === "validation" && (
                    <>
                        <Button onClick={() => { setParsed(null); setStep("upload"); }} variant="outlined" color="inherit">
                            ← Back
                        </Button>
                        <Box flex={1} />
                        {invalidCount > 0 && validCount === 0 ? (
                            <Button onClick={handleClose} variant="contained" color="error">
                                Close & Fix CSV
                            </Button>
                        ) : (
                            <>
                                {invalidCount > 0 && validCount > 0 && (
                                    <Button
                                        onClick={() => handleUpload(true)}
                                        disabled={isLoading}
                                        variant="outlined"
                                        color="warning"
                                        startIcon={isLoading ? <CircularProgress size={16} /> : undefined}
                                    >
                                        Upload Valid Only ({validCount})
                                    </Button>
                                )}
                                {invalidCount === 0 && (
                                    <Button
                                        onClick={() => handleUpload(false)}
                                        disabled={isLoading}
                                        variant="contained"
                                        color="success"
                                        startIcon={isLoading ? <CircularProgress size={16} /> : <CheckCircleIcon />}
                                    >
                                        Upload All ({validCount})
                                    </Button>
                                )}
                            </>
                        )}
                    </>
                )}

                {step === "result" && (
                    <>
                        <Button onClick={() => { reset(); }} variant="outlined">
                            Upload Another
                        </Button>
                        <Button onClick={handleClose} variant="contained" color="primary">
                            Done
                        </Button>
                    </>
                )}
            </DialogActions>
        </Dialog>
    );
};

export default CsvUploadModal;

import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import {
    Box,
    Container,
    Paper,
    Typography,
    TextField,
    Button,
    Avatar,
    IconButton,
    Skeleton,
    Alert,
    CircularProgress,
    Divider,
} from "@mui/material";
import { CameraAlt as CameraAltIcon } from "@mui/icons-material";
import { DatePicker, LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import dayjs, { type Dayjs } from "dayjs";
import {
    useGetOnboardingDataQuery,
    useSubmitOnboardingFormMutation,
} from "../api/onboardingFormApi";
import { PhotoUploadModal } from "../components/PhotoUploadModal";
import { ConfirmationScreen } from "../components/ConfirmationScreen";
import { DEPARTMENTS, ROLES, HOBBIES } from "../constants/dropdownOptions";
import ChipSelector from "@/components/ui/ChipSelector";
import type { OnboardingFormValues } from "../types/onboardingForm.types";

export const OnboardingFormPage: React.FC = () => {
    const { token = "" } = useParams<{ token: string }>();

    const { data, isLoading, error } = useGetOnboardingDataQuery(token, { skip: !token });
    const [submitForm, { isLoading: isSubmitting }] = useSubmitOnboardingFormMutation();

    // Form state
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [photoUrl, setPhotoUrl] = useState<string | null>(null);
    const [departments, setDepartments] = useState<string[]>([]);
    const [roles, setRoles] = useState<string[]>([]);
    const [hobbies, setHobbies] = useState<string[]>([]);
    const [birthdate, setBirthdate] = useState<Dayjs | null>(null);

    // UI state
    const [photoModalOpen, setPhotoModalOpen] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);
    const [validation, setValidation] = useState<Record<string, string>>({});

    // Pre-fill from Slack data when it loads
    useEffect(() => {
        if (data) {
            if (data.name) setName(data.name);
            if (data.email) setEmail(data.email);
            if (data.photoUrl) setPhotoUrl(data.photoUrl);
            else if (data.avatarUrl) setPhotoUrl(data.avatarUrl);
            if (data.departments?.length) setDepartments(data.departments);
            if (data.roles?.length) setRoles(data.roles);
            if (data.hobbies?.length) setHobbies(data.hobbies);
            if (data.birthdate) setBirthdate(dayjs(data.birthdate));
        }
    }, [data]);

    // Derived: are name/email read-only?
    const nameReadOnly = !!data?.name;
    const emailReadOnly = !!data?.email;

    // Org-defined options; fall back to static constants if empty
    const departmentOptions: string[] =
        data?.availableDepartments?.length
            ? data.availableDepartments
            : ([...DEPARTMENTS] as string[]);

    const roleOptions: string[] =
        data?.availableRoles?.length
            ? data.availableRoles
            : ([...ROLES] as string[]);

    const validate = () => {
        const errors: Record<string, string> = {};
        if (!name.trim()) errors.name = "Name is required.";
        if (!email.trim()) errors.email = "Email is required.";
        if (departments.length === 0) errors.departments = "Please select at least one department.";
        if (roles.length === 0) errors.roles = "Please select at least one role.";
        if (hobbies.length === 0) errors.hobbies = "Please select at least one hobby.";
        if (!birthdate) errors.birthdate = "Please enter your birthdate.";
        setValidation(errors);
        return Object.keys(errors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validate()) return;
        setSubmitError(null);

        const payload: OnboardingFormValues = {
            name,
            email,
            photoUrl,
            departments,
            roles,
            hobbies,
            birthdate: birthdate?.toISOString() || "",
        };

        try {
            await submitForm({ token, data: payload }).unwrap();
            setSubmitted(true);
        } catch (err: any) {
            setSubmitError(
                err?.data?.message || "Submission failed. Please try again."
            );
        }
    };

    // ─── States ───────────────────────────────────────────────────────────────

    if (submitted) {
        return <ConfirmationScreen name={name} />;
    }

    if (isLoading) {
        return (
            <Box minHeight="100vh" bgcolor="#F9FAFB" display="flex" alignItems="center" justifyContent="center">
                <Container maxWidth="sm">
                    <Paper elevation={0} sx={{ p: 4, borderRadius: "20px", border: "1px solid #EAECF0" }}>
                        <Skeleton variant="circular" width={80} height={80} sx={{ mx: "auto", mb: 3 }} />
                        <Skeleton variant="text" height={40} sx={{ mb: 2 }} />
                        {[1, 2, 3, 4, 5].map((i) => (
                            <Skeleton key={i} variant="rounded" height={56} sx={{ mb: 2, borderRadius: "8px" }} />
                        ))}
                    </Paper>
                </Container>
            </Box>
        );
    }

    if (error || !data) {
        const errMsg = (error as any)?.data?.message || "This link is invalid or has expired.";
        return (
            <Box minHeight="100vh" bgcolor="#F9FAFB" display="flex" alignItems="center" justifyContent="center" px={2}>
                <Paper
                    elevation={0}
                    sx={{ p: 5, borderRadius: "20px", border: "1px solid #EAECF0", maxWidth: 420, textAlign: "center" }}
                >
                    <Typography fontSize="48px" mb={2}>🔒</Typography>
                    <Typography variant="h6" fontWeight={700} color="#101828" mb={1}>
                        Link Unavailable
                    </Typography>
                    <Typography variant="body2" color="#667085">
                        {errMsg}
                    </Typography>
                </Paper>
            </Box>
        );
    }

    if (data.onboardingCompleted) {
        return (
            <Box minHeight="100vh" bgcolor="#F9FAFB" display="flex" alignItems="center" justifyContent="center" px={2}>
                <Paper
                    elevation={0}
                    sx={{ p: 5, borderRadius: "20px", border: "1px solid #EAECF0", maxWidth: 420, textAlign: "center" }}
                >
                    <Typography fontSize="48px" mb={2}>✅</Typography>
                    <Typography variant="h6" fontWeight={700} color="#101828" mb={1}>
                        Already completed!
                    </Typography>
                    <Typography variant="body2" color="#667085">
                        You've already submitted your profile. You can close this window.
                    </Typography>
                </Paper>
            </Box>
        );
    }

    // ─── Main Form ────────────────────────────────────────────────────────────

    return (
        <LocalizationProvider dateAdapter={AdapterDayjs}>
            <Box minHeight="100vh" bgcolor="#F9FAFB" py={6} px={2}>
                <Container maxWidth="sm">
                    {/* Header */}
                    <Box textAlign="center" mb={4}>
                        <Box
                            sx={{
                                width: 40,
                                height: 40,
                                borderRadius: "10px",
                                bgcolor: "#E57B2C",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                mx: "auto",
                                mb: 2,
                            }}
                        >
                            <Typography fontWeight={700} color="white" fontSize="16px">FF</Typography>
                        </Box>
                        <Typography variant="h5" fontWeight={700} color="#101828">
                            Complete Your Profile
                        </Typography>
                        <Typography variant="body2" color="#667085" mt={0.5}>
                            Help your teammates get to know you — takes about 2 minutes.
                        </Typography>
                    </Box>

                    <Paper
                        component="form"
                        onSubmit={handleSubmit}
                        elevation={0}
                        sx={{
                            p: { xs: 3, sm: 4 },
                            borderRadius: "20px",
                            border: "1px solid #EAECF0",
                            bgcolor: "#FFFFFF",
                        }}
                    >
                        {/* Photo */}
                        <Box display="flex" flexDirection="column" alignItems="center" mb={4}>
                            <Box position="relative">
                                <Avatar
                                    src={photoUrl || undefined}
                                    sx={{
                                        width: 88,
                                        height: 88,
                                        border: photoUrl ? "3px solid #E57B2C" : "3px dashed #D0D5DD",
                                        bgcolor: "#F9FAFB",
                                        fontSize: 32,
                                        color: "#667085",
                                    }}
                                >
                                    {!photoUrl && name?.charAt(0).toUpperCase()}
                                </Avatar>
                                <IconButton
                                    onClick={() => setPhotoModalOpen(true)}
                                    size="small"
                                    sx={{
                                        position: "absolute",
                                        bottom: 0,
                                        right: 0,
                                        bgcolor: "#E57B2C",
                                        color: "white",
                                        width: 28,
                                        height: 28,
                                        "&:hover": { bgcolor: "#C96A21" },
                                        boxShadow: "0 2px 6px rgba(229,123,44,0.4)",
                                    }}
                                >
                                    <CameraAltIcon sx={{ fontSize: 14 }} />
                                </IconButton>
                            </Box>
                            <Typography
                                variant="caption"
                                color="#667085"
                                mt={1}
                                sx={{ cursor: "pointer", "&:hover": { color: "#E57B2C" } }}
                                onClick={() => setPhotoModalOpen(true)}
                            >
                                {photoUrl ? "Change photo" : "Upload a photo"}
                            </Typography>
                        </Box>

                        <Divider sx={{ mb: 3, borderColor: "#F2F4F7" }} />

                        {/* Name */}
                        <Box mb={2.5}>
                            <TextField
                                label="Full Name"
                                fullWidth
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                disabled={nameReadOnly}
                                error={!!validation.name}
                                helperText={
                                    validation.name ||
                                    (nameReadOnly ? "Pre-filled from your Slack profile." : undefined)
                                }
                                InputProps={{
                                    sx: {
                                        borderRadius: "10px",
                                        bgcolor: nameReadOnly ? "#F9FAFB" : undefined,
                                    },
                                }}
                            />
                        </Box>

                        {/* Email */}
                        <Box mb={2.5}>
                            <TextField
                                label="Email Address"
                                type="email"
                                fullWidth
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                disabled={emailReadOnly}
                                error={!!validation.email}
                                helperText={
                                    validation.email ||
                                    (emailReadOnly ? "Pre-filled from your Slack profile." : undefined)
                                }
                                InputProps={{
                                    sx: {
                                        borderRadius: "10px",
                                        bgcolor: emailReadOnly ? "#F9FAFB" : undefined,
                                    },
                                }}
                            />
                        </Box>

                        {/* Department — chip selector using org's options */}
                        <Box mb={3}>
                            <ChipSelector
                                label="Departments"
                                options={departmentOptions}
                                selected={departments}
                                onChange={(vals) => {
                                    setDepartments(vals);
                                    if (validation.departments) setValidation((v) => ({ ...v, departments: "" }));
                                }}
                                allowCreate={false}
                                helperText={validation.departments || "Select your departments."}
                                error={!!validation.departments}
                            />
                        </Box>

                        {/* Role — chip selector using org's options */}
                        <Box mb={3}>
                            <ChipSelector
                                label="Roles"
                                options={roleOptions}
                                selected={roles}
                                onChange={(vals) => {
                                    setRoles(vals);
                                    if (validation.roles) setValidation((v) => ({ ...v, roles: "" }));
                                }}
                                allowCreate={false}
                                helperText={validation.roles || "Select your roles."}
                                error={!!validation.roles}
                            />
                        </Box>

                        {/* Hobby */}
                        <Box mb={2.5}>
                            <ChipSelector
                                label="Hobbies"
                                options={[...HOBBIES]}
                                selected={hobbies}
                                onChange={(vals) => {
                                    setHobbies(vals);
                                    if (validation.hobbies) setValidation((v) => ({ ...v, hobbies: "" }));
                                }}
                                allowCreate={false}
                                helperText={validation.hobbies || "Select your favourite hobbies."}
                                error={!!validation.hobbies}
                            />
                        </Box>

                        {/* Birthdate */}
                        <Box mb={3}>
                            <DatePicker
                                label="Date of Birth"
                                value={birthdate}
                                onChange={(val) => setBirthdate(val)}
                                disableFuture
                                slotProps={{
                                    textField: {
                                        fullWidth: true,
                                        error: !!validation.birthdate,
                                        helperText: validation.birthdate,
                                        InputProps: { sx: { borderRadius: "10px" } },
                                    },
                                }}
                            />
                        </Box>

                        {submitError && (
                            <Alert severity="error" sx={{ mb: 2.5, borderRadius: "8px" }}>
                                {submitError}
                            </Alert>
                        )}

                        <Button
                            type="submit"
                            variant="contained"
                            fullWidth
                            disabled={isSubmitting}
                            sx={{
                                py: 1.5,
                                borderRadius: "10px",
                                bgcolor: "#E57B2C",
                                fontWeight: 600,
                                fontSize: "15px",
                                "&:hover": { bgcolor: "#C96A21" },
                                boxShadow: "0 4px 12px rgba(229, 123, 44, 0.35)",
                            }}
                        >
                            {isSubmitting ? (
                                <CircularProgress size={22} sx={{ color: "white" }} />
                            ) : (
                                "Submit My Profile 🚀"
                            )}
                        </Button>
                    </Paper>

                    <Typography variant="caption" color="#98A2B3" textAlign="center" display="block" mt={3}>
                        Your information is only shared within your team.
                    </Typography>
                </Container>
            </Box>

            {/* Photo Upload Modal */}
            <PhotoUploadModal
                open={photoModalOpen}
                onClose={() => setPhotoModalOpen(false)}
                token={token}
                onPhotoUploaded={(url) => {
                    setPhotoUrl(url);
                    setPhotoModalOpen(false);
                }}
                currentPhotoUrl={photoUrl}
            />
        </LocalizationProvider>
    );
};

import { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Stack,
  Alert,
  Stepper,
  Step,
  StepLabel,
  Paper,
  Divider,
  CircularProgress,
} from "@mui/material";
import { CheckCircle } from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import { useGetWorkspacesQuery } from "@/features/slack/api/slackApi";
import {
  useCompleteOnboardingMutation,
} from "@/features/auth/api/authApi";
import {
  useGetOrganizationsQuery,
  useUpdateOrganizationMutation,
} from "@/features/organization/api/organizationApi";
import SlackConnect from "@/features/slack/components/SlackConnect";
import Logo from "../../assets/Images/Logo.webp";
import FFButton from "@/components/ui/FFButton";
import ChipSelector from "@/components/ui/ChipSelector";

/* ── Predefined options ────────────────────────────────────────── */
const PREDEFINED_DEPARTMENTS = [
  "Engineering",
  "Marketing",
  "Sales",
  "HR",
  "Design",
  "Finance",
  "Operations",
  "Legal",
  "Product",
  "Customer Support",
];

const PREDEFINED_ROLES = [
  "Software Engineer",
  "Product Manager",
  "Designer",
  "Data Analyst",
  "Marketing Manager",
  "Sales Representative",
  "HR Manager",
  "Finance Analyst",
  "Operations Manager",
  "Customer Support Lead",
];

const steps = ["Connect Slack", "Set Up Roles & Departments"];

/* ── Slack logo ────────────────────────────────────────────────── */
const SlackLogoSVG = () => (
  <svg width="24" height="24" viewBox="0 0 122.8 122.8" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M25.8 77.6c0 7.1-5.8 12.9-12.9 12.9S0 84.7 0 77.6s5.8-12.9 12.9-12.9h12.9v12.9zm6.5 0c0-7.1 5.8-12.9 12.9-12.9s12.9 5.8 12.9 12.9v32.3c0 7.1-5.8 12.9-12.9 12.9s-12.9-5.8-12.9-12.9V77.6z" fill="#E01E5A" />
    <path d="M45.2 25.8c-7.1 0-12.9-5.8-12.9-12.9S38.1 0 45.2 0s12.9 5.8 12.9 12.9v12.9H45.2zm0 6.5c7.1 0 12.9 5.8 12.9 12.9s-5.8 12.9-12.9 12.9H12.9C5.8 58.1 0 52.3 0 45.2s5.8-12.9 12.9-12.9h32.3z" fill="#36C5F0" />
    <path d="M97 45.2c0-7.1 5.8-12.9 12.9-12.9s12.9 5.8 12.9 12.9-5.8 12.9-12.9 12.9H97V45.2zm-6.5 0c0 7.1-5.8 12.9-12.9 12.9s-12.9-5.8-12.9-12.9V12.9C64.7 5.8 70.5 0 77.6 0s12.9 5.8 12.9 12.9v32.3z" fill="#2EB67D" />
    <path d="M77.6 97c7.1 0 12.9 5.8 12.9 12.9s-5.8 12.9-12.9 12.9-12.9-5.8-12.9-12.9V97h12.9zm0-6.5c-7.1 0-12.9-5.8-12.9-12.9s5.8-12.9 12.9-12.9h32.3c7.1 0 12.9 5.8 12.9 12.9s-5.8 12.9-12.9 12.9H77.6z" fill="#ECB22E" />
  </svg>
);

const ChecklistItem = ({ text }: { text: string }) => (
  <Stack direction="row" spacing={1.5} alignItems="center">
    <CheckCircle sx={{ fontSize: 20, color: "#101828" }} />
    <Typography sx={{ fontSize: "14px", fontWeight: 500, color: "#344054" }}>
      {text}
    </Typography>
  </Stack>
);

/* ═══════════════════════════════════════════════════════════════ */
const OnboardingPage = () => {
  const navigate = useNavigate();

  const { data: workspacesData, refetch } = useGetWorkspacesQuery();
  const { data: orgsData } = useGetOrganizationsQuery();
  const [completeOnboarding, { isLoading: isCompleting }] = useCompleteOnboardingMutation();
  const [updateOrganization, { isLoading: isSaving }] = useUpdateOrganizationMutation();

  const workspaces = workspacesData?.data?.workspaces || [];
  const hasWorkspaces = workspaces.length > 0;

  const [activeStep, setActiveStep] = useState(0);
  const [departments, setDepartments] = useState<string[]>([]);
  const [roles, setRoles] = useState<string[]>([]);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Refetch when coming back from Slack OAuth
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get("connected") === "true") {
      refetch();
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [refetch]);

  // Pre-fill from existing org if already saved
  useEffect(() => {
    if (orgsData && orgsData.length > 0) {
      const org = orgsData[0];
      if (org.departments?.length) setDepartments(org.departments);
      if (org.roles?.length) setRoles(org.roles);
    }
  }, [orgsData]);

  // Once Slack is connected, advance to step 2 (Roles & Departments)
  useEffect(() => {
    if (hasWorkspaces) {
      setActiveStep(1);
    }
  }, [hasWorkspaces]);

  const handleContinue = async () => {
    setSaveError(null);
    try {
      const org = orgsData?.[0];
      if (org) {
        await updateOrganization({
          organizationId: org._id,
          data: { departments, roles },
        }).unwrap();
      }
      await completeOnboarding().unwrap();
      navigate("/dashboard");
    } catch (err: any) {
      setSaveError(err?.data?.message || "Failed to save. Please try again.");
    }
  };

  const handleSkip = async () => {
    try {
      await completeOnboarding().unwrap();
      navigate("/dashboard");
    } catch {
      navigate("/dashboard");
    }
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        bgcolor: "#FFFFFF",
        p: 3,
      }}
    >
      <Stack spacing={4} alignItems="center" sx={{ width: "100%", maxWidth: "520px" }}>
        {/* Logos */}
        <Stack direction="row" alignItems="center" spacing={3}>
          <Box
            component="img"
            src={Logo}
            alt="Fast Friends"
            sx={{
              width: 48,
              height: 48,
              borderRadius: "12px",
              border: "1px solid #EAECF0",
              boxShadow: "0px 1px 2px rgba(16, 24, 40, 0.05)",
            }}
          />
          <Typography sx={{ fontSize: 20, color: "#D0D5DD" }}>↔</Typography>
          <Box
            sx={{
              width: 48,
              height: 48,
              borderRadius: "12px",
              border: "1px solid #EAECF0",
              boxShadow: "0px 1px 2px rgba(16, 24, 40, 0.05)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              bgcolor: "#FFFFFF",
            }}
          >
            <SlackLogoSVG />
          </Box>
        </Stack>

        {/* Stepper */}
        <Stepper activeStep={activeStep} alternativeLabel sx={{ width: "100%" }}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel
                sx={{
                  "& .MuiStepLabel-label": { fontSize: "13px", fontWeight: 500 },
                  "& .MuiStepIcon-root.Mui-active": { color: "#E57B2C" },
                  "& .MuiStepIcon-root.Mui-completed": { color: "#E57B2C" },
                }}
              >
                {label}
              </StepLabel>
            </Step>
          ))}
        </Stepper>

        {/* ── Step 1: Connect Slack ── */}
        {activeStep === 0 && (
          <Stack spacing={4} alignItems="center" sx={{ width: "100%", textAlign: "center" }}>
            <Box>
              <Typography variant="h3" sx={{ fontSize: "28px", fontWeight: 600, color: "#101828", mb: 1.5 }}>
                Connect Slack
              </Typography>
              <Typography sx={{ fontSize: "16px", color: "#667085", lineHeight: "24px" }}>
                To run games and import members, we need access to your Slack workspace.
              </Typography>
            </Box>
            <Stack spacing={2} alignItems="flex-start" sx={{ pl: 2, width: "100%" }}>
              <ChecklistItem text="Import members from your workspace" />
              <ChecklistItem text="Run scheduled games automatically" />
              <ChecklistItem text="Deliver quizzes directly inside Slack" />
            </Stack>
            <Box sx={{ width: "100%" }}>
              {!hasWorkspaces ? (
                <SlackConnect variant="primary" fullWidth>
                  Connect Slack
                </SlackConnect>
              ) : (
                <Stack spacing={2} width="100%">
                  <Alert severity="success" icon={<CheckCircle fontSize="inherit" />}>
                    Workspace connected! Setting up your organization...
                  </Alert>
                  <CircularProgress size={24} sx={{ color: "#E57B2C", mx: "auto" }} />
                </Stack>
              )}
            </Box>
          </Stack>
        )}

        {/* ── Step 2: Roles & Departments ── */}
        {activeStep === 1 && (
          <Paper
            elevation={0}
            sx={{
              width: "100%",
              p: { xs: 3, sm: 4 },
              borderRadius: "16px",
              border: "1px solid #EAECF0",
            }}
          >
            <Stack spacing={1} mb={3}>
              <Typography variant="h5" fontWeight={700} color="#101828">
                Set Up Your Organization
              </Typography>
              <Typography variant="body2" color="#667085">
                Define the departments and roles your team uses. Employees will pick from these
                when they complete their profiles.
              </Typography>
            </Stack>

            <Divider sx={{ mb: 3, borderColor: "#F2F4F7" }} />

            <Stack spacing={3.5}>
              {/* Departments */}
              <ChipSelector
                label="Departments"
                options={PREDEFINED_DEPARTMENTS}
                selected={departments}
                onChange={setDepartments}
                helperText="Select existing or create custom department names for your org."
              />

              {/* Roles */}
              <ChipSelector
                label="Roles"
                options={PREDEFINED_ROLES}
                selected={roles}
                onChange={setRoles}
                helperText="Select existing or create custom job roles for your org."
              />
            </Stack>

            {saveError && (
              <Alert severity="error" sx={{ mt: 3, borderRadius: "8px" }}>
                {saveError}
              </Alert>
            )}

            <Stack spacing={1.5} mt={4}>
              <FFButton
                variant="primary"
                fullWidth
                onClick={handleContinue}
                loading={isCompleting || isSaving}
                disabled={departments.length === 0 && roles.length === 0}
              >
                Continue to Dashboard
              </FFButton>
              <FFButton
                variant="secondary"
                fullWidth
                onClick={handleSkip}
                disabled={isCompleting || isSaving}
              >
                Skip for now
              </FFButton>
            </Stack>
          </Paper>
        )}
      </Stack>
    </Box>
  );
};

export default OnboardingPage;

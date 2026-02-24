import { useEffect, useState } from "react";
import {
  Box,
  Container,
  Typography,
  Divider,
  Alert,
  CircularProgress,
  Paper,
} from "@mui/material";
import { Settings as SettingsIcon, CheckCircle } from "@mui/icons-material";
import { useParams } from "react-router-dom";
import {
  useGetOrganizationsQuery,
  useUpdateOrganizationMutation,
} from "@/features/organization/api/organizationApi";
import ChipSelector from "@/components/ui/ChipSelector";
import FFButton from "@/components/ui/FFButton";

/* ── Predefined options (same as onboarding) ─────────────────────────── */
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

const SettingsPage = () => {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  void workspaceId; // available for future workspace-specific settings

  const { data: orgsData, isLoading } = useGetOrganizationsQuery();
  const [updateOrganization, { isLoading: isSaving }] =
    useUpdateOrganizationMutation();

  const [departments, setDepartments] = useState<string[]>([]);
  const [roles, setRoles] = useState<string[]>([]);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Pre-fill from existing org data
  useEffect(() => {
    if (orgsData && orgsData.length > 0) {
      const org = orgsData[0];
      if (org.departments?.length) setDepartments(org.departments);
      if (org.roles?.length) setRoles(org.roles);
    }
  }, [orgsData]);

  const handleSave = async () => {
    setSaveError(null);
    setSaveSuccess(false);
    try {
      const org = orgsData?.[0];
      if (!org) throw new Error("No organization found");

      await updateOrganization({
        organizationId: org._id,
        data: { departments, roles },
      }).unwrap();

      setSaveSuccess(true);
      // Auto-hide success after 3 seconds
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      setSaveError(err?.data?.message || "Failed to save. Please try again.");
    }
  };

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" py={10}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* Header */}
      <Box mb={4} display="flex" alignItems="center" justifyContent="space-between">
        <Box display="flex" alignItems="center" gap={1.5}>
          <SettingsIcon sx={{ fontSize: 32, color: "primary.main" }} />
          <Box>
            <Typography variant="h4" fontWeight="700">
              Settings
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Manage your organization configuration
            </Typography>
          </Box>
        </Box>
        <FFButton
          variant="primary"
          onClick={handleSave}
          loading={isSaving}
          disabled={departments.length === 0 && roles.length === 0}
        >
          Save Changes
        </FFButton>
      </Box>

      {/* Success / Error banners */}
      {saveSuccess && (
        <Alert
          severity="success"
          icon={<CheckCircle fontSize="inherit" />}
          sx={{ mb: 3, borderRadius: "8px" }}
        >
          Settings saved successfully!
        </Alert>
      )}
      {saveError && (
        <Alert severity="error" sx={{ mb: 3, borderRadius: "8px" }}>
          {saveError}
        </Alert>
      )}

      {/* Roles & Departments card */}
      <Paper
        elevation={0}
        sx={{
          p: { xs: 3, sm: 4 },
          borderRadius: "16px",
          border: "1px solid",
          borderColor: "divider",
          maxWidth: 700,
        }}
      >
        <Typography variant="h6" fontWeight={700} color="text.primary" mb={0.5}>
          Roles &amp; Departments
        </Typography>
        <Typography variant="body2" color="text.secondary" mb={3}>
          Define the departments and roles your team uses. Employees will pick
          from these when they complete their profiles.
        </Typography>

        <Divider sx={{ mb: 3 }} />

        <Box display="flex" flexDirection="column" gap={4}>
          <ChipSelector
            label="Departments"
            options={PREDEFINED_DEPARTMENTS}
            selected={departments}
            onChange={setDepartments}
            helperText="Select existing or create custom department names for your org."
          />

          <ChipSelector
            label="Roles"
            options={PREDEFINED_ROLES}
            selected={roles}
            onChange={setRoles}
            helperText="Select existing or create custom job roles for your org."
          />
        </Box>

        <Box mt={4} display="flex" justifyContent="flex-end">
          <FFButton
            variant="primary"
            onClick={handleSave}
            loading={isSaving}
            disabled={departments.length === 0 && roles.length === 0}
          >
            Save Changes
          </FFButton>
        </Box>
      </Paper>
    </Container>
  );
};

export default SettingsPage;

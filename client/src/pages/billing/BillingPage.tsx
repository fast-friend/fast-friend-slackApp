import {
  Box,
  Container,
  Typography,
  Paper,
  Chip,
  Divider,
  ToggleButton,
  ToggleButtonGroup,
  CircularProgress,
  Alert,
} from "@mui/material";
import {
  CheckCircle as CheckIcon,
  CreditCard as CreditCardIcon,
  Star as StarIcon,
} from "@mui/icons-material";
import { useState } from "react";
import {
  useGetSubscriptionQuery,
  useGetPricesQuery,
  useCreateCheckoutSessionMutation,
  useCreatePortalSessionMutation,
} from "@/features/billing/api/billingApi";
import FFButton from "@/components/ui/FFButton";

const FREE_FEATURES = [
  "Discovery (name-to-face) game",
  "Up to 10 team members",
  "Slack integration",
  "Basic leaderboard",
];

const PRO_FEATURES = [
  "All game modules unlocked",
  "Unlimited team members",
  "Manual game triggers",
  "Advanced analytics & reports",
  "Priority support",
];

const statusColors: Record<string, "success" | "warning" | "error" | "default"> = {
  active: "success",
  trialing: "success",
  past_due: "warning",
  canceled: "error",
  unpaid: "error",
};

const BillingPage = () => {
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "yearly">("monthly");

  const { data: subscription, isLoading: subLoading } = useGetSubscriptionQuery();
  const { data: prices, isLoading: pricesLoading } = useGetPricesQuery();
  const [createCheckout, { isLoading: checkoutLoading }] = useCreateCheckoutSessionMutation();
  const [createPortal, { isLoading: portalLoading }] = useCreatePortalSessionMutation();

  const isPro = subscription?.plan === "pro" || subscription?.plan === "custom";

  const handleUpgrade = async () => {
    if (!prices) return;
    const priceId = billingPeriod === "monthly" ? prices.proMonthly : prices.proYearly;
    const result = await createCheckout({ priceId }).unwrap();
    window.location.href = result.url;
  };

  const handleManage = async () => {
    const result = await createPortal().unwrap();
    window.location.href = result.url;
  };

  if (subLoading || pricesLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress sx={{ color: "#E57B2C" }} />
      </Box>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header */}
      <Box mb={4}>
        <Typography variant="h5" fontWeight="bold" gutterBottom>
          Billing & Plan
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Manage your subscription and see what's included in each plan.
        </Typography>
      </Box>

      {/* Current plan status */}
      {subscription && (
        <Paper
          elevation={0}
          sx={{ p: 3, mb: 4, border: "1px solid", borderColor: "divider", borderRadius: 3 }}
        >
          <Box display="flex" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={2}>
            <Box>
              <Typography variant="subtitle2" color="text.secondary" mb={0.5}>
                Current plan
              </Typography>
              <Box display="flex" alignItems="center" gap={1.5}>
                <Typography variant="h6" fontWeight="bold" textTransform="capitalize">
                  {subscription.plan}
                </Typography>
                {subscription.subscriptionStatus && (
                  <Chip
                    label={subscription.subscriptionStatus.replace("_", " ")}
                    color={statusColors[subscription.subscriptionStatus] ?? "default"}
                    size="small"
                    sx={{ textTransform: "capitalize" }}
                  />
                )}
              </Box>
              {subscription.currentPeriodEnd && (
                <Typography variant="caption" color="text.secondary" mt={0.5} display="block">
                  Renews {new Date(subscription.currentPeriodEnd).toLocaleDateString("en-US", {
                    month: "long", day: "numeric", year: "numeric",
                  })}
                </Typography>
              )}
            </Box>
            {isPro && (
              <FFButton
                variant="secondary"
                size="sm"
                onClick={handleManage}
                disabled={portalLoading}
              >
                {portalLoading ? "Loading..." : "Manage subscription"}
              </FFButton>
            )}
          </Box>
        </Paper>
      )}

      {/* Past due warning */}
      {subscription?.subscriptionStatus === "past_due" && (
        <Alert severity="warning" sx={{ mb: 4 }}>
          Your last payment failed. Please update your payment method to avoid losing access.
        </Alert>
      )}

      {/* Billing period toggle — only show for free tier */}
      {!isPro && (
        <Box display="flex" justifyContent="center" mb={4}>
          <ToggleButtonGroup
            value={billingPeriod}
            exclusive
            onChange={(_, v) => v && setBillingPeriod(v)}
            size="small"
            sx={{
              "& .MuiToggleButton-root.Mui-selected": {
                bgcolor: "#E57B2C",
                color: "white",
                "&:hover": { bgcolor: "#C96A21" },
              },
            }}
          >
            <ToggleButton value="monthly">Monthly</ToggleButton>
            <ToggleButton value="yearly">
              Yearly&nbsp;
              <Chip label="Save 15%" size="small" sx={{ ml: 0.5, height: 18, fontSize: 10 }} />
            </ToggleButton>
          </ToggleButtonGroup>
        </Box>
      )}

      {/* Plan cards */}
      <Box display="grid" gridTemplateColumns={{ xs: "1fr", md: "1fr 1fr" }} gap={3}>
        {/* Free plan */}
        <Paper
          elevation={0}
          sx={{
            p: 3,
            border: "1px solid",
            borderColor: subscription?.plan === "free" ? "#E57B2C" : "divider",
            borderRadius: 3,
            position: "relative",
          }}
        >
          {subscription?.plan === "free" && (
            <Chip
              label="Current plan"
              size="small"
              sx={{ position: "absolute", top: 16, right: 16, bgcolor: "#E57B2C", color: "white" }}
            />
          )}
          <Box display="flex" alignItems="center" gap={1} mb={1}>
            <CreditCardIcon sx={{ color: "text.secondary" }} />
            <Typography variant="h6" fontWeight="bold">Free</Typography>
          </Box>
          <Typography variant="h4" fontWeight="bold" mb={0.5}>$0</Typography>
          <Typography variant="body2" color="text.secondary" mb={3}>Forever free</Typography>
          <Divider sx={{ mb: 3 }} />
          <Box display="flex" flexDirection="column" gap={1.5}>
            {FREE_FEATURES.map((f) => (
              <Box key={f} display="flex" alignItems="center" gap={1}>
                <CheckIcon sx={{ fontSize: 18, color: "success.main" }} />
                <Typography variant="body2">{f}</Typography>
              </Box>
            ))}
          </Box>
        </Paper>

        {/* Pro plan */}
        <Paper
          elevation={0}
          sx={{
            p: 3,
            border: "2px solid",
            borderColor: isPro ? "#E57B2C" : "#E57B2C22",
            borderRadius: 3,
            position: "relative",
            background: isPro ? "linear-gradient(135deg, #fff9f5 0%, #fff 100%)" : "white",
          }}
        >
          <Chip
            icon={<StarIcon sx={{ fontSize: "14px !important" }} />}
            label={isPro ? "Current plan" : "Most popular"}
            size="small"
            sx={{ position: "absolute", top: 16, right: 16, bgcolor: "#E57B2C", color: "white" }}
          />
          <Box display="flex" alignItems="center" gap={1} mb={1}>
            <StarIcon sx={{ color: "#E57B2C" }} />
            <Typography variant="h6" fontWeight="bold">Pro</Typography>
          </Box>
          <Box display="flex" alignItems="baseline" gap={0.5} mb={0.5}>
            <Typography variant="h4" fontWeight="bold">
              {billingPeriod === "monthly" ? "$49" : "$500"}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              /{billingPeriod === "monthly" ? "month" : "year"}
            </Typography>
          </Box>
          <Typography variant="body2" color="text.secondary" mb={3}>
            {billingPeriod === "yearly" ? "Billed annually — save $88" : "Billed monthly"}
          </Typography>
          <Divider sx={{ mb: 3 }} />
          <Box display="flex" flexDirection="column" gap={1.5} mb={3}>
            {PRO_FEATURES.map((f) => (
              <Box key={f} display="flex" alignItems="center" gap={1}>
                <CheckIcon sx={{ fontSize: 18, color: "#E57B2C" }} />
                <Typography variant="body2">{f}</Typography>
              </Box>
            ))}
          </Box>
          {!isPro && (
            <FFButton
              variant="primary"
              size="md"
              onClick={handleUpgrade}
              disabled={checkoutLoading}
              fullWidth
            >
              {checkoutLoading ? "Loading..." : `Upgrade to Pro — ${billingPeriod === "monthly" ? "$49/mo" : "$500/yr"}`}
            </FFButton>
          )}
        </Paper>
      </Box>

      {/* Custom plan */}
      <Paper
        elevation={0}
        sx={{ p: 3, mt: 3, border: "1px solid", borderColor: "divider", borderRadius: 3 }}
      >
        <Box display="flex" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={2}>
          <Box>
            <Typography variant="subtitle1" fontWeight="bold">Custom plan</Typography>
            <Typography variant="body2" color="text.secondary">
              Need volume pricing or custom features? Let's talk.
            </Typography>
          </Box>
          <FFButton
            variant="secondary"
            size="sm"
            onClick={() => window.open("mailto:greg@fast-friends.app?subject=Custom Plan Inquiry", "_blank")}
          >
            Contact us
          </FFButton>
        </Box>
      </Paper>
    </Container>
  );
};

export default BillingPage;

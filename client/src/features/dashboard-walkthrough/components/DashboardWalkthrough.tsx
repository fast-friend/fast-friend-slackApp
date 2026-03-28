import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Box,
  Button,
  Paper,
  Popper,
  Stack,
  Typography,
} from "@mui/material";
import {
  useLocation,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import { useAppSelector } from "@/app/hooks";
import { useCompleteDashboardWalkthroughMutation } from "@/features/auth";

type WalkthroughPlacement =
  | "bottom-start"
  | "bottom"
  | "bottom-end"
  | "top-start"
  | "top"
  | "top-end";

interface WalkthroughStep {
  id: string;
  route: string;
  selector: string;
  title: string;
  description: string;
  placement?: WalkthroughPlacement;
}

interface HighlightSnapshot {
  position: string;
  zIndex: string;
  boxShadow: string;
  borderRadius: string;
}

export const DashboardWalkthrough = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { workspaceId = "" } = useParams<{ workspaceId: string }>();
  const [searchParams] = useSearchParams();
  const { user } = useAppSelector((state) => state.auth);
  const [completeDashboardWalkthrough] =
    useCompleteDashboardWalkthroughMutation();

  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [dismissedLocally, setDismissedLocally] = useState(false);
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);

  const highlightedElementRef = useRef<HTMLElement | null>(null);
  const highlightSnapshotRef = useRef<HighlightSnapshot | null>(null);
  const isManualWalkthrough = searchParams.get("walkthrough") === "1";

  const buildStepRoute = useCallback(
    (path: string) =>
      isManualWalkthrough ? `${path}?walkthrough=1` : path,
    [isManualWalkthrough],
  );

  const steps = useMemo<WalkthroughStep[]>(
    () =>
      workspaceId
        ? [
            {
              id: "send-onboarding-links",
              route: buildStepRoute(`/workspaces/${workspaceId}/dashboard`),
              selector: "#walkthrough-send-onboarding",
              title: "Send onboarding links",
              description:
                "Start here to send onboarding links to everyone who still needs to complete their profile.",
              placement: "bottom-end",
            },
            {
              id: "create-team",
              route: buildStepRoute(`/workspaces/${workspaceId}/groups`),
              selector: "#walkthrough-create-team",
              title: "Create decks",
              description:
                "Use decks to create groups for your workspace. You can name the team, add a short description, and choose members before saving it.",
              placement: "top-start",
            },
            {
              id: "create-game",
              route: buildStepRoute(`/workspaces/${workspaceId}/games`),
              selector: "#walkthrough-create-game",
              title: "Create games",
              description:
                "From Games, you can choose the deck, pick a template, set the schedule, and save a recurring game for your workspace.",
              placement: "top-start",
            },
            {
              id: "upload-employees",
              route: buildStepRoute(`/workspaces/${workspaceId}/users`),
              selector: "#walkthrough-users-overview",
              title: "Manage employees",
              description:
                "All employees from the selected workspace already appear here. CSV upload is optional if you want to import or enrich employee details in bulk.",
              placement: "bottom-end",
            },
            {
              id: "dashboard-metrics",
              route: buildStepRoute(`/workspaces/${workspaceId}/dashboard`),
              selector: "#walkthrough-dashboard-metrics",
              title: "Track dashboard metrics",
              description:
                "Come back to the dashboard anytime to review key metrics, rankings, and team performance trends.",
              placement: "bottom-start",
            },
          ]
        : [],
    [buildStepRoute, workspaceId],
  );

  const isWalkthroughActive =
    Boolean(user) &&
    Boolean(user?.onboardingCompleted) &&
    (isManualWalkthrough || !user?.dashboardWalkthroughCompleted) &&
    !dismissedLocally &&
    steps.length > 0;

  const activeStep = steps[currentStepIndex];

  const restoreHighlight = useCallback(() => {
    const element = highlightedElementRef.current;
    const snapshot = highlightSnapshotRef.current;

    if (element && snapshot) {
      element.style.position = snapshot.position;
      element.style.zIndex = snapshot.zIndex;
      element.style.boxShadow = snapshot.boxShadow;
      element.style.borderRadius = snapshot.borderRadius;
    }

    highlightedElementRef.current = null;
    highlightSnapshotRef.current = null;
  }, []);

  const highlightElement = useCallback(
    (element: HTMLElement) => {
      if (highlightedElementRef.current === element) {
        return;
      }

      restoreHighlight();

      highlightSnapshotRef.current = {
        position: element.style.position,
        zIndex: element.style.zIndex,
        boxShadow: element.style.boxShadow,
        borderRadius: element.style.borderRadius,
      };

      if (getComputedStyle(element).position === "static") {
        element.style.position = "relative";
      }

      element.style.zIndex = "1301";
      element.style.borderRadius = "12px";
      element.style.boxShadow =
        "0 0 0 4px rgba(229, 123, 44, 0.35), 0 0 0 9999px rgba(16, 24, 40, 0.38)";

      highlightedElementRef.current = element;
    },
    [restoreHighlight],
  );

  const persistDismissal = useCallback(async () => {
    if (user?.dashboardWalkthroughCompleted) {
      return;
    }

    try {
      await completeDashboardWalkthrough().unwrap();
    } catch (error) {
      console.error("Failed to persist dashboard walkthrough completion:", error);
    }
  }, [completeDashboardWalkthrough, user?.dashboardWalkthroughCompleted]);

  const dismissWalkthrough = useCallback(() => {
    setDismissedLocally(true);
    setAnchorEl(null);
    restoreHighlight();
    if (isManualWalkthrough) {
      navigate(location.pathname, { replace: true });
    }
    void persistDismissal();
  }, [
    isManualWalkthrough,
    location.pathname,
    navigate,
    persistDismissal,
    restoreHighlight,
  ]);

  useEffect(() => {
    setCurrentStepIndex(0);
    setDismissedLocally(false);
    setAnchorEl(null);
    restoreHighlight();
  }, [user?.id, restoreHighlight]);

  useEffect(() => {
    if (!isManualWalkthrough) {
      return;
    }

    setCurrentStepIndex(0);
    setDismissedLocally(false);
    setAnchorEl(null);
    restoreHighlight();
  }, [isManualWalkthrough, restoreHighlight]);

  useEffect(() => {
    if (!isWalkthroughActive || !activeStep) {
      setAnchorEl(null);
      restoreHighlight();
      return;
    }

    const currentRoute = `${location.pathname}${location.search}`;

    if (currentRoute !== activeStep.route) {
      setAnchorEl(null);
      restoreHighlight();
      navigate(activeStep.route, { replace: true });
    }
  }, [
    activeStep,
    isWalkthroughActive,
    location.pathname,
    location.search,
    navigate,
    restoreHighlight,
  ]);

  useEffect(() => {
    if (!isWalkthroughActive || !activeStep) {
      return;
    }

    const currentRoute = `${location.pathname}${location.search}`;

    if (currentRoute !== activeStep.route) {
      return;
    }

    let isCancelled = false;
    let timeoutId: number | undefined;
    let attempts = 0;

    const findTarget = () => {
      if (isCancelled) {
        return;
      }

      const target = document.querySelector(activeStep.selector);

      if (target instanceof HTMLElement) {
        target.scrollIntoView({
          behavior: "smooth",
          block: "center",
          inline: "center",
        });
        highlightElement(target);
        setAnchorEl(target);
        return;
      }

      if (attempts < 20) {
        attempts += 1;
        timeoutId = window.setTimeout(findTarget, 150);
      }
    };

    findTarget();

    return () => {
      isCancelled = true;
      if (timeoutId) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [
    activeStep,
    highlightElement,
    isWalkthroughActive,
    location.pathname,
  ]);

  useEffect(() => {
    return () => {
      restoreHighlight();
    };
  }, [restoreHighlight]);

  if (!isWalkthroughActive || !activeStep || !anchorEl) {
    return null;
  }

  const isLastStep = currentStepIndex === steps.length - 1;

  const handleNext = () => {
    if (isLastStep) {
      dismissWalkthrough();
      return;
    }

    setAnchorEl(null);
    restoreHighlight();
    setCurrentStepIndex((prev) => prev + 1);
  };

  return (
    <Popper
      open
      anchorEl={anchorEl}
      placement={activeStep.placement || "bottom-start"}
      modifiers={[
        {
          name: "offset",
          options: {
            offset: [0, 12],
          },
        },
        {
          name: "preventOverflow",
          options: {
            padding: 16,
          },
        },
        {
          name: "flip",
          options: {
            padding: 16,
          },
        },
      ]}
      sx={{ zIndex: 1400, maxWidth: 360 }}
    >
      <Paper
        elevation={8}
        sx={{
          p: 2.5,
          borderRadius: "16px",
          border: "1px solid",
          borderColor: "divider",
          width: 340,
        }}
      >
        <Stack spacing={1.5}>
          <Box>
            <Typography
              variant="caption"
              sx={{
                color: "primary.main",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
              }}
            >
              Step {currentStepIndex + 1} of {steps.length}
            </Typography>
            <Typography
              variant="h6"
              sx={{ mt: 0.75, fontWeight: 700, color: "text.primary" }}
            >
              {activeStep.title}
            </Typography>
          </Box>

          <Typography variant="body2" color="text.secondary">
            {activeStep.description}
          </Typography>

          <Stack direction="row" spacing={1.25} justifyContent="space-between">
            <Button
              variant="text"
              onClick={dismissWalkthrough}
              sx={{ textTransform: "none", fontWeight: 600 }}
            >
              Skip
            </Button>
            <Button
              variant="contained"
              onClick={handleNext}
              sx={{ textTransform: "none", fontWeight: 600 }}
            >
              {isLastStep ? "Finish" : "Next"}
            </Button>
          </Stack>
        </Stack>
      </Paper>
    </Popper>
  );
};

export default DashboardWalkthrough;

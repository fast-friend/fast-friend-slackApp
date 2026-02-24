/**
 * Utility to fix scroll issues caused by MUI Dialogs or other components
 * that might set overflow: hidden on the body element
 */

export const fixScrollIfNeeded = () => {
  const body = document.body;
  const html = document.documentElement;

  // Check if there are actually any open modals
  const hasOpenModal = document.querySelector(
    '.MuiModal-root[aria-hidden="false"]',
  );
  const hasOpenDialog = document.querySelector(".MuiDialog-root");

  if (!hasOpenModal && !hasOpenDialog) {
    body.style.overflow = "";
    body.style.paddingRight = "";
    html.style.overflow = "";

    // Remove aria-hidden from root if no modals are open
    const root = document.getElementById("root");
    if (root && root.getAttribute("aria-hidden") === "true") {
      root.removeAttribute("aria-hidden");
    }
  }
};

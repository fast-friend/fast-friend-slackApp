import { Route, BrowserRouter as Router, Routes } from "react-router-dom";
import { useEffect } from "react";
import "./App.css";
import OrganisationMain from "./pages/OrganisationMain";
import { Provider } from "react-redux";
import { store } from "./app/store";
import { ThemeProvider } from "./theme/ThemeProvider";
import { WorkspaceProvider } from "./contexts/OrganizationContext";
import { fixScrollIfNeeded } from "./utils/debugScroll";

function App() {
  useEffect(() => {
    // Initial fix for any scroll issues
    fixScrollIfNeeded();

    // Set up a periodic check for scroll issues
    const interval = setInterval(() => {
      const hasModal = document.querySelector(
        '.MuiModal-root[aria-hidden="false"]',
      );
      if (!hasModal) {
        fixScrollIfNeeded();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <Provider store={store}>
      <ThemeProvider>
        <Router>
          <WorkspaceProvider>
            <Routes>
              <Route path="/*" element={<OrganisationMain />} />
            </Routes>
          </WorkspaceProvider>
        </Router>
      </ThemeProvider>
    </Provider>
  );
}

export default App;

import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Clear corrupted localStorage if migration fails
try {
  const stored = localStorage.getItem('owarin-app');
  if (stored) {
    JSON.parse(stored); // test parse
  }
} catch {
  console.warn('Clearing corrupted owarin-app store');
  localStorage.removeItem('owarin-app');
}

createRoot(document.getElementById("root")!).render(<App />);

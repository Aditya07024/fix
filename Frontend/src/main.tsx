import React from "react";
import ReactDOM from "react-dom/client";
import { ClerkProvider } from "@clerk/react";
import App from "./App.tsx";
import "./index.css";

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

if (!PUBLISHABLE_KEY) {
  throw new Error("Add your Clerk Publishable Key to .env.local or .env");
}

const AppClerkProvider = ClerkProvider as unknown as React.ComponentType<
  React.PropsWithChildren<{ afterSignOutUrl?: string }>
>;

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AppClerkProvider afterSignOutUrl="/">
      <App />
    </AppClerkProvider>
  </React.StrictMode>,
)

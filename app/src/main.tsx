import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import "./index.css";
import AppErrorBoundary from "./components/AppErrorBoundary";
import App from "./App.tsx";
import { SyncProvider } from "./lib/sync/SyncProvider.tsx";

const queryClient = new QueryClient();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AppErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <SyncProvider>
          <App />
        </SyncProvider>
      </BrowserRouter>
    </QueryClientProvider>
    </AppErrorBoundary>
  </StrictMode>,
);

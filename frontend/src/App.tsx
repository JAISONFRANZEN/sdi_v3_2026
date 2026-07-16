import React, { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { trpc, createTrpcClient } from "./lib/trpc";
import { AuthProvider } from "./lib/authContext";
import { useOnlineStatus } from "./lib/useOnlineStatus";
import Layout from "./components/Layout";
import SyncManager from "./components/SyncManager";
import ProfileSelectPage from "./pages/ProfileSelectPage";
import LoginPage from "./pages/LoginPage";
import NewInspectionPage from "./pages/NewInspectionPage";
import InspectionListPage from "./pages/InspectionListPage";
import InspectionDetailPage from "./pages/InspectionDetailPage";
import AnalyticsPage from "./pages/AnalyticsPage";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, refetchOnWindowFocus: false },
  },
});

function OfflineBanner() {
  const online = useOnlineStatus();
  if (online) return null;
  return (
    <div className="offline-banner">
      Você está offline. As inspeções serão salvas localmente e sincronizadas quando a conexão voltar.
    </div>
  );
}

function App() {
  const [trpcClient] = useState(createTrpcClient);

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <BrowserRouter>
            <SyncManager />
            <OfflineBanner />
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/" element={<ProfileSelectPage />} />
              <Route element={<Layout />}>
                <Route path="/checklist/:profileType/new" element={<NewInspectionPage />} />
                <Route path="/checklist/:profileType/inspections" element={<InspectionListPage />} />
                <Route
                  path="/checklist/:profileType/inspections/:id"
                  element={<InspectionDetailPage />}
                />
                <Route path="/checklist/:profileType/analytics" element={<AnalyticsPage />} />
              </Route>
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </QueryClientProvider>
    </trpc.Provider>
  );
}

export default App;

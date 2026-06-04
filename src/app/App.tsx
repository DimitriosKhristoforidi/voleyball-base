import { Navigate, Route, Routes } from "react-router-dom";

import { useAuth } from "@/lib/auth";
import { AppLayout } from "@/components/layout/AppLayout";
import { LoadingStateScreen } from "@/components/common/LoadingState";
import { lazy, Suspense } from "react";

const DashboardPage = lazy(() => import("@/pages/DashboardPage"));
const PlayersPage = lazy(() => import("@/pages/PlayersPage"));
const VenuesPage = lazy(() => import("@/pages/VenuesPage"));
const GamesPage = lazy(() => import("@/pages/GamesPage"));
const GameDetailPage = lazy(() => import("@/pages/GameDetailPage"));
const PublicGamePage = lazy(() => import("@/pages/PublicGamePage"));
const LoginPage = lazy(() => import("@/pages/LoginPage"));

export function App() {
  const { session, loading } = useAuth();

  return (
    <Suspense fallback={<LoadingStateScreen />}>
      <Routes>
        <Route path="/games/:id/view" element={<PublicGamePage />} />

        {loading ? (
          <Route path="*" element={<LoadingStateScreen />} />
        ) : !session ? (
          <>
            <Route path="/login" element={<LoginPage />} />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </>
        ) : (
          <Route element={<AppLayout />}>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/players" element={<PlayersPage />} />
            <Route path="/venues" element={<VenuesPage />} />
            <Route path="/games" element={<GamesPage />} />
            <Route path="/games/:id" element={<GameDetailPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        )}
      </Routes>
    </Suspense>
  );
}

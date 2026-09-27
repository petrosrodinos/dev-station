import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuthStore } from "@/stores/auth";
import { Routes } from "@/routes/routes";

interface ProtectedRouteProps {
    children: ReactNode;
    /** true: requires a session; false: only for signed-out users (auth pages). */
    loggedIn: boolean;
}

export default function ProtectedRoute({ children, loggedIn }: ProtectedRouteProps) {
    const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
    const location = useLocation();

    if (!isLoggedIn && loggedIn) {
        return <Navigate to={Routes.auth.sign_in} replace state={{ from: location.pathname + location.search }} />;
    }

    if (isLoggedIn && !loggedIn) {
        return <Navigate to={Routes.workspace.root} replace />;
    }

    return <>{children}</>;
}

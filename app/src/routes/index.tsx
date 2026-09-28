import { lazy, Suspense } from "react";
import { Navigate, Route, Routes as RouterRoutes } from "react-router-dom";
import { Routes, RoutePatterns } from "@/routes/routes";
import ProtectedRoute from "@/routes/protected-route";
import AuthLayout from "@/pages/auth/layout";
import SignIn from "@/pages/auth/pages/sign-in";
import SignUp from "@/pages/auth/pages/sign-up";
import WorkspaceLayout from "@/pages/workspace/layout";
import WorkspaceHomePage from "@/pages/workspace/pages/home";
import ProjectLayout from "@/pages/workspace/pages/project/layout";
import ProjectTabPage from "@/pages/workspace/pages/project";
import ProjectSetupPage from "@/pages/workspace/pages/project/pages/setup";
import LandingPage from "@/pages/landing";
import { Skeleton } from "@/components/ui/skeleton";
import { RequirePermission } from "@/components/access/require-permission";
import { PermissionKeys } from "@/features/organizations/interfaces/organizations.interfaces";
import { isDesktop } from "@/lib/desktop";
import { useAuthStore } from "@/stores/auth";

// Secondary screens are split out of the main bundle.
const SettingsPage = lazy(() => import("@/pages/workspace/pages/settings"));
const ImportedProjectsPage = lazy(() => import("@/pages/workspace/pages/imported"));
const AcceptInvitationPage = lazy(() => import("@/pages/invite"));

/**
 * Marketing landing page on the web. In the desktop app there's no one to market to —
 * skip straight to the workspace (or sign-in) once the persisted session has hydrated.
 */
function RootRoute() {
    const hydrated = useAuthStore((s) => s.hydrated);
    const isLoggedIn = useAuthStore((s) => Boolean(s.isLoggedIn && s.access_token));

    if (isDesktop()) {
        if (!hydrated) return null;
        return <Navigate to={isLoggedIn ? Routes.workspace.root : Routes.auth.sign_in} replace />;
    }

    return <LandingPage />;
}

const PageFallback = () => (
    <div className="flex flex-col gap-3 p-6">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-80" />
        <Skeleton className="mt-4 h-40 w-full" />
    </div>
);

export default function AppRoutes() {
    return (
        <Suspense fallback={<PageFallback />}>
            <RouterRoutes>
                <Route
                    path={RoutePatterns.auth}
                    element={
                        <ProtectedRoute loggedIn={false}>
                            <AuthLayout />
                        </ProtectedRoute>
                    }
                >
                    <Route path={RoutePatterns.sign_in} element={<SignIn />} />
                    <Route path={RoutePatterns.sign_up} element={<SignUp />} />
                    <Route index element={<Navigate to={Routes.auth.sign_in} replace />} />
                </Route>

                <Route
                    path={RoutePatterns.invite}
                    element={
                        <ProtectedRoute loggedIn>
                            <AcceptInvitationPage />
                        </ProtectedRoute>
                    }
                />

                <Route
                    path={RoutePatterns.workspace}
                    element={
                        <ProtectedRoute loggedIn>
                            <WorkspaceLayout />
                        </ProtectedRoute>
                    }
                >
                    <Route index element={<WorkspaceHomePage />} />
                    <Route
                        path={RoutePatterns.project}
                        element={
                            <RequirePermission permission={PermissionKeys.PROJECTS_VIEW}>
                                <ProjectLayout />
                            </RequirePermission>
                        }
                    >
                        <Route path={RoutePatterns.project_setup} element={<ProjectSetupPage />} />
                        <Route path={RoutePatterns.project_tab} element={<ProjectTabPage />} />
                        <Route index element={<ProjectTabPage />} />
                    </Route>
                    <Route path={RoutePatterns.imported} element={<ImportedProjectsPage />} />
                    <Route path={RoutePatterns.settings} element={<SettingsPage />} />
                    <Route path={RoutePatterns.settings_section} element={<SettingsPage />} />
                </Route>

                <Route path={Routes.root} element={<RootRoute />} />
                <Route path="*" element={<Navigate to={Routes.root} replace />} />
            </RouterRoutes>
        </Suspense>
    );
}

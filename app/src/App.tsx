import { BrowserRouter } from "react-router-dom";
import AppRoutes from "@/routes";
import QueryProvider from "@/components/providers/query-provider";
import { AuthGate } from "@/components/providers/auth-gate";
import { AppUpdateGate } from "@/components/providers/app-update-gate";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { RadixPointerEventsGuard } from "@/components/providers/radix-pointer-events-guard";
import ErrorBoundary from "@/components/ui/error-boundary";

function App() {
    return (
        <ErrorBoundary>
            <BrowserRouter>
                <QueryProvider>
                    <TooltipProvider delay={250}>
                        <AppUpdateGate>
                            <AuthGate>
                                <AppRoutes />
                            </AuthGate>
                        </AppUpdateGate>
                        <Toaster />
                        <RadixPointerEventsGuard />
                    </TooltipProvider>
                </QueryProvider>
            </BrowserRouter>
        </ErrorBoundary>
    );
}

export default App;

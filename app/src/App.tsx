import { BrowserRouter } from "react-router-dom";
import AppRoutes from "@/routes";
import QueryProvider from "@/components/providers/query-provider";
import { AuthGate } from "@/components/providers/auth-gate";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { RadixPointerEventsGuard } from "@/components/providers/radix-pointer-events-guard";
import ErrorBoundary from "@/components/ui/error-boundary";

function App() {
    return (
        <ErrorBoundary>
            <BrowserRouter>
                <QueryProvider>
                    <TooltipProvider delayDuration={250}>
                        <AuthGate>
                            <AppRoutes />
                        </AuthGate>
                        <Toaster />
                        <RadixPointerEventsGuard />
                    </TooltipProvider>
                </QueryProvider>
            </BrowserRouter>
        </ErrorBoundary>
    );
}

export default App;

import { Outlet } from "react-router-dom";
import { environments } from "@/config/environments";

export default function AuthLayout() {
  return (
    <div className="flex h-full flex-col bg-canvas">
      <div className="app-drag h-10 shrink-0" />
      <main className="flex flex-1 items-center justify-center overflow-y-auto p-4">
        <div className="w-full max-w-sm space-y-6">
          <div className="flex flex-col items-center gap-3 text-center">
            <span className="size-10 rounded-[10px] bg-gradient-to-br from-[#ff5757] to-[#a1131a]" aria-hidden />
            <div>
              <h1 className="text-xl font-semibold">{environments.APP_NAME}</h1>
              <p className="text-[0.8125rem] text-muted-foreground">Projects, processes, AI agents and Git — one workspace.</p>
            </div>
          </div>
          <Outlet />
        </div>
      </main>
    </div>
  );
}

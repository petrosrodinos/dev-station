import { useEffect, useRef, type FC } from "react";
import { Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { useAcceptInvitation } from "@/features/organizations/hooks/use-organizations";
import { Routes } from "@/routes/routes";

/** Deep link for invitations (`/invite?token=…`): accepts, then opens the organization. */
const AcceptInvitationPage: FC = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const accept = useAcceptInvitation();
  const token = params.get("token");
  const started = useRef(false);

  useEffect(() => {
    if (!token || started.current) return;
    started.current = true;
    accept.mutate(token, { onSettled: () => navigate(Routes.workspace.root, { replace: true }) });
  }, [token, accept, navigate]);

  if (!token) return <Navigate to={Routes.workspace.root} replace />;

  return (
    <div className="flex h-full items-center justify-center">
      <div className="w-72 space-y-3">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-4 w-full" />
      </div>
    </div>
  );
};

export default AcceptInvitationPage;

import { redirect } from "next/navigation";
import { Routes } from "@/routes/routes";

// Server-side redirect — no client mount/effect race with the layout's own auth check.
export default function AdminDashboardIndexPage() {
    redirect(Routes.admin.overview);
}

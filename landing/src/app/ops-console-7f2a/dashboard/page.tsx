"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Routes } from "@/routes/routes";

export default function AdminDashboardIndexPage() {
    const router = useRouter();
    useEffect(() => {
        router.replace(Routes.admin.overview);
    }, [router]);
    return null;
}

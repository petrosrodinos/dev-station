"use client";

import { format, parseISO } from "date-fns";
import { Panel, PanelBody, PanelHeader, StatRow } from "@/components/ui/panel";
import { CardGridSkeleton } from "@/components/ui/list-skeleton";
import { useAdminStats } from "@/features/admin/hooks/use-admin";

/** User growth & activity overview for the hidden admin console. */
export default function AdminOverviewPage() {
    const { data: stats, isPending } = useAdminStats();

    if (isPending || !stats) return <CardGridSkeleton />;

    const recentDays = stats.signups_last_30_days.slice(-14);

    return (
        <div className="grid gap-3 lg:grid-cols-2">
            <Panel>
                <PanelHeader title="Users" />
                <PanelBody>
                    <StatRow label="Total users" value={stats.total_users} />
                    <StatRow label="New this week" value={stats.new_users_this_week} />
                    <StatRow label="New this month" value={stats.new_users_this_month} />
                </PanelBody>
            </Panel>

            <Panel>
                <PanelHeader title="Activity" />
                <PanelBody>
                    <StatRow label="Active agent sessions" value={stats.active_agent_sessions} />
                </PanelBody>
            </Panel>

            <Panel className="lg:col-span-2">
                <PanelHeader title="Signups — last 14 days" />
                <PanelBody>
                    {recentDays.map((day) => (
                        <StatRow key={day.date} label={format(parseISO(day.date), "MMM d")} value={day.count} />
                    ))}
                </PanelBody>
            </Panel>
        </div>
    );
}

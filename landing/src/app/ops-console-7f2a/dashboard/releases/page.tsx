"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";
import { Panel, PanelBody, PanelHeader, StatRow } from "@/components/ui/panel";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CardGridSkeleton, ListSkeleton } from "@/components/ui/list-skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { useAdminInstallAdoption, useAdminReleases } from "@/features/admin/hooks/use-admin";
import type { AdminRelease } from "@/features/admin/interfaces/admin.interface";
import { formatDateTime } from "@/lib/date";
import { ReleaseLimitsDialog } from "./_components/release-limits-dialog";

/** Desktop distribution & version tracking (docs/electron-distribution-and-updates.md). */
export default function AdminReleasesPage() {
    const { data: releases, isPending: releasesPending } = useAdminReleases();
    const { data: adoption, isPending: adoptionPending } = useAdminInstallAdoption();
    const [editing, setEditing] = useState<AdminRelease | null>(null);

    return (
        <div className="space-y-4">
            {adoptionPending || !adoption ? (
                <CardGridSkeleton cards={3} />
            ) : (
                <div className="grid gap-3 lg:grid-cols-2">
                    <Panel>
                        <PanelHeader title="Device adoption" />
                        <PanelBody>
                            <StatRow label="Total devices" value={adoption.total_devices} />
                            <StatRow label="Active — last 7 days" value={adoption.active_last_7_days} />
                            <StatRow label="Active — last 30 days" value={adoption.active_last_30_days} />
                        </PanelBody>
                    </Panel>

                    <Panel>
                        <PanelHeader title="Installs by version" />
                        <PanelBody>
                            {adoption.by_version.length === 0 ? (
                                <EmptyState title="No pings yet" description="Devices report their version on every launch." />
                            ) : (
                                adoption.by_version.map((row) => (
                                    <StatRow key={`${row.platform}-${row.app_version}`} label={`${row.platform} · ${row.app_version}`} value={row.count} />
                                ))
                            )}
                        </PanelBody>
                    </Panel>
                </div>
            )}

            <Panel>
                <PanelHeader title="Releases" />
                <PanelBody className="p-0">
                    {releasesPending ? (
                        <ListSkeleton rows={2} className="p-4" />
                    ) : !releases || releases.length === 0 ? (
                        <EmptyState title="No releases published yet" description="Cut a tagged release for it to show up here." />
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Platform</TableHead>
                                    <TableHead>Version</TableHead>
                                    <TableHead>Min version</TableHead>
                                    <TableHead>Downloads</TableHead>
                                    <TableHead>Published</TableHead>
                                    <TableHead />
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {releases.map((release) => (
                                    <TableRow key={release.platform}>
                                        <TableCell className="font-medium">{release.platform}</TableCell>
                                        <TableCell>{release.version}</TableCell>
                                        <TableCell>
                                            {release.min_version ? <Badge variant="outline">{release.min_version}</Badge> : <span className="text-muted-foreground">none</span>}
                                        </TableCell>
                                        <TableCell>{release.download_count}</TableCell>
                                        <TableCell>{formatDateTime(release.published_at)}</TableCell>
                                        <TableCell>
                                            <Button variant="ghost" size="icon-sm" onClick={() => setEditing(release)}>
                                                <Pencil className="size-3.5" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </PanelBody>
            </Panel>

            <ReleaseLimitsDialog release={editing} onClose={() => setEditing(null)} />
        </div>
    );
}

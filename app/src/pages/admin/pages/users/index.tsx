import { useState, type FC } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";
import { ListSkeleton } from "@/components/ui/list-skeleton";
import { useAdminUsers } from "@/features/admin/hooks/use-admin";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { formatDateTime } from "@/lib/date";

const LIMIT = 30;

/** Searchable, paginated list of every user (Spec: admin console). */
const AdminUsersPage: FC = () => {
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);
    const debouncedSearch = useDebouncedValue(search, 300);
    const { data, isPending } = useAdminUsers({ search: debouncedSearch || undefined, page, limit: LIMIT });

    return (
        <div className="space-y-3">
            <Input
                placeholder="Search by email or name…"
                value={search}
                onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                }}
                className="max-w-xs"
            />

            {isPending ? (
                <ListSkeleton rows={8} />
            ) : !data || data.data.length === 0 ? (
                <EmptyState title="No users found" description="Try a different search." />
            ) : (
                <>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Email</TableHead>
                                <TableHead>Name</TableHead>
                                <TableHead>Role</TableHead>
                                <TableHead>Joined</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {data.data.map((user) => (
                                <TableRow key={user.id}>
                                    <TableCell>{user.email}</TableCell>
                                    <TableCell>{user.full_name ?? "—"}</TableCell>
                                    <TableCell>
                                        <Badge variant="outline">{user.role}</Badge>
                                    </TableCell>
                                    <TableCell>{formatDateTime(user.created_at)}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>

                    <div className="flex items-center justify-between">
                        <span className="text-[0.8125rem] text-muted-foreground">
                            {data.pagination.total} user{data.pagination.total === 1 ? "" : "s"}
                        </span>
                        <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm" disabled={!data.pagination.has_prev} onClick={() => setPage((p) => p - 1)}>
                                Previous
                            </Button>
                            <Button variant="outline" size="sm" disabled={!data.pagination.has_next} onClick={() => setPage((p) => p + 1)}>
                                Next
                            </Button>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default AdminUsersPage;

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useUpdateAdminReleaseLimits } from "@/features/admin/hooks/use-admin";
import type { AdminRelease } from "@/features/admin/interfaces/admin.interface";
import { ReleaseLimitsSchema, type ReleaseLimitsFormValues } from "../validation-schemas/release-limits";

interface ReleaseLimitsDialogProps {
    release: AdminRelease | null;
    onClose: () => void;
}

export function ReleaseLimitsDialog({ release, onClose }: ReleaseLimitsDialogProps) {
    const { mutate, isPending } = useUpdateAdminReleaseLimits();
    const form = useForm<ReleaseLimitsFormValues>({ resolver: zodResolver(ReleaseLimitsSchema), defaultValues: { min_version: "", release_notes: "" } });

    useEffect(() => {
        if (!release) return;
        form.reset({ min_version: release.min_version ?? "", release_notes: release.release_notes ?? "" });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [release]);

    const submit = (data: ReleaseLimitsFormValues) => {
        if (!release) return;
        mutate(
            { platform: release.platform, min_version: data.min_version ?? "", release_notes: data.release_notes ?? "" },
            { onSuccess: onClose },
        );
    };

    return (
        <Dialog open={!!release} onOpenChange={(next) => !next && onClose()}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>Edit {release?.platform} release</DialogTitle>
                    <DialogDescription>Installs below the minimum version are hard-blocked in-app. Leave it blank for no enforcement.</DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(submit)} className="flex flex-col gap-4">
                        <FormField
                            control={form.control}
                            name="min_version"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Minimum supported version</FormLabel>
                                    <FormControl>
                                        <Input placeholder="1.4.0" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="release_notes"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Release notes</FormLabel>
                                    <FormControl>
                                        <Textarea rows={4} {...field} />
                                    </FormControl>
                                    <FormDescription>Shown to users alongside the update prompt.</FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={onClose}>
                                Cancel
                            </Button>
                            <Button type="submit" loading={isPending}>
                                Save
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}

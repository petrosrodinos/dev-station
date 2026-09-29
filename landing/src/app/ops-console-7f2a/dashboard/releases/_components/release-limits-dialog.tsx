"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useUpdateAdminReleaseLimits } from "@/features/admin/hooks/use-admin";
import type { AdminRelease } from "@/features/admin/interfaces/admin.interface";
import { ReleaseLimitsSchema, type ReleaseLimitsFormValues } from "../_validation-schemas/release-limits";

interface ReleaseLimitsDialogProps {
    release: AdminRelease | null;
    onClose: () => void;
}

export function ReleaseLimitsDialog({ release, onClose }: ReleaseLimitsDialogProps) {
    const { mutate, isPending } = useUpdateAdminReleaseLimits();
    const {
        register,
        handleSubmit,
        reset,
        formState: { errors },
    } = useForm<ReleaseLimitsFormValues>({ resolver: zodResolver(ReleaseLimitsSchema), defaultValues: { min_version: "", release_notes: "" } });

    useEffect(() => {
        if (!release) return;
        reset({ min_version: release.min_version ?? "", release_notes: release.release_notes ?? "" });
    }, [release, reset]);

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
                <form onSubmit={handleSubmit(submit)} className="flex flex-col gap-4">
                    <div className="grid gap-1.5">
                        <Label htmlFor="min_version">Minimum supported version</Label>
                        <Input id="min_version" placeholder="1.4.0" {...register("min_version")} />
                        {errors.min_version && <p className="text-[0.8125rem] text-destructive">{errors.min_version.message}</p>}
                    </div>
                    <div className="grid gap-1.5">
                        <Label htmlFor="release_notes">Release notes</Label>
                        <Textarea id="release_notes" rows={4} {...register("release_notes")} />
                        <p className="text-[0.7813rem] text-muted-foreground">Shown to users alongside the update prompt.</p>
                        {errors.release_notes && <p className="text-[0.8125rem] text-destructive">{errors.release_notes.message}</p>}
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={onClose}>
                            Cancel
                        </Button>
                        <Button type="submit" loading={isPending}>
                            Save
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useCreateSkill, useUpdateSkill } from "@/features/skills/hooks/use-skills";
import type { CustomSkill } from "@/features/skills/interfaces/skills.interfaces";
import { SkillKindOptions, SkillProviderOptions } from "@/config/constants/dropdowns/skills/skill.options";
import { SkillKinds, SkillProviders } from "@shared/contract";
import { skillFormSchema, type SkillFormData } from "../validation-schemas/skill.schema";

const EMPTY: SkillFormData = { name: "", description: "", body: "", provider: SkillProviders.GENERIC, kind: SkillKinds.SKILL, is_public: true };

interface SkillDialogProps {
    /** The skill being edited; null means create. */
    skill: CustomSkill | null;
    /** Pre-fills a new skill's fields (e.g. "Save as custom" from a system-scanned skill). Ignored when `skill` is set. */
    initialValues?: Partial<SkillFormData>;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

/** Create or edit a custom skill, shared with the organization or kept private to its creator. */
export function SkillDialog({ skill, initialValues, open, onOpenChange }: SkillDialogProps) {
    const create = useCreateSkill();
    const update = useUpdateSkill();
    const busy = create.isPending || update.isPending;
    const form = useForm<SkillFormData>({ resolver: zodResolver(skillFormSchema), defaultValues: EMPTY });

    useEffect(() => {
        if (!open) return;
        form.reset(skill ? { name: skill.name, description: skill.description ?? "", body: skill.body, provider: skill.provider, kind: skill.kind, is_public: skill.is_public } : { ...EMPTY, ...initialValues });
    }, [open, skill, initialValues, form]);

    const onSubmit = (data: SkillFormData) => {
        const dto = { name: data.name, description: data.description || undefined, body: data.body, provider: data.provider, kind: data.kind, is_public: data.is_public };
        if (skill) update.mutate({ id: skill.id, ...dto }, { onSuccess: () => onOpenChange(false) });
        else create.mutate(dto, { onSuccess: () => onOpenChange(false) });
    };

    return (
        <Dialog open={open} onOpenChange={(o) => !busy && onOpenChange(o)}>
            <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{skill ? `Edit ${skill.name}` : initialValues ? "Save as custom skill" : "New skill"}</DialogTitle>
                    <DialogDescription>Choose below whether it's shared with your organization or kept private to you.</DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Name</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Conventional commits" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <div className="grid grid-cols-2 gap-3">
                            <FormField
                                control={form.control}
                                name="kind"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Kind</FormLabel>
                                        <Select value={field.value} onValueChange={field.onChange}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {SkillKindOptions.map((o) => (
                                                    <SelectItem key={o.id} value={o.id}>
                                                        {o.label}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="provider"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Provider</FormLabel>
                                        <Select value={field.value} onValueChange={field.onChange}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {SkillProviderOptions.map((o) => (
                                                    <SelectItem key={o.id} value={o.id}>
                                                        {o.label}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </FormItem>
                                )}
                            />
                        </div>
                        <FormField
                            control={form.control}
                            name="description"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Description (optional)</FormLabel>
                                    <FormControl>
                                        <Input placeholder="One line describing when to use this" {...field} value={field.value ?? ""} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="body"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Content</FormLabel>
                                    <FormControl>
                                        <Textarea rows={10} className="font-mono text-[0.7813rem]" placeholder="Write the skill's instructions here…" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="is_public"
                            render={({ field }) => (
                                <FormItem className="flex flex-row items-center justify-between rounded-md border p-2.5">
                                    <div className="space-y-0.5">
                                        <FormLabel className="text-[0.8125rem]">Share with organization</FormLabel>
                                        <p className="text-xs text-muted-foreground">{field.value ? "Everyone in your organization can see and use it." : "Only visible to you."}</p>
                                    </div>
                                    <FormControl>
                                        <Switch checked={field.value} onCheckedChange={field.onChange} aria-label="Share with organization" />
                                    </FormControl>
                                </FormItem>
                            )}
                        />
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
                                Cancel
                            </Button>
                            <Button type="submit" loading={busy}>
                                {skill ? "Save changes" : "Create skill"}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}

/** Linear priority numbers: 0 none, 1 urgent, 2 high, 3 medium, 4 low. */
export const LinearPriorityOptions: { id: string; label: string }[] = [
    { id: "0", label: "No priority" },
    { id: "1", label: "Urgent" },
    { id: "2", label: "High" },
    { id: "3", label: "Medium" },
    { id: "4", label: "Low" },
];

export function getLinearPriorityLabel(priority: number | null | undefined): string {
    return LinearPriorityOptions.find((o) => o.id === String(priority ?? 0))?.label ?? "No priority";
}

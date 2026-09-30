"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import { Bold, Italic, Link as LinkIcon, List, ListOrdered, Heading2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface RichTextEditorProps {
    value: string;
    onChange: (html: string) => void;
    placeholder?: string;
    className?: string;
}

/** Small Tiptap-based WYSIWYG editor — stores/emits HTML. Used for release notes. */
export function RichTextEditor({ value, onChange, placeholder, className }: RichTextEditorProps) {
    const editor = useEditor({
        immediatelyRender: false,
        extensions: [
            StarterKit,
            Link.configure({ openOnClick: false, HTMLAttributes: { rel: "noopener noreferrer", target: "_blank" } }),
            Placeholder.configure({ placeholder }),
        ],
        content: value,
        editorProps: {
            attributes: {
                class: "prose prose-sm max-w-none min-h-32 px-3 py-2 text-sm focus:outline-none [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_h2]:text-base [&_h2]:font-medium [&_a]:text-primary [&_a]:underline [&_p.is-editor-empty:first-child::before]:pointer-events-none [&_p.is-editor-empty:first-child::before]:float-left [&_p.is-editor-empty:first-child::before]:h-0 [&_p.is-editor-empty:first-child::before]:text-muted-foreground [&_p.is-editor-empty:first-child::before]:content-[attr(data-placeholder)]",
            },
        },
        onUpdate: ({ editor }) => onChange(editor.getHTML()),
    });

    if (!editor) return null;

    const toolbarButton = (active: boolean, onClick: () => void, icon: React.ReactNode, label: string) => (
        <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={label}
            className={cn(active && "bg-muted text-foreground")}
            onClick={onClick}
        >
            {icon}
        </Button>
    );

    return (
        <div className={cn("rounded-lg border border-input", className)}>
            <div className="flex items-center gap-0.5 border-b px-1.5 py-1">
                {toolbarButton(editor.isActive("bold"), () => editor.chain().focus().toggleBold().run(), <Bold className="size-3.5" />, "Bold")}
                {toolbarButton(editor.isActive("italic"), () => editor.chain().focus().toggleItalic().run(), <Italic className="size-3.5" />, "Italic")}
                {toolbarButton(editor.isActive("heading", { level: 2 }), () => editor.chain().focus().toggleHeading({ level: 2 }).run(), <Heading2 className="size-3.5" />, "Heading")}
                {toolbarButton(editor.isActive("bulletList"), () => editor.chain().focus().toggleBulletList().run(), <List className="size-3.5" />, "Bullet list")}
                {toolbarButton(editor.isActive("orderedList"), () => editor.chain().focus().toggleOrderedList().run(), <ListOrdered className="size-3.5" />, "Numbered list")}
                {toolbarButton(editor.isActive("link"), () => {
                    if (editor.isActive("link")) {
                        editor.chain().focus().unsetLink().run();
                        return;
                    }
                    const url = window.prompt("Link URL");
                    if (url) editor.chain().focus().setLink({ href: url }).run();
                }, <LinkIcon className="size-3.5" />, "Link")}
            </div>
            <EditorContent editor={editor} />
        </div>
    );
}

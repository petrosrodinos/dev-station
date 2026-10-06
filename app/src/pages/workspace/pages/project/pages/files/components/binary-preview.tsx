import { useEffect, useState } from "react";
import { ExternalLink, FolderSearch } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ListSkeleton } from "@/components/ui/list-skeleton";
import { useFileBinary, useOpenFileExternally, useRevealFile } from "@/features/files/hooks/use-files";
import { FilePreviewKinds } from "@shared/contract";
import { FileHeader, FileHeaderAction } from "./file-header";

/** Read-only viewer for images and PDFs. The bytes come over the desktop bridge and render from a blob URL that lives only while shown. */
export function BinaryPreview({ projectId, path }: { projectId: string; path: string }) {
  const { data, isPending, isError, error } = useFileBinary(projectId, path);
  const openExternally = useOpenFileExternally();
  const reveal = useRevealFile();
  const [url, setUrl] = useState<string | null>(null);
  const name = path.slice(path.lastIndexOf("/") + 1);

  useEffect(() => {
    if (!data) return;
    const objectUrl = URL.createObjectURL(new Blob([data.data], { type: data.mime }));
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [data]);

  const openAction = () => openExternally.mutate({ projectId, path });

  const actions = (
    <>
      <FileHeaderAction label="Open in default app" onClick={openAction}>
        <ExternalLink className="size-3.5" />
      </FileHeaderAction>
      <FileHeaderAction label="Reveal in file manager" onClick={() => reveal.mutate({ projectId, path })}>
        <FolderSearch className="size-3.5" />
      </FileHeaderAction>
    </>
  );

  let body;
  if (isPending || (data && !url)) body = <ListSkeleton rows={6} withIcon={false} />;
  else if (isError) {
    body = (
      <EmptyState
        title="Can't preview this file"
        description={error.message}
        action={
          <Button size="sm" variant="outline" className="h-7 gap-1.5 px-2.5 text-xs" onClick={openAction}>
            <ExternalLink className="size-3" />
            Open in default app
          </Button>
        }
      />
    );
  } else if (data?.kind === FilePreviewKinds.IMAGE) {
    body = (
      <div className="flex min-h-0 flex-1 items-center justify-center overflow-auto p-4">
        <img src={url!} alt={name} className="max-h-full max-w-full object-contain" />
      </div>
    );
  } else {
    body = <iframe src={url!} title={name} className="min-h-0 w-full flex-1 border-0" />;
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <FileHeader path={path} actions={actions} />
      {body}
    </div>
  );
}

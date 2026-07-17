import { SourceFileChip } from "./SourceFileChip";
import type { FileReference } from "./types";

interface RelatedFilesProps {
  files: FileReference[];
}

export function RelatedFiles({ files }: RelatedFilesProps) {
  if (files.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      {files.map((file) => (
        <SourceFileChip key={file.path} path={file.path} description={file.description} />
      ))}
    </div>
  );
}

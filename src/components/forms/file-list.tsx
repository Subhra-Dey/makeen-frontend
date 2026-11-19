'use client';

import { useMutation } from '@tanstack/react-query';
import { Download, FileUp, Trash2 } from 'lucide-react';
import { useId, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api/client';
import { downloadFile } from '@/lib/api/download';
import { formatDateTimeIst, formatNumber, type AttachmentRef } from '@/shared';

const MAX_BYTES = 10 * 1024 * 1024;

/**
 * Files of one record (FILE-1): name, size, who and when, a Download button, and — for people who
 * may change the record — Choose file / Remove. The server checks type and size again by content.
 */
interface FileListProps {
  files: readonly AttachmentRef[];
  /** e.g. `/api/audits/<id>/files` — upload is POST here; a file is `<baseUrl>/<fileId>`. */
  baseUrl: string | null;
  canUpload: boolean;
  /**
   * Receives the owner record exactly as the API returns it after the change. Each caller types
   * the parameter as its own record (AuditDetail, LicenceDetail, …), so it is declared `never` here.
   */
  onSaved: (updated: never) => void;
  accept?: string;
  hint?: string;
  typeMessage?: string;
  label?: string;
}

export function FileList({
  files,
  baseUrl,
  canUpload,
  onSaved,
  accept = '.pdf,.jpg,.jpeg,.png,.xlsx',
  hint = 'PDF, JPG, PNG or XLSX · max 10 MB',
  typeMessage = 'Upload a PDF, JPG, PNG or XLSX file of at most 10 MB.',
  label = 'Choose file',
}: FileListProps) {
  const input = useRef<HTMLInputElement>(null);
  const hintId = useId();
  const [error, setError] = useState<string | null>(null);
  const upload = useMutation({
    mutationFn: (file: File) => {
      const form = new FormData();
      form.append('file', file);
      return api<unknown>(baseUrl ?? '', { method: 'POST', form });
    },
    onSuccess: (saved) => {
      toast.success('File uploaded.');
      setError(null);
      onSaved(saved as never);
    },
    onError: (e) => {
      setError(e instanceof Error ? e.message : typeMessage);
    },
  });
  const remove = useMutation({
    mutationFn: (fileId: string) =>
      api<unknown>(`${baseUrl ?? ''}/${fileId}`, { method: 'DELETE' }),
    onSuccess: (saved) => {
      toast.success('File removed.');
      onSaved(saved as never);
    },
    onError: (e) => {
      toast.error(e instanceof Error ? e.message : 'Something went wrong.');
    },
  });

  return (
    <div className="flex min-w-0 flex-col gap-2.5">
      {baseUrl && canUpload && (
        <div className="flex flex-wrap items-center gap-2.5">
          <input
            ref={input}
            type="file"
            accept={accept}
            aria-label={label}
            aria-describedby={hintId}
            className="sr-only"
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = '';
              if (!file) return;
              if (file.size === 0 || file.size > MAX_BYTES) {
                setError(typeMessage);
                return;
              }
              upload.mutate(file);
            }}
          />
          <Button
            busy={upload.isPending}
            icon={<FileUp aria-hidden="true" className="size-4" />}
            onClick={() => input.current?.click()}
          >
            {label}
          </Button>
          <span id={hintId} className="text-[12px] text-[#5B6576]">
            {hint}
          </span>
        </div>
      )}
      {!baseUrl && <span className="text-[13px] text-muted">Save first, then add files.</span>}
      {error && (
        <span role="alert" className="text-[12px] font-medium text-danger-text">
          {error}
        </span>
      )}
      {files.length === 0 && baseUrl && (
        <span className="text-[13px] text-muted">No files yet</span>
      )}
      {files.length > 0 && (
        <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
          {files.map((a) => (
            <li
              key={a.id}
              className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 rounded-[9px] border border-line px-3 py-2 text-[13px]"
            >
              <b className="min-w-0 break-all">{a.fileName}</b>
              <span className="text-muted num">
                {formatNumber(Math.max(1, Math.round(a.sizeBytes / 1024)), 0)} KB ·{' '}
                {a.uploadedBy.name} · {formatDateTimeIst(new Date(a.uploadedAt))}
              </span>
              <span className="ml-auto flex gap-2">
                <Button
                  size="sm"
                  icon={<Download aria-hidden="true" className="size-4" />}
                  aria-label={`Download ${a.fileName}`}
                  onClick={() => {
                    downloadFile(`${baseUrl ?? ''}/${a.id}`, a.fileName).catch((e: unknown) => {
                      toast.error(e instanceof Error ? e.message : 'The download failed.');
                    });
                  }}
                >
                  Download
                </Button>
                {canUpload && (
                  <Button
                    size="sm"
                    variant="danger"
                    busy={remove.isPending && remove.variables === a.id}
                    icon={<Trash2 aria-hidden="true" className="size-4" />}
                    aria-label={`Remove ${a.fileName}`}
                    onClick={() => {
                      remove.mutate(a.id);
                    }}
                  >
                    Remove
                  </Button>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

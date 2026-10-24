import React, { useState, useRef } from 'react';
import { UploadCloud, Loader2, AlertCircle } from 'lucide-react';

export interface AttachmentUploadProps {
  onUpload: (file: File) => Promise<void>;
  uploading?: boolean;
  maxSizeBytes?: number;
}

export const AttachmentUpload: React.FC<AttachmentUploadProps> = ({
  onUpload,
  uploading = false,
  maxSizeBytes = 10 * 1024 * 1024, // 10MB default
}) => {
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    setError(null);
    if (file.size > maxSizeBytes) {
      const maxMb = Math.round(maxSizeBytes / (1024 * 1024));
      setError(`File exceeds maximum size limit of ${maxMb}MB.`);
      return;
    }

    try {
      await onUpload(file);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to upload file.');
      }
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      await handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      await handleFile(e.target.files[0]);
    }
  };

  return (
    <div className="space-y-2">
      {error && (
        <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all ${
          dragActive
            ? 'border-emerald-500 bg-emerald-500/10'
            : 'border-slate-800 hover:border-emerald-500/50 bg-slate-950/40 hover:bg-slate-900/60'
        } ${uploading ? 'pointer-events-none opacity-60' : ''}`}
      >
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={handleChange}
          disabled={uploading}
        />

        <div className="flex flex-col items-center justify-center gap-1.5 text-xs">
          {uploading ? (
            <>
              <Loader2 className="w-6 h-6 text-emerald-400 animate-spin" />
              <span className="text-slate-300 font-medium">Uploading attachment...</span>
            </>
          ) : (
            <>
              <UploadCloud className="w-6 h-6 text-slate-400 group-hover:text-emerald-400 transition-colors" />
              <div className="text-slate-300 font-medium">
                <span className="text-emerald-400 hover:underline">Click to upload</span> or drag and drop
              </div>
              <p className="text-[10px] text-slate-500">
                Any file up to {Math.round(maxSizeBytes / (1024 * 1024))}MB
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default AttachmentUpload;

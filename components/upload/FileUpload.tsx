"use client";

import { useCallback, useRef, useState } from "react";
import { parseReviewsCsv } from "@/lib/csv-parser";
import type { RawReview } from "@/lib/types";
import Icon from "@/components/ui/Icon";

interface FileUploadProps {
  onParseStart?: () => void;
  onParsed: (reviews: RawReview[]) => void;
  onError: (message: string) => void;
  disabled?: boolean;
  compact?: boolean;
  variant?: "compact" | "import";
}

export default function FileUpload({
  onParseStart,
  onParsed,
  onError,
  disabled = false,
  compact = false,
  variant,
}: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const processFile = useCallback(
    (file: File) => {
      if (disabled) return;
      if (!file.name.toLowerCase().endsWith(".csv")) {
        onError("Please upload a .csv file.");
        return;
      }

      setSelectedFile(file);
      onParseStart?.();

      const reader = new FileReader();
      reader.onload = () => {
        const text = reader.result;
        if (typeof text !== "string") {
          onError("Failed to read file contents.");
          return;
        }

        const result = parseReviewsCsv(text, file.name);
        if (result.success) {
          onParsed(result.reviews);
        } else {
          onError(result.error);
        }
      };
      reader.onerror = () => {
        onError("Failed to read file.");
      };
      reader.readAsText(file);
    },
    [disabled, onParseStart, onParsed, onError],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) processFile(file);
    },
    [processFile],
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) processFile(file);
    },
    [processFile],
  );

  if (variant === "import") {
    return (
      <div className="w-full">
        <div
          role="button"
          tabIndex={0}
          onClick={() => !disabled && inputRef.current?.click()}
          onKeyDown={(e) => {
            if (disabled) return;
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              inputRef.current?.click();
            }
          }}
          onDragOver={disabled ? undefined : handleDragOver}
          onDragLeave={disabled ? undefined : handleDragLeave}
          onDrop={disabled ? undefined : handleDrop}
          className={`group flex cursor-pointer items-center justify-center gap-4 rounded-xl border-2 border-dashed px-4 py-4 transition-colors ${
            disabled
              ? "cursor-not-allowed border-outline-variant bg-surface-container-lowest opacity-60"
              : isDragging
                ? "border-primary bg-surface-container-low"
                : "border-outline-variant bg-surface-container-lowest hover:bg-surface-container-low"
          }`}
        >
          <div
            className={`rounded-full p-2 transition-transform ${
              isDragging
                ? "bg-primary text-on-primary"
                : "bg-primary-fixed text-primary group-hover:scale-110"
            }`}
          >
            <Icon name="upload_file" />
          </div>
          <div className="text-left">
            <p className="text-sm font-semibold text-on-surface">
              {selectedFile ? selectedFile.name : "Upload .CSV or .JSON"}
            </p>
            <p className="text-xs text-on-surface-variant">
              {selectedFile
                ? "Click to replace file"
                : "Max file size 25MB. System parses headers automatically."}
            </p>
          </div>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept=".csv"
          disabled={disabled}
          onChange={handleInputChange}
          className="hidden"
          aria-label="Upload CSV file"
        />
      </div>
    );
  }

  if (compact) {
    return (
      <div className="h-full w-full">
        <div
          role="button"
          tabIndex={0}
          onClick={() => !disabled && inputRef.current?.click()}
          onKeyDown={(e) => {
            if (disabled) return;
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              inputRef.current?.click();
            }
          }}
          onDragOver={disabled ? undefined : handleDragOver}
          onDragLeave={disabled ? undefined : handleDragLeave}
          onDrop={disabled ? undefined : handleDrop}
          className={`group flex h-full min-h-[88px] items-center gap-3 rounded-lg border border-dashed px-3 py-3 transition-all ${
            disabled
              ? "cursor-not-allowed border-outline-variant bg-surface-container-lowest opacity-60"
              : isDragging
                ? "cursor-pointer border-primary bg-primary/5"
                : "cursor-pointer border-outline-variant bg-surface-container-lowest hover:border-primary/50 hover:bg-surface-container-low"
          }`}
        >
          <div
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
              isDragging
                ? "bg-primary text-on-primary"
                : "bg-primary/10 text-primary"
            }`}
          >
            <Icon name="upload_file" className="text-lg" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-on-surface">
              Upload CSV
            </p>
            <p className="truncate text-[11px] text-on-surface-variant">
              {selectedFile ? selectedFile.name : "Drop file or click to browse"}
            </p>
          </div>
          <Icon name="chevron_right" className="shrink-0 text-sm text-on-surface-variant" />
        </div>
        <input
          ref={inputRef}
          type="file"
          accept=".csv"
          disabled={disabled}
          onChange={handleInputChange}
          className="hidden"
          aria-label="Upload CSV file"
        />
      </div>
    );
  }

  return (
    <div className="w-full">
      <div
        role="button"
        tabIndex={0}
        onClick={() => !disabled && inputRef.current?.click()}
        onKeyDown={(e) => {
          if (disabled) return;
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        onDragOver={disabled ? undefined : handleDragOver}
        onDragLeave={disabled ? undefined : handleDragLeave}
        onDrop={disabled ? undefined : handleDrop}
        className={`group flex flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-14 transition-all duration-300 ${
          disabled
            ? "cursor-not-allowed border-outline-variant bg-surface-container-lowest opacity-60"
            : isDragging
              ? "scale-[1.01] cursor-pointer border-primary bg-primary-fixed"
              : "cursor-pointer border-outline-variant bg-surface-container-lowest hover:border-primary hover:bg-primary-fixed/50"
        }`}
      >
        <div
          className={`mb-4 flex h-14 w-14 items-center justify-center rounded-full transition-all duration-300 ${
            isDragging
              ? "bg-primary text-on-primary"
              : "bg-primary/10 text-primary group-hover:scale-110 group-hover:bg-primary group-hover:text-on-primary"
          }`}
        >
          <Icon name="cloud_upload" className="text-[28px] leading-none" />
        </div>
        <p className="text-base font-semibold text-on-surface">
          Drop your CSV here, or click to browse
        </p>
        <p className="mt-2 max-w-sm text-center text-sm text-on-surface-variant">
          Supports Spotify, App Store, Play Store, and Reddit review exports
        </p>
        {selectedFile && (
          <p className="mt-4 flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-xs font-medium text-primary">
            <Icon name="description" className="text-sm" />
            {selectedFile.name}
          </p>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept=".csv"
        disabled={disabled}
        onChange={handleInputChange}
        className="hidden"
        aria-label="Upload CSV file"
      />
    </div>
  );
}

"use client";

import { useCallback, useRef, useState } from "react";
import { parseReviewsCsv } from "@/lib/csv-parser";
import type { RawReview } from "@/lib/types";
import Icon from "@/components/ui/Icon";

interface FileUploadProps {
  onParseStart?: () => void;
  onParsed: (reviews: RawReview[]) => void;
  onError: (message: string) => void;
}

export default function FileUpload({
  onParseStart,
  onParsed,
  onError,
}: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const processFile = useCallback(
    (file: File) => {
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
    [onParseStart, onParsed, onError],
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

  return (
    <div className="w-full">
      <div
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`group flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-14 transition-all duration-300 ${
          isDragging
            ? "scale-[1.01] border-primary bg-primary-fixed"
            : "border-outline-variant bg-surface-container-lowest hover:border-primary hover:bg-primary-fixed/50"
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
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          {["Spotify", "App Store", "Play Store", "Reddit"].map((source) => (
            <span
              key={source}
              className="rounded bg-surface-container-high px-2 py-1 text-[10px] font-medium uppercase tracking-wide text-on-surface-variant"
            >
              {source}
            </span>
          ))}
        </div>
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
        onChange={handleInputChange}
        className="hidden"
        aria-label="Upload CSV file"
      />
    </div>
  );
}

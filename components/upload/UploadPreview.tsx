"use client";

import { useState } from "react";
import type { RawReview } from "@/lib/types";
import Icon from "@/components/ui/Icon";
import SourceBadge from "@/components/ui/SourceBadge";

const PREVIEW_LIMIT = 5;
const TEXT_TRUNCATE = 120;

function truncateText(text: string): string {
  if (text.length <= TEXT_TRUNCATE) return text;
  return `${text.slice(0, TEXT_TRUNCATE)}…`;
}

interface UploadPreviewProps {
  reviews: RawReview[];
}

export default function UploadPreview({ reviews }: UploadPreviewProps) {
  const [expanded, setExpanded] = useState(false);
  const hasMore = reviews.length > PREVIEW_LIMIT;
  const visible = expanded ? reviews : reviews.slice(0, PREVIEW_LIMIT);

  return (
    <div className="overflow-hidden rounded-xl border border-outline-variant">
      <table className="w-full table-fixed text-left text-sm">
        <thead className="border-b border-outline-variant bg-surface-container-low text-[10px] font-medium uppercase tracking-widest text-on-surface-variant">
          <tr>
            <th className="w-28 px-4 py-3">Source</th>
            <th className="px-4 py-3">Review</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-outline-variant/50">
          {visible.map((review, index) => (
            <tr
              key={`${review.source}-${index}`}
              className="bg-surface-container-lowest transition-colors hover:bg-surface-container-low"
            >
              <td className="px-4 py-3 align-top">
                <SourceBadge source={review.source} />
              </td>
              <td className="min-w-0 break-words px-4 py-3 text-on-surface-variant">
                {truncateText(review.text)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {hasMore && (
        <button
          type="button"
          onClick={() => setExpanded((prev) => !prev)}
          className="flex w-full items-center justify-between border-t border-outline-variant bg-surface-container-low px-4 py-2.5 text-xs font-medium text-primary transition-colors hover:bg-surface-container"
        >
          <span>
            {expanded
              ? `Showing all ${reviews.length} reviews`
              : `Showing ${PREVIEW_LIMIT} of ${reviews.length} reviews`}
          </span>
          <Icon
            name={expanded ? "keyboard_arrow_up" : "keyboard_arrow_down"}
            className="text-lg"
          />
        </button>
      )}
    </div>
  );
}

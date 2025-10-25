"use client";
import { forwardRef } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import type { ImageCapture } from "@/lib/psn";
import { cn } from "@/lib/utils";

export const ImageCaptureCard = forwardRef<
  HTMLDivElement,
  {
    capture: ImageCapture;
    className?: string;
    isSelected?: boolean;
    showCheckbox?: boolean;
    onToggleSelection?: () => void;
    tabIndex?: number;
    onFocus?: () => void;
  }
>(function ImageCaptureCard(
  {
    capture,
    className,
    isSelected = false,
    showCheckbox = false,
    onToggleSelection,
    tabIndex,
    onFocus,
  },
  ref,
) {
  const handleDownload = () => {
    if (!capture.screenshotUrl) return;
    const url = `/api/captures/download?url=${encodeURIComponent(capture.screenshotUrl)}`;
    window.location.href = url;
  };

  return (
    // biome-ignore lint/a11y/useSemanticElements: Card hover interaction for selecting
    <div
      ref={ref}
      tabIndex={tabIndex}
      onFocus={onFocus}
      role="button"
      className={cn(
        "group relative overflow-hidden border bg-card focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 cursor-pointer",
        isSelected && "ring-2 ring-primary ring-offset-2",
        className,
      )}
      onClick={onToggleSelection}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onToggleSelection?.();
        }
      }}
    >
      {/* Selection checkbox - only show when selection mode is active */}
      {showCheckbox && (
        <div className="absolute top-2 left-2 z-10">
          <Checkbox
            checked={isSelected}
            onCheckedChange={() => onToggleSelection?.()}
            onClick={(e) => e.stopPropagation()}
            className="bg-background/80 backdrop-blur-sm border-2"
          />
        </div>
      )}

      {capture.preview ? (
        <div className="relative w-full">
          <div className="aspect-video relative">
            <img
              style={{ objectFit: "cover" }}
              src={`/api/captures/preview?url=${encodeURIComponent(capture.preview)}`}
              alt={capture.title || "Capture"}
              referrerPolicy="no-referrer"
            />
          </div>

          {/* Dark overlay on hover */}
          <div className="absolute inset-0 bg-transparent group-hover:bg-card/50 transition-colors duration-200" />

          <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex gap-2">
            <Button
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                handleDownload();
              }}
              className="bg-white text-black hover:bg-gray-100 text-xs font-semibold border-0 cursor-pointer"
            >
              Download
            </Button>
          </div>
        </div>
      ) : (
        <div className="w-full aspect-video bg-muted flex items-center justify-center text-xs text-muted-foreground border">
          No preview
        </div>
      )}
    </div>
  );
});

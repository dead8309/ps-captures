"use client";
import { Button } from "@/components/ui/button";
import type { ImageCapture } from "@/lib/psn";
import { cn } from "@/lib/utils";

export function ImageCaptureCard({
  capture,
  className,
}: {
  capture: ImageCapture;
  className?: string;
}) {
  const handleDownload = () => {
    if (!capture.screenshotUrl) return;
    const url = `/api/download?url=${encodeURIComponent(capture.screenshotUrl)}`;
    window.location.href = url;
  };

  return (
    <div
      className={cn("group relative overflow-hidden border bg-card", className)}
    >
      {capture.preview ? (
        <div className="relative w-full">
          <div className="aspect-video relative">
            <img
              style={{ objectFit: "cover" }}
              src={`/api/preview?url=${encodeURIComponent(capture.preview)}`}
              alt={capture.title || "Capture"}
              referrerPolicy="no-referrer"
            />
          </div>

          {/* Dark overlay on hover */}
          <div className="absolute inset-0 bg-transparent group-hover:bg-card/50 transition-colors duration-200" />

          <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <Button
              size="sm"
              onClick={handleDownload}
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
}

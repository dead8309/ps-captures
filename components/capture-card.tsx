"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Capture } from "@/lib/psn";

function formatDuration(seconds: number | null | undefined): string {
  if (!seconds) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export function CaptureCard({
  capture,
  className,
}: {
  capture: Capture;
  className?: string;
}) {
  const [isHovered, setIsHovered] = useState(false);
  const [videoLoading, setVideoLoading] = useState(false);
  const handleDownload = () => {
    let u;
    switch (capture.type) {
      case "video":
        if (!capture.downloadUrl) return;
        u = `/api/download?url=${encodeURIComponent(capture.downloadUrl)}`;
        break;
      case "image":
        if (!capture.screenshotUrl) return;
        u = `/api/download?url=${encodeURIComponent(capture.screenshotUrl)}`;
    }
    window.location.href = u;
  };

  const isVideo = capture.type === "video";

  const handleMouseEnter = () => {
    setIsHovered(true);
    if (isVideo) {
      setVideoLoading(true);
    }
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    setVideoLoading(false);
  };

  return (
    <div
      className={cn("group relative overflow-hidden border bg-card", className)}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {capture.preview ? (
        <div className="relative w-full">
          <div className="aspect-video relative">
            {isVideo && isHovered ? (
              <>
                <video
                  poster={`/api/preview?url=${encodeURIComponent(capture.preview)}`}
                  src={
                    capture.type === "video"
                      ? `/api/download?url=${encodeURIComponent(capture.downloadUrl!)}`
                      : undefined
                  }
                  className="w-full h-full object-cover"
                  muted
                  loop
                  autoPlay
                  playsInline
                  onCanPlay={() => setVideoLoading(false)}
                />
                {videoLoading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-card/50">
                    <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  </div>
                )}
              </>
            ) : (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={`/api/preview?url=${encodeURIComponent(capture.preview)}`}
                alt={capture.title || "Capture"}
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            )}
          </div>

          {capture.type === "video" && capture.duration && (
            <div className="absolute top-2 left-2 flex items-center gap-1.5 bg-card/80 border px-2 py-1 text-muted-foreground text-xs font-semibold">
              <svg className="w-3 h-3 fill-current" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
              <span>{formatDuration(capture.duration)}</span>
            </div>
          )}

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

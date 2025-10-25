"use client";
import Hls from "hls.js";
import { PlayIcon } from "lucide-react";
import { forwardRef, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import type { VideoCapture } from "@/lib/psn";
import { cn } from "@/lib/utils";
import { Spinner } from "./ui/spinner";

function formatDuration(seconds: number | null | undefined): string {
  if (!seconds) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export const VideoCaptureCard = forwardRef<
  HTMLDivElement,
  {
    capture: VideoCapture;
    className?: string;
    isSelected?: boolean;
    showCheckbox?: boolean;
    onToggleSelection?: () => void;
    tabIndex?: number;
    onFocus?: () => void;
  }
>(function VideoCaptureCard(
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
  const [isHovered, setIsHovered] = useState(false);
  const [videoLoading, setVideoLoading] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const handleDownload = () => {
    if (!capture.downloadUrl) return;
    const url = `/api/captures/download?url=${encodeURIComponent(capture.downloadUrl)}`;
    window.location.href = url;
  };

  useEffect(() => {
    if (!isHovered || !videoRef.current || !capture.videoUrl) return;

    const video = videoRef.current;
    const url = `/api/captures/stream?url=${encodeURIComponent(capture.videoUrl)}`;

    if (Hls.isSupported()) {
      const hls = new Hls();
      hls.loadSource(url);
      hls.attachMedia(video);
      hls.on(Hls.Events.ERROR, (_, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              console.log("Network error, attempting to recover...");
              hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              console.log("Media error, attempting to recover...");
              hls.recoverMediaError();
              break;
            default:
              console.error("Fatal HLS error, stopping playback");
              setVideoLoading(false);
              break;
          }
        }
      });

      const onCanPlay = () => {
        setVideoLoading(false);
        video.removeEventListener("canplay", onCanPlay);
      };
      video.addEventListener("canplay", onCanPlay);
      return () => {
        hls.destroy();
      };
    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = url;
      const onCanPlay = () => setVideoLoading(false);
      const onError = () => setVideoLoading(false);
      video.addEventListener("canplay", onCanPlay);
      video.addEventListener("error", onError);
      return () => {
        video.removeEventListener("canplay", onCanPlay);
        video.removeEventListener("error", onError);
      };
    } else {
      console.error("HLS not supported");
      setVideoLoading(false);
    }
  }, [isHovered, capture.videoUrl]);

  const handleMouseEnter = () => {
    setIsHovered(true);
    setVideoLoading(true);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    setVideoLoading(false);
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
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={onToggleSelection}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onToggleSelection?.();
        }
      }}
    >
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
            {isHovered ? (
              <>
                <video
                  ref={videoRef}
                  poster={`/api/captures/preview?url=${encodeURIComponent(capture.preview)}`}
                  className="w-full h-full object-cover"
                  muted
                  loop
                  autoPlay
                  playsInline
                />
                {videoLoading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-card/50">
                    <Spinner className="size-6" />
                  </div>
                )}
              </>
            ) : (
              <img
                style={{ objectFit: "cover" }}
                src={`/api/captures/preview?url=${encodeURIComponent(capture.preview)}`}
                alt={capture.title || "Capture"}
                referrerPolicy="no-referrer"
              />
            )}
          </div>

          {capture.duration && (
            <div className="absolute top-2 left-2 flex items-center gap-1.5 bg-card/80 border px-2 py-1 text-muted-foreground text-xs font-semibold">
              <PlayIcon className="w-3 h-3" />
              <span>{formatDuration(capture.duration)}</span>
            </div>
          )}

          {/* Dark overlay on hover */}
          <div className="absolute inset-0 bg-transparent group-hover:bg-card/50 transition-colors duration-200" />

          <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
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

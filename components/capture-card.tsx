"use client";
import Hls from "hls.js";
import { PlayIcon } from "lucide-react";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import type { Capture } from "@/lib/psn";
import { cn } from "@/lib/utils";

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
  const videoRef = useRef<HTMLVideoElement>(null);
  const handleDownload = () => {
    let u: string;
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

  useEffect(() => {
    if (!isVideo || !isHovered || !videoRef.current) return;

    if (!capture.videoUrl) return;

    const video = videoRef.current;
    const url = `/api/stream?url=${encodeURIComponent(capture.videoUrl)}`;

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
      // Safari native HLS
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
  }, [isHovered, isVideo, capture.videoUrl]);

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: Card hover interaction for video preview
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
                  ref={videoRef}
                  poster={`/api/preview?url=${encodeURIComponent(capture.preview)}`}
                  className="w-full h-full object-cover"
                  muted
                  loop
                  autoPlay
                  playsInline
                />
                {videoLoading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-card/50">
                    <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  </div>
                )}
              </>
            ) : (
              <Image
                fill
                style={{ objectFit: "cover" }}
                src={`/api/preview?url=${encodeURIComponent(capture.preview)}`}
                alt={capture.title || "Capture"}
                referrerPolicy="no-referrer"
              />
            )}
          </div>

          {capture.type === "video" && capture.duration && (
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

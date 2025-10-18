"use client"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export type Capture = {
  id: string
  title: string
  game: string | null
  fileType: string | null
  preview: string | null
  downloadUrl: string | null
  createdAt: string | null
  duration?: number | null
  titleImageUrl?: string | null
}

function formatDuration(seconds: number | null | undefined): string {
  if (!seconds) return "0:00"
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, "0")}`
}

export function CaptureCard({
  capture,
  className,
}: {
  capture: Capture
  className?: string
}) {
  const handleDownload = () => {
    if (!capture.downloadUrl) return
    const u = `/api/download?url=${encodeURIComponent(capture.downloadUrl)}`
    window.location.href = u
  }

  return (
    <div className={cn("group relative overflow-hidden border border-gray-700 bg-black", className)}>
      {capture.preview ? (
        <div className="relative w-full">
          <div className="aspect-video">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/api/preview?url=${encodeURIComponent(capture.preview)}`}
              alt={capture.title || "Capture"}
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          </div>

          {capture.duration && (
            <div className="absolute top-2 left-2 flex items-center gap-1.5 bg-black/80 border border-gray-600 px-2 py-1 text-gray-300 text-xs font-semibold">
              <svg className="w-3 h-3 fill-current" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
              <span>{formatDuration(capture.duration)}</span>
            </div>
          )}

          {/* Dark overlay on hover */}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-colors duration-200" />

          <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <Button
              size="sm"
              onClick={handleDownload}
              className="bg-white text-black hover:bg-gray-100 text-xs font-semibold border-0"
            >
              Download
            </Button>
          </div>
        </div>
      ) : (
        <div className="w-full aspect-video bg-gray-900 flex items-center justify-center text-xs text-gray-600 border border-gray-700">
          No preview
        </div>
      )}
    </div>
  )
}

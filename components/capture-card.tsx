"use client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"

export type Capture = {
  id: string
  title: string
  game: string | null
  fileType: string | null
  preview: string | null
  downloadUrl: string | null
  createdAt: string | null
}

export function CaptureCard({ capture, className }: { capture: Capture; className?: string }) {
  const handleDownload = () => {
    if (!capture.downloadUrl) return
    const u = `/api/download?url=${encodeURIComponent(capture.downloadUrl)}`
    // Navigate to start download
    window.location.href = u
  }

  return (
    <Card className={cn("overflow-hidden border-border hover:shadow-md transition-shadow", className)}>
      <CardContent className="p-0">
        {capture.preview ? (
          <div className="relative w-full aspect-video bg-muted">
            {/* Proxy the preview image to include CloudFront cookies */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/api/preview?url=${encodeURIComponent(capture.preview)}`}
              alt="Capture preview"
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          </div>
        ) : (
          <div className="w-full aspect-video bg-muted flex items-center justify-center text-xs text-muted-foreground">
            {"No preview available"}
          </div>
        )}
        <div className="p-3">
          <h3 className="text-sm font-medium text-pretty line-clamp-2 mb-1">{capture.title || "Capture"}</h3>
          <p className="text-xs text-muted-foreground mb-2">{capture.game || "Unknown Game"}</p>
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              {capture.createdAt ? new Date(capture.createdAt).toLocaleDateString() : ""}
            </span>
            <Button size="sm" variant="outline" onClick={handleDownload}>
              {"Download"}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

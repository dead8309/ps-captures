import { BoxSelectIcon, HelpCircleIcon, ImageIcon, XIcon } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Kbd, KbdGroup } from "@/components/ui/kbd";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { Capture } from "@/lib/psn";
import { ImageCaptureCard } from "./image-capture";
import { VideoCaptureCard } from "./video-capture";

export function CapturesGallery({ captures }: { captures: Capture[] }) {
  const [selectedCaptures, setSelectedCaptures] = useState<Set<string>>(
    new Set(),
  );
  const [focusedIndex, setFocusedIndex] = useState<number>(-1);
  const captureRefs = useRef<(HTMLDivElement | null)[]>([]);

  const groupedCaptures = useMemo(() => {
    if (!captures.length) return {};
    return captures.reduce((acc: Record<string, Capture[]>, capture) => {
      const game = capture.game || "Unknown Game";
      if (!acc[game]) acc[game] = [];
      acc[game].push(capture);
      return acc;
    }, {});
  }, [captures]);

  const allCaptures = useMemo(() => {
    return Object.values(groupedCaptures).flat();
  }, [groupedCaptures]);

  // Initialize refs array when captures change
  useEffect(() => {
    captureRefs.current = new Array(allCaptures.length).fill(null);
  }, [allCaptures.length]);

  const isSelected = useCallback(
    (captureId: string) => selectedCaptures.has(captureId),
    [selectedCaptures],
  );

  const toggleSelection = useCallback((captureId: string) => {
    setSelectedCaptures((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(captureId)) {
        newSet.delete(captureId);
      } else {
        newSet.add(captureId);
      }
      return newSet;
    });
  }, []);

  const selectAll = useCallback(() => {
    setSelectedCaptures(new Set(allCaptures.map((c) => c.id)));
  }, [allCaptures]);

  const deselectAll = useCallback(() => {
    setSelectedCaptures(new Set());
  }, []);

  const handleBulkDownload = useCallback(async () => {
    if (selectedCaptures.size === 0) return;

    const selectedItems = allCaptures.filter((c) => selectedCaptures.has(c.id));
    let successCount = 0;
    let failCount = 0;

    toast.loading(`Downloading ${selectedCaptures.size} captures...`);

    for (const capture of selectedItems) {
      try {
        const url =
          capture.type === "video"
            ? `/api/captures/download?url=${encodeURIComponent(capture.downloadUrl || "")}`
            : `/api/captures/download?url=${encodeURIComponent(capture.screenshotUrl || "")}`;

        // Create a temporary link and trigger download
        const link = document.createElement("a");
        link.href = url;
        link.download = `${capture.title || "capture"}.${capture.type === "video" ? "mp4" : "png"}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        successCount++;
        await new Promise((resolve) => setTimeout(resolve, 500));
      } catch (error) {
        console.error("Download failed:", error);
        failCount++;
      }
    }

    toast.dismiss();
    if (failCount === 0) {
      toast.success(`Successfully downloaded ${successCount} captures`);
    } else {
      toast.warning(`Downloaded ${successCount} captures, ${failCount} failed`);
    }

    deselectAll();
  }, [selectedCaptures, allCaptures, deselectAll]);

  // KBD navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (allCaptures.length === 0) return;

      switch (e.key) {
        case "ArrowRight":
        case "ArrowDown":
          e.preventDefault();
          setFocusedIndex((prev) => {
            const next = prev < allCaptures.length - 1 ? prev + 1 : 0;
            // Small delay to ensure ref is set
            setTimeout(() => {
              captureRefs.current[next]?.focus();
            }, 0);
            return next;
          });
          break;
        case "ArrowLeft":
        case "ArrowUp":
          e.preventDefault();
          setFocusedIndex((prev) => {
            const next = prev > 0 ? prev - 1 : allCaptures.length - 1;
            // Small delay to ensure ref is set
            setTimeout(() => {
              captureRefs.current[next]?.focus();
            }, 0);
            return next;
          });
          break;
        case "Enter":
        case " ":
          e.preventDefault();
          if (focusedIndex >= 0 && focusedIndex < allCaptures.length) {
            toggleSelection(allCaptures[focusedIndex].id);
          }
          break;
        case "Escape":
          e.preventDefault();
          deselectAll();
          setFocusedIndex(-1);
          break;
        case "a":
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            if (selectedCaptures.size === allCaptures.length) {
              deselectAll();
            } else {
              selectAll();
            }
          }
          break;
        case "d":
          if ((e.ctrlKey || e.metaKey) && selectedCaptures.size > 0) {
            e.preventDefault();
            handleBulkDownload();
          }
          break;
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [
    allCaptures,
    focusedIndex,
    selectedCaptures.size,
    toggleSelection,
    selectAll,
    deselectAll,
    handleBulkDownload,
  ]);

  if (!Object.keys(groupedCaptures).length) {
    return (
      <div className="flex flex-col gap-8 min-h-dvh">
        <div className="flex-1 px-6 pb-12">
          <div className="flex justify-center items-center min-h-[60vh]">
            <Empty className="border-none">
              <EmptyHeader>
                <EmptyMedia variant="icon" className="size-16">
                  <ImageIcon className="size-8" />
                </EmptyMedia>
                <EmptyTitle className="text-3xl">No Captures Yet</EmptyTitle>
                <EmptyDescription className="text-base">
                  Your PlayStation captures will appear here once you start
                  recording screenshots and videos.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 min-h-dvh mt-10">
      <div className="flex-1 px-6 pb-12">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">Captures</h1>
            <Tooltip>
              <TooltipTrigger asChild className="hidden md:block">
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <HelpCircleIcon className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <div className="space-y-2">
                  <div className="font-medium">Shortcuts</div>
                  <div className="text-sm space-y-1">
                    <div className="flex items-center justify-between gap-4">
                      <KbdGroup>
                        <Kbd>←</Kbd>
                        <Kbd>→</Kbd>
                      </KbdGroup>
                      <span>Navigate</span>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <KbdGroup>
                        <Kbd>Space</Kbd>
                        <Kbd>Enter</Kbd>
                      </KbdGroup>
                      <span>Select</span>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <KbdGroup>
                        <Kbd>⌘</Kbd>
                        <Kbd>A</Kbd>
                      </KbdGroup>
                      <span>Select All</span>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <KbdGroup>
                        <Kbd>⌘</Kbd>
                        <Kbd>D</Kbd>
                      </KbdGroup>
                      <span>Download Selected</span>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <Kbd>Esc</Kbd>
                      <span>Deselect All</span>
                    </div>
                  </div>
                </div>
              </TooltipContent>
            </Tooltip>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (selectedCaptures.size === allCaptures.length) {
                deselectAll();
              } else {
                selectAll();
              }
            }}
            className="h-8 text-xs"
          >
            {selectedCaptures.size === allCaptures.length
              ? "Deselect"
              : "Select"}{" "}
            All
            <KbdGroup className="ml-1">
              <Kbd>⌘</Kbd>
              <Kbd>A</Kbd>
            </KbdGroup>
          </Button>
        </div>

        <div className="space-y-8">
          {Object.entries(groupedCaptures).map(([game, gameCaptures]) => {
            const titleImageUrl = gameCaptures[0]?.titleImageUrl;
            return (
              <section key={game}>
                <div className="flex items-center gap-2 sm:gap-3 mb-4">
                  {titleImageUrl && (
                    <img
                      width={64}
                      height={64}
                      style={{ objectFit: "cover" }}
                      src={titleImageUrl}
                      alt={game}
                      className="w-10 h-10 sm:w-16 sm:h-16 rounded-[12px] flex-shrink-0"
                    />
                  )}
                  <h3 className="text-lg sm:text-2xl font-bold text-foreground truncate">
                    {game}
                  </h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {gameCaptures.map((c: Capture) => {
                    const globalIndex = allCaptures.findIndex(
                      (cap) => cap.id === c.id,
                    );
                    return c.type === "video" ? (
                      <VideoCaptureCard
                        key={c.id}
                        capture={c}
                        isSelected={isSelected(c.id)}
                        showCheckbox={selectedCaptures.size > 0}
                        onToggleSelection={() => toggleSelection(c.id)}
                        ref={(el) => {
                          if (el) captureRefs.current[globalIndex] = el;
                        }}
                        tabIndex={0}
                        onFocus={() => setFocusedIndex(globalIndex)}
                      />
                    ) : (
                      <ImageCaptureCard
                        key={c.id}
                        capture={c}
                        isSelected={isSelected(c.id)}
                        showCheckbox={selectedCaptures.size > 0}
                        onToggleSelection={() => toggleSelection(c.id)}
                        ref={(el) => {
                          if (el) captureRefs.current[globalIndex] = el;
                        }}
                        tabIndex={0}
                        onFocus={() => setFocusedIndex(globalIndex)}
                      />
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      </div>

      {selectedCaptures.size > 0 && (
        <div className="flex w-full items-center justify-center fixed bottom-2 md:bottom-6 left-1/2 transform -translate-x-1/2 z-50">
          <div className="bg-background/95 border rounded-lg shadow-lg px-4 py-3">
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium">
                {selectedCaptures.size} selected
              </span>
              <div className="flex items-center gap-2">
                <Button onClick={handleBulkDownload} size="sm">
                  Download
                  <KbdGroup>
                    <Kbd className="text-xs">⌘</Kbd>
                    <Kbd className="text-xs">D</Kbd>
                  </KbdGroup>
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import { ImageIcon } from "lucide-react";
import Image from "next/image";
import { useMemo } from "react";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import type { Capture } from "@/lib/psn";
import { ImageCaptureCard } from "./image-capture";
import { VideoCaptureCard } from "./video-capture";

export function CapturesGallery({ captures }: { captures: Capture[] }) {
  const groupedCaptures = useMemo(() => {
    if (!captures.length) return {};
    return captures.reduce((acc: Record<string, Capture[]>, capture) => {
      const game = capture.game || "Unknown Game";
      if (!acc[game]) acc[game] = [];
      acc[game].push(capture);
      return acc;
    }, {});
  }, [captures]);

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
    <div className="flex flex-col gap-8 min-h-dvh">
      <div className="flex-1 px-6 pb-12">
        <div className="space-y-8">
          {Object.entries(groupedCaptures).map(([game, gameCaptures]) => {
            const titleImageUrl = gameCaptures[0]?.titleImageUrl;
            return (
              <section key={game}>
                <div className="flex items-center gap-3 mb-4">
                  {titleImageUrl && (
                    <Image
                      width={64}
                      height={64}
                      style={{ objectFit: "cover" }}
                      src={titleImageUrl}
                      alt={game}
                      className="rounded-[12px]"
                    />
                  )}
                  <h3 className="text-2xl font-bold text-foreground">{game}</h3>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {gameCaptures.map((c: Capture) =>
                    c.type === "video" ? (
                      <VideoCaptureCard key={c.id} capture={c} />
                    ) : (
                      <ImageCaptureCard key={c.id} capture={c} />
                    ),
                  )}
                </div>
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
}

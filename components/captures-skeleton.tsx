import { Skeleton } from "@/components/ui/skeleton";

export function CapturesSkeleton() {
  return (
    <div className="flex flex-col gap-8 min-h-dvh">
      <div className="flex-1 px-6 pb-12">
        <div className="space-y-8">
          <GameSkeleton />
          <GameSkeleton />
          <GameSkeleton />
          <GameSkeleton />
        </div>
      </div>
    </div>
  );
}

function GameSkeleton() {
  return (
    <section>
      <div className="flex items-center gap-3 mb-4">
        <Skeleton className="w-16 h-16 rounded-[12px] bg-muted" />
        <Skeleton className="h-10 w-48 bg-muted" />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        <Skeleton className="w-full aspect-video bg-muted border" />
        <Skeleton className="w-full aspect-video bg-muted border" />
        <Skeleton className="w-full aspect-video bg-muted border" />
        <Skeleton className="w-full aspect-video bg-muted border" />
      </div>
    </section>
  );
}

import { Skeleton } from "@/components/ui/skeleton";

export function GameSkeleton() {
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

"use client";

import { useEffect, useState, useMemo } from "react";
import useSWR from "swr";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CaptureCard } from "./capture-card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { Capture } from "@/lib/psn";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { AlertCircleIcon, KeyRoundIcon } from "lucide-react";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";

const fetcher = async ([url, token, tokenized]: [string, string, boolean]) => {
  const u = tokenized ? url : `${url}?tokenized=0`;

  const trimmed = token.trim();
  const authHeader = /^bearer\s+/i.test(trimmed)
    ? trimmed
    : `Bearer ${trimmed}`;

  const res = await fetch(u, { headers: { Authorization: authHeader } });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}) as any);
    const msg =
      err?.error ||
      (res.status === 401
        ? "Unauthorized. Check your token and try again."
        : "Failed to fetch captures");
    throw new Error(msg);
  }
  const tokenizedSupportedHeader = res.headers.get("x-psn-tokenized-supported");
  const tokenizedSupported = tokenizedSupportedHeader !== "false";
  const json = (await res.json()) as { captures: Capture[] };
  return Object.assign(json, { tokenizedSupported });
};

export function CapturesBrowser({ className }: { className?: string }) {
  const [token, setToken] = useState("");
  const [input, setInput] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("psn_bearer") || "";
    setToken(saved);
    setInput(saved);
  }, []);
  useEffect(() => {
    if (token) localStorage.setItem("psn_bearer", token);
  }, [token]);

  const { data, error, isLoading } = useSWR(
    token ? ["/api/captures", token, true] : null,
    fetcher,
    {
      revalidateOnFocus: false,
    },
  );

  const onUseToken = () => {
    setToken(input.trim());
    setDialogOpen(false);
  };

  const captures = data?.captures || [];

  const groupedCaptures: Record<string, Capture[]> = useMemo(() => {
    const result: Record<string, Capture[]> = {};
    if (!captures.length) return result;
    return captures.reduce(
      (acc: Record<string, Capture[]>, capture: Capture) => {
        const game = capture.game || "Unknown Game";
        if (!acc[game]) acc[game] = [];
        acc[game].push(capture);
        return acc;
      },
      result,
    );
  }, [captures]);

  return (
    <div className={cn("flex flex-col gap-8 min-h-dvh", className)}>
      <header className="flex justify-end items-center pt-6 px-6">
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <Tooltip>
            <TooltipTrigger asChild>
              <DialogTrigger asChild>
                <Button variant="outline" className="rounded-2xl w-14 h-14">
                  <KeyRoundIcon className="size-5" />
                </Button>
              </DialogTrigger>
            </TooltipTrigger>
            <TooltipContent>
              <p>Set PSN API Key</p>
            </TooltipContent>
          </Tooltip>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Enter PSN Token</DialogTitle>
              <DialogDescription>
                Paste your Bearer access token from the PlayStation App
              </DialogDescription>
            </DialogHeader>
            <div className="flex w-full flex-col gap-4">
              <Input
                id="psn-token"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Paste your Bearer access token"
                type="password"
                aria-label="PSN Bearer token"
              />
              {error?.message?.toLowerCase().includes("scope") ? (
                <Alert variant="destructive">
                  <AlertCircleIcon />
                  <AlertTitle>Invalid PSN scope</AlertTitle>
                  <AlertDescription>
                    Generate a Bearer token from the PlayStation App and try
                    again.
                  </AlertDescription>
                </Alert>
              ) : error ? (
                <Alert variant="destructive">
                  <AlertCircleIcon />
                  <AlertDescription>{error.message}</AlertDescription>
                </Alert>
              ) : null}
              <Button onClick={onUseToken}>Save</Button>
            </div>
          </DialogContent>
        </Dialog>
      </header>

      <div className="flex-1 px-6 pb-12">
        {isLoading ? (
          <div className="space-y-8">
            {Array.from({ length: 2 }).map((_, i) => (
              <section key={i}>
                <div className="flex items-center gap-3 mb-4">
                  <Skeleton className="w-16 h-16 rounded-[12px] bg-neutral-900" />
                  <Skeleton className="h-10 w-48 bg-neutral-900" />
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {Array.from({ length: 4 }).map((_, j) => (
                    <Skeleton
                      key={j}
                      className="w-full aspect-video bg-neutral-900 border border-neutral-700"
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
        ) : Object.keys(groupedCaptures).length ? (
          <div className="space-y-8">
            {Object.entries(groupedCaptures).map(([game, gameCaptures]) => {
              const titleImageUrl = gameCaptures[0]?.titleImageUrl;
              return (
                <section key={game}>
                  <div className="flex items-center gap-3 mb-4">
                    {titleImageUrl && (
                      <img
                        src={titleImageUrl}
                        alt={game}
                        className="size-16 rounded-[12px] object-cover"
                      />
                    )}
                    <h3 className="text-2xl font-bold text-gray-200">{game}</h3>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {gameCaptures.map((c: Capture) => (
                      <CaptureCard key={c.id} capture={c} />
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        ) : token ? (
          <div className="text-sm text-gray-500 text-center py-12">
            No captures found.
          </div>
        ) : null}
      </div>
    </div>
  );
}

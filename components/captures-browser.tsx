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
import { AlertCircleIcon, KeyRoundIcon, Gamepad2 } from "lucide-react";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { toast } from "sonner";

const fetcher = async ([
  url,
  accessToken,
  refreshToken,
  setAccessToken,
  setRefreshToken,
  tokenized,
]: [
  string,
  string,
  string,
  (token: string) => void,
  (token: string) => void,
  boolean,
]) => {
  const u = tokenized ? url : `${url}?tokenized=0`;

  const authHeader = `Bearer ${accessToken}`;

  let res = await fetch(u, { headers: { Authorization: authHeader } });

  if (res.status === 401 && refreshToken) {
    try {
      const refreshRes = await fetch("/api/refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });
      if (refreshRes.ok) {
        const { access_token, refresh_token } = await refreshRes.json();
        setAccessToken(access_token);
        if (refresh_token) setRefreshToken(refresh_token);
        res = await fetch(u, {
          headers: { Authorization: `Bearer ${access_token}` },
        });
      }
    } catch (refreshError) {
      console.error("Token refresh failed:", refreshError);
    }
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({}) as any);
    const msg =
      err?.error ||
      (res.status === 401
        ? "Unauthorized. Check your NPSSO and try again."
        : "Failed to fetch captures");
    throw new Error(msg);
  }
  const tokenizedSupportedHeader = res.headers.get("x-psn-tokenized-supported");
  const tokenizedSupported = tokenizedSupportedHeader !== "false";
  const json = (await res.json()) as { captures: Capture[] };
  return Object.assign(json, { tokenizedSupported });
};

export function CapturesBrowser({ className }: { className?: string }) {
  const [npsso, setNpsso] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [refreshToken, setRefreshToken] = useState("");
  const [input, setInput] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    const savedNpsso = localStorage.getItem("psn_npsso") || "";
    const savedAccess = localStorage.getItem("psn_access") || "";
    const savedRefresh = localStorage.getItem("psn_refresh") || "";
    setNpsso(savedNpsso);
    setAccessToken(savedAccess);
    setRefreshToken(savedRefresh);
    setInput(savedNpsso);
  }, []);

  useEffect(() => {
    localStorage.setItem("psn_npsso", npsso);
    localStorage.setItem("psn_access", accessToken);
    localStorage.setItem("psn_refresh", refreshToken);
  }, [npsso, accessToken, refreshToken]);

  const { data, error, isLoading } = useSWR(
    accessToken
      ? [
          "/api/captures",
          accessToken,
          refreshToken,
          setAccessToken,
          setRefreshToken,
          true,
        ]
      : null,
    fetcher,
    {
      revalidateOnFocus: false,
    },
  );

  const onUseToken = async () => {
    const trimmed = input.trim();
    if (!trimmed) return;

    const res = await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ npsso: trimmed }),
    });
    if (!res.ok) {
      toast.error("Failed to authenticate. Please try again later.");
    }
    const { access_token, refresh_token } = await res.json();
    setNpsso(trimmed);
    setAccessToken(access_token);
    setRefreshToken(refresh_token);
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
              <p>Set NPSSO Token</p>
            </TooltipContent>
          </Tooltip>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Enter NPSSO Token</DialogTitle>
              <DialogDescription>
                Paste your NPSSO token from the PlayStation App
              </DialogDescription>
            </DialogHeader>
            <div className="flex w-full flex-col gap-4">
              <Input
                id="psn-npsso"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Paste your NPSSO token"
                type="password"
                aria-label="PSN NPSSO token"
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
                  <Skeleton className="w-16 h-16 rounded-[12px] bg-muted" />
                  <Skeleton className="h-10 w-48 bg-muted" />
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {Array.from({ length: 4 }).map((_, j) => (
                    <Skeleton
                      key={j}
                      className="w-full aspect-video bg-muted border"
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
                    <h3 className="text-2xl font-bold text-foreground">
                      {game}
                    </h3>
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
        ) : accessToken ? (
          <div className="text-sm text-muted-foreground text-center py-12">
            No captures found.
          </div>
        ) : (
          <div className="flex justify-center">
            <Empty className="border md:p-6 max-w-md flex-none">
              <EmptyHeader>
                <EmptyMedia variant="icon" className="size-12">
                  <Gamepad2 />
                </EmptyMedia>
                <EmptyTitle className="text-2xl">No Captures Yet</EmptyTitle>
                <EmptyDescription className="text-base">
                  Set your NPSSO token to view your PlayStation captures.
                </EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                <Button onClick={() => setDialogOpen(true)} size="lg">Set NPSSO Token</Button>
              </EmptyContent>
            </Empty>
          </div>
        )}
      </div>
    </div>
  );
}

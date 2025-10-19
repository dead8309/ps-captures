"use client";

import {
  Result,
  useAtom,
  useAtomSet,
  useAtomValue,
} from "@effect-atom/atom-react";
import { AlertCircleIcon, Gamepad2, KeyRoundIcon } from "lucide-react";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { NpssoStepper } from "@/components/npsso-stepper";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  accessTokenAtom,
  authAtom,
  capturesAtom,
  npssoAtom,
  refreshTokenAtom,
} from "@/lib/atoms";
import type { Capture } from "@/lib/psn";
import { cn } from "@/lib/utils";
import { CaptureCard } from "./capture-card";
import { GameSkeleton } from "./game-skeleton";

export function CapturesBrowser({ className }: { className?: string }) {
  const [npsso, setNpsso] = useAtom(npssoAtom);
  const [accessToken, setAccessToken] = useAtom(accessTokenAtom);
  const [, setRefreshToken] = useAtom(refreshTokenAtom);
  const [input, setInput] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);

  const capturesResult = useAtomValue(capturesAtom);
  const authSet = useAtomSet(authAtom);
  const authResult = useAtomValue(authAtom);

  useEffect(() => {
    setInput(npsso);
  }, [npsso]);

  const onUseToken = () => {
    const trimmed = input.trim();
    if (!trimmed) return;

    authSet({ payload: { npsso: trimmed } });
  };

  useEffect(() => {
    Result.match(authResult, {
      onInitial: () => {},
      onSuccess: (success) => {
        setNpsso(input.trim());
        setAccessToken(success.value.access_token);
        setRefreshToken(success.value.refresh_token);
        setDialogOpen(false);
      },
      onFailure: () => {
        toast.error("Failed to authenticate. Please try again later.");
      },
    });
  }, [authResult, input, setNpsso, setAccessToken, setRefreshToken]);

  const capturesData = Result.match(capturesResult, {
    onInitial: () => ({ captures: [] as Capture[], tokenizedSupported: false }),
    onFailure: () => ({ captures: [] as Capture[], tokenizedSupported: false }),
    onSuccess: (success) => success.value,
  });

  const error = Result.match(capturesResult, {
    onInitial: () => null,
    onFailure: () => new Error("Failed to fetch captures"),
    onSuccess: () => null,
  });

  const isLoading = Result.isInitial(capturesResult);

  const captures = capturesData.captures;

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
            <GameSkeleton />
            <GameSkeleton />
          </div>
        ) : Object.keys(groupedCaptures).length ? (
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
            <Empty className="border md:p-6 flex-none from-muted/50 to-background h-full bg-gradient-to-b from-30%">
              <EmptyHeader>
                <EmptyMedia variant="icon" className="size-12">
                  <Gamepad2 />
                </EmptyMedia>
                <EmptyTitle className="text-2xl">No Captures Yet</EmptyTitle>
                <EmptyDescription className="text-base">
                  To get started, paste your NPSSO token from the PlayStation
                  mobile app. This allows us to access your game captures
                  securely.
                </EmptyDescription>
              </EmptyHeader>
              <EmptyContent className="min-w-lg">
                <NpssoStepper
                  onEnterToken={(token) => {
                    if (token.trim()) {
                      authSet({ payload: { npsso: token.trim() } });
                    }
                  }}
                />
              </EmptyContent>
            </Empty>
          </div>
        )}
      </div>
    </div>
  );
}

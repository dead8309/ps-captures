"use client";

import {
  Result,
  useAtom,
  useAtomSet,
  useAtomValue,
} from "@effect-atom/atom-react";
import { KeyRoundIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  accessTokenAtom,
  authAtom,
  npssoAtom,
  refreshTokenAtom,
} from "@/lib/atoms";
import { Spinner } from "./ui/spinner";
import { cn } from "@/lib/utils";

export function Navbar() {
  const [npsso, setNpsso] = useAtom(npssoAtom);
  const [accessToken, setAccessToken] = useAtom(accessTokenAtom);
  const [refreshToken, setRefreshToken] = useAtom(refreshTokenAtom);
  const [input, setInput] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);

  const authSet = useAtomSet(authAtom);
  const authResult = useAtomValue(authAtom);
  const isLoading = Result.isWaiting(authResult);
  const needsNewNpsso =
    !accessToken || !refreshToken || Result.isFailure(authResult);

  useEffect(() => {
    setInput(npsso);
  }, [npsso]);

  const onUseToken = () => {
    const trimmed = input.trim();
    if (!trimmed) return;

    toast.loading("Authenticating with PlayStation Network...");
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
        toast.dismiss();
        toast.success("Successfully authenticated!");
      },
      onFailure: (error) => {
        toast.dismiss();
        if (error.cause._tag === "Fail") {
          const tag = error.cause.error._tag;
          switch (tag) {
            case "AuthCodeFailed":
              toast.error(
                "Failed to obtain authorization code from PSN. Please try again.",
              );
              break;
            case "NoAuthCode":
              toast.error(
                "No authorization code found in PSN response. Please try again.",
              );
              break;
            case "TokenExchangeFailed":
              toast.error(
                "Failed to exchange code for tokens. Please try again later.",
              );
              break;

            case "RateLimitedError":
              toast.error(
                "You have been rate-limited by PSN. Please try after some time.",
              );
              break;
            default:
              toast.error(
                "An unexpected error occurred. Please try again later.",
              );
          }
        }
      },
    });
  }, [authResult, input, setNpsso, setAccessToken, setRefreshToken]);

  return (
    <header className="flex justify-end items-center pt-6 px-6">
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <Tooltip>
          <TooltipTrigger asChild>
            <DialogTrigger asChild>
              <Button
                variant="outline"
                className={cn("rounded-2xl w-14 h-14 relative", {
                  "bg-destructive/5 border-destructive/30 hover:bg-destructive/10 hover:border-destructive/50":
                    needsNewNpsso,
                })}
              >
                <KeyRoundIcon
                  className={cn("size-5 ", {
                    "text-destructive": needsNewNpsso,
                  })}
                />
                {needsNewNpsso && (
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-destructive rounded-full" />
                )}
              </Button>
            </DialogTrigger>
          </TooltipTrigger>
          <TooltipContent>
            <p>
              {needsNewNpsso
                ? "⚠️ Update NPSSO Token (Authentication Required)"
                : "Set NPSSO Token"}
            </p>
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
            <Button onClick={onUseToken} disabled={isLoading}>
              {isLoading ? (
                <>
                  <Spinner className="mr-2" />
                  Authenticating...
                </>
              ) : (
                "Save"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </header>
  );
}

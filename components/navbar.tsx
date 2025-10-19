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

export function Navbar() {
  const [npsso, setNpsso] = useAtom(npssoAtom);
  const [, setAccessToken] = useAtom(accessTokenAtom);
  const [, setRefreshToken] = useAtom(refreshTokenAtom);
  const [input, setInput] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);

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

  return (
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
            <Button onClick={onUseToken}>Save</Button>
          </div>
        </DialogContent>
      </Dialog>
    </header>
  );
}

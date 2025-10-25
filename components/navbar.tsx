"use client";

import { Result, useAtomValue } from "@effect-atom/atom-react";
import { KeyRoundIcon } from "lucide-react";
import { useEffect, useState } from "react";

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
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { authAtom, npssoAtom } from "@/lib/atoms";
import { cn } from "@/lib/utils";
import { NpssoStepper } from "./npsso-stepper";

export function Navbar() {
  const npsso = useAtomValue(npssoAtom);
  const [dialogOpen, setDialogOpen] = useState(false);

  const authResult = useAtomValue(authAtom);
  const needsNewNpsso = Boolean(npsso) && Result.isFailure(authResult);

  useEffect(() => {
    Result.match(authResult, {
      onInitial: () => {},
      onSuccess: () => {
        setDialogOpen(false);
      },
      onFailure: () => {},
    });
  }, [authResult]);

  return (
    <header className="flex justify-end items-center pt-4 md:pt-6 px-6">
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
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Get NPSSO Token</DialogTitle>
            <DialogDescription>
              Follow these steps to get your NPSSO token from PlayStation
            </DialogDescription>
          </DialogHeader>
          <NpssoStepper />
        </DialogContent>
      </Dialog>
    </header>
  );
}

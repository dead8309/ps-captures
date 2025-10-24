"use client";

import { useAtomSet } from "@effect-atom/atom-react";
import { Gamepad2 } from "lucide-react";
import { NpssoStepper } from "@/components/npsso-stepper";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";

export function Onboarding() {
  return (
    <div className="flex flex-col gap-8 min-h-dvh">
      <div className="flex-1 px-6 pb-12">
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
              <NpssoStepper />
            </EmptyContent>
          </Empty>
        </div>
      </div>
    </div>
  );
}

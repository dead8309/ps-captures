"use client";

import { Result, useAtomValue } from "@effect-atom/atom-react";
import { Cause } from "effect";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { accessTokenAtom, capturesAtom } from "@/lib/atoms";
import { CapturesGallery } from "./captures-gallery";
import { CapturesSkeleton } from "./captures-skeleton";
import { Onboarding } from "./onboarding";

export function CapturesBrowser() {
  const [mounted, setMounted] = useState(false);
  const capturesResult = useAtomValue(capturesAtom);
  const accessToken = useAtomValue(accessTokenAtom);

  useEffect(() => setMounted(true), []);

  const isLoading = Result.isInitial(capturesResult);

  if (!mounted || isLoading) {
    return <CapturesSkeleton />;
  }

  if (!accessToken) {
    return <Onboarding />;
  }

  return Result.match(capturesResult, {
    onInitial: () => <CapturesSkeleton />,
    onFailure: (error) => {
      if (error.cause._tag === "Fail") {
        const tag = error.cause.error._tag;
        switch (tag) {
          case "CapturesFetchFailed":
            toast.error("Failed to load captures from PlayStation Network.");
            break;
          case "InvalidToken":
            toast.error("Authentication failed. Please try logging in again.");
            break;
          case "CapturesNetworkError":
            toast.error("Network error while loading captures.");
            break;
          case "CapturesParseError":
            toast.error("Unable to process captures data.");
            break;
        }
      }

      return <CapturesGallery captures={[]} />;
    },
    onSuccess: (success) => (
      <CapturesGallery captures={Array.from(success.value.captures)} />
    ),
  });
}

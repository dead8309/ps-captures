"use client";

import { Result, useAtomValue } from "@effect-atom/atom-react";
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

  const capturesData = Result.match(capturesResult, {
    onInitial: () => ({ captures: [], tokenizedSupported: false }),
    onFailure: () => ({ captures: [], tokenizedSupported: false }),
    onSuccess: (success) => success.value,
  });

  const error = Result.match(capturesResult, {
    onInitial: () => null,
    onFailure: (failure) => failure.cause,
    onSuccess: () => null,
  });

  const isLoading = Result.isInitial(capturesResult);
  const captures = Array.from(capturesData.captures);

  useEffect(() => {
    if (error) {
      toast.error("Failed to fetch captures");
    }
  }, [error]);

  if (!mounted || isLoading) {
    return <CapturesSkeleton />;
  }

  if (!accessToken) {
    return <Onboarding />;
  }

  return <CapturesGallery captures={captures} />;
}

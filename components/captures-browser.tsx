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
    onFailure: (failure) => {
      toast.error(Cause.pretty(failure.cause));
      return <CapturesGallery captures={[]} />;
    },
    onSuccess: (success) => (
      <CapturesGallery captures={Array.from(success.value.captures)} />
    ),
  });
}

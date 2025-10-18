"use client";

import { useEffect, useState, useMemo } from "react";
import useSWR from "swr";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { type Capture, CaptureCard } from "./capture-card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

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



  const onUseToken = () => setToken(input.trim());

  const captures = data?.captures || [];

  const groupedCaptures = useMemo(() => {
    if (!captures.length) return {} as Record<string, Capture[]>;
    return captures.reduce(
      (acc: Record<string, Capture[]>, capture: Capture) => {
        const game = capture.game || "Unknown Game";
        if (!acc[game]) acc[game] = [];
        acc[game].push(capture);
        return acc;
      },
      {} as Record<string, Capture[]>,
    );
  }, [captures]);

  return (
    <div className={cn("flex flex-col gap-8 min-h-dvh bg-black", className)}>
      <section className="flex flex-col gap-6 items-center justify-center pt-16 px-6">
        <div className="flex flex-col gap-4 w-full max-w-2xl">
          <div className="flex flex-col sm:flex-row gap-3">
            <Input
              id="psn-token"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Paste your Bearer access token"
              className="font-mono text-sm bg-black border border-neutral-700 text-gray-300 placeholder:text-gray-600 focus:outline-none focus:ring-0 focus:border-neutral-500"
              type="password"
              aria-label="PSN Bearer token"
            />
            <Button
              onClick={onUseToken}
              className="bg-white text-black hover:bg-gray-100 font-semibold whitespace-nowrap border-0 px-8"
            >
              Load
            </Button>
          </div>
          {error?.message?.toLowerCase().includes("scope") ? (
            <div className="text-xs border border-gray-700 bg-black p-3 text-gray-400 w-full">
              <strong className="text-gray-300">Invalid PSN scope:</strong>{" "}
              Generate a Bearer token from the PlayStation App and try again.
            </div>
          ) : error ? (
            <div className="text-xs border border-gray-700 bg-black p-3 text-gray-400 w-full">
              {error.message}
            </div>
          ) : null}
        </div>
      </section>

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
            {(Object.entries(groupedCaptures) as [string, Capture[]][]).map(([game, gameCaptures]) => {
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
                    <h3 className="text-2xl font-bold text-gray-200">
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
        ) : token ? (
          <div className="text-sm text-gray-500 text-center py-12">
            No captures found.
          </div>
        ) : null}
      </div>
    </div>
  );
}

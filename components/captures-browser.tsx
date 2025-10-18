"use client"

import { useEffect, useState, useMemo } from "react"
import useSWR from "swr"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { type Capture, CaptureCard } from "./capture-card"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

const fetcher = async ([url, token, tokenized]: [string, string, boolean]) => {
  const u = tokenized ? url : `${url}?tokenized=0`

  // normalize: accept either raw token or "Bearer token"
  const trimmed = token.trim()
  const authHeader = /^bearer\s+/i.test(trimmed) ? trimmed : `Bearer ${trimmed}`

  const res = await fetch(u, { headers: { Authorization: authHeader } })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}) as any)
    const msg =
      err?.error || (res.status === 401 ? "Unauthorized. Check your token and try again." : "Failed to fetch captures")
    throw new Error(msg)
  }
  const tokenizedSupportedHeader = res.headers.get("x-psn-tokenized-supported")
  const tokenizedSupported = tokenizedSupportedHeader !== "false"
  const json = (await res.json()) as { captures: Capture[] }
  return Object.assign(json, { tokenizedSupported })
}

export function CapturesBrowser({ className }: { className?: string }) {
  const [token, setToken] = useState("")
  const [input, setInput] = useState("")

  // Load and persist token locally (client-side only)
  useEffect(() => {
    const saved = localStorage.getItem("psn_bearer") || ""
    setToken(saved)
    setInput(saved)
  }, [])
  useEffect(() => {
    if (token) localStorage.setItem("psn_bearer", token)
  }, [token])

  const { data, error, isLoading, mutate } = useSWR(token ? ["/api/captures", token, true] : null, fetcher, {
    revalidateOnFocus: false,
  })

  const groupedCaptures = useMemo(() => {
    if (!data?.captures) return {}
    return data.captures.reduce((acc, capture) => {
      const game = capture.game || "Unknown Game"
      if (!acc[game]) acc[game] = []
      acc[game].push(capture)
      return acc
    }, {} as Record<string, Capture[]>)
  }, [data?.captures])

  const onUseToken = () => setToken(input.trim())

  return (
    <div className={cn("flex flex-col gap-6", className)}>
      <section className="flex flex-col gap-3">
        <Label htmlFor="psn-token" className="text-sm">
          {"PlayStation Access Token (Bearer)"}
        </Label>
        <div className="flex flex-col sm:flex-row gap-2">
          <Input
            id="psn-token"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Paste your Bearer access token"
            className="font-mono text-xs"
            type="password"
            aria-label="PSN Bearer token"
          />
          <Button onClick={onUseToken} className="bg-primary text-primary-foreground">
            {"Use token"}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          {"Your token is kept only in your browser storage and sent with each request to your server. "}
          {"Fetch the list first, then use Download to save files."}
        </p>
        {error?.message?.toLowerCase().includes("scope") ? (
          <div className="text-xs rounded-md border border-border p-3 text-foreground">
            <strong>{"Invalid PSN scope: "}</strong>
            {
              "The token you provided does not include the required Media Gallery permissions. Generate a Bearer token via the PlayStation App NPSSO flow (mobile app) and try again."
            }
          </div>
        ) : error ? (
          <div className="text-xs rounded-md border border-border p-3 text-foreground">{error.message}</div>
        ) : null}
      </section>

      <section className="flex items-center justify-between">
        <h2 className="text-base font-semibold">{"Your Captures"}</h2>
        <Button
          variant="outline"
          onClick={() => mutate()}
          className="border-border text-foreground"
          disabled={!token}
        >
          {"Refresh"}
        </Button>
      </section>

      {isLoading ? (
        <div className="space-y-8">
          {Array.from({ length: 2 }).map((_, i) => (
            <section key={i} className="mb-8">
              <Skeleton className="h-6 w-48 mb-4" />
              <div className="flex gap-4 overflow-x-auto pb-4">
                {Array.from({ length: 4 }).map((_, j) => (
                  <div key={j} className="flex-shrink-0 w-64">
                    <div className="border rounded-lg overflow-hidden">
                      <Skeleton className="w-full aspect-video" />
                      <div className="p-3">
                        <Skeleton className="h-4 w-full mb-1" />
                        <Skeleton className="h-3 w-2/3 mb-2" />
                        <div className="flex justify-between items-center">
                          <Skeleton className="h-3 w-16" />
                          <Skeleton className="h-6 w-16" />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : Object.keys(groupedCaptures).length ? (
        <div className="space-y-8">
          {Object.entries(groupedCaptures).map(([game, captures]) => (
            <section key={game}>
              <h3 className="text-lg font-semibold mb-4">{game}</h3>
              <div className="flex gap-4 overflow-x-auto pb-4">
                {captures.map((c) => (
                  <div key={c.id} className="flex-shrink-0 w-64">
                    <CaptureCard capture={c} />
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <div className="text-sm text-muted-foreground">{"No captures yet. Enter a token and refresh."}</div>
      )}
    </div>
  )
}

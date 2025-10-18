import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function safeJoinCookie(parts: string[]) {
  return parts
    .map((p) => p.trim())
    .filter(Boolean)
    .join("; ")
}

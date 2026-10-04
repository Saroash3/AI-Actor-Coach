import Link from "next/link"
import { Drama } from "lucide-react"
import { cn } from "@/lib/utils"

/** ActorPro AI wordmark: theatre masks in a spotlight-gold medallion. */
export function Logo({ href = "/", size = "md", className }: Readonly<{ href?: string; size?: "sm" | "md"; className?: string }>) {
  const small = size === "sm"
  return (
    <Link href={href} className={cn("group inline-flex items-center gap-2.5", className)}>
      <span
        className={cn(
          "relative flex items-center justify-center rounded-full bg-gradient-to-b from-spot-300 to-spot-600 text-stage-950",
          "shadow-[0_0_0_1px_rgba(241,205,114,0.5),0_0_24px_-4px_rgba(235,185,74,0.7)] transition-shadow duration-300",
          "group-hover:shadow-[0_0_0_1px_rgba(241,205,114,0.8),0_0_32px_-2px_rgba(235,185,74,0.9)]",
          small ? "h-8 w-8" : "h-10 w-10",
        )}
      >
        <Drama className={small ? "h-4 w-4" : "h-5 w-5"} strokeWidth={2.2} />
      </span>
      <span className={cn("font-display tracking-tight text-bone", small ? "text-lg" : "text-xl")}>
        Actor<span className="text-gilded">Pro</span>
        <span className="ml-1 align-middle font-sans text-[10px] font-semibold uppercase tracking-[0.25em] text-spot-300/80">AI</span>
      </span>
    </Link>
  )
}

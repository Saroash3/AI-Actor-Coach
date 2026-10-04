import { cn } from "@/lib/utils"

const STYLES: Record<string, string> = {
  Beginner:     "border-emerald-400/30 bg-emerald-400/10 text-emerald-300",
  Intermediate: "border-spot-400/30 bg-spot-400/10 text-spot-200",
  Advanced:     "border-velvet-400/35 bg-velvet-500/15 text-velvet-200",
}

// Signal strength bars, so difficulty isn't carried by colour alone
const LEVEL: Record<string, number> = { Beginner: 1, Intermediate: 2, Advanced: 3 }

export function DifficultyBadge({ difficulty, className }: Readonly<{ difficulty: string; className?: string }>) {
  const level = LEVEL[difficulty] ?? 0
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
        STYLES[difficulty] ?? "border-white/15 bg-white/5 text-bone/60",
        className,
      )}
    >
      {level > 0 && (
        <span className="flex items-end gap-[2px]" aria-hidden>
          {[1, 2, 3].map((i) => (
            <span key={i} className={cn("w-[3px] rounded-sm bg-current", i > level && "opacity-25")} style={{ height: 3 + i * 2 }} />
          ))}
        </span>
      )}
      {difficulty || "Custom"}
    </span>
  )
}

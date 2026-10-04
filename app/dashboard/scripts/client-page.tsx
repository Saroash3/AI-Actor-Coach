"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import {
  flexRender, getCoreRowModel, getFilteredRowModel, getPaginationRowModel, getSortedRowModel,
  useReactTable, type ColumnDef, type FilterFn, type SortingState,
} from "@tanstack/react-table"
import { AnimatePresence, motion } from "framer-motion"
import {
  ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight, Film, LayoutGrid,
  Library, Loader2, Plus, Rows3, Search, Trash2, Upload, X,
} from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { cn } from "@/lib/utils"
import { FilmPoster } from "@/components/scripts/film-poster"
import { DifficultyBadge } from "@/components/scripts/difficulty-badge"
import UploadScriptModal from "./upload-modal"

interface ScriptRow {
  id:         string
  title:      string
  author:     string
  genre:      string
  difficulty: string
  scenes:     number
}

const DIFFICULTIES = ["Beginner", "Intermediate", "Advanced"] as const
const DIFFICULTY_ORDER: Record<string, number> = { Beginner: 1, Intermediate: 2, Advanced: 3, Custom: 4 }

const toRow = (s: any): ScriptRow => ({
  id:         s._id ?? s.id,
  title:      s.title ?? "Untitled",
  author:     s.author ?? "Unknown",
  genre:      s.genre ?? "Custom",
  difficulty: s.difficulty ?? "Custom",
  scenes:     s.scenes ?? 0,
})

// Global search across title, author and genre
const matchesSearch: FilterFn<ScriptRow> = (row, _columnId, value: string) => {
  const q = value.toLowerCase()
  const s = row.original
  return s.title.toLowerCase().includes(q) || s.author.toLowerCase().includes(q) || s.genre.toLowerCase().includes(q)
}

function SortHeader({ label, sorted, onClick, align = "left" }: Readonly<{ label: string; sorted: false | "asc" | "desc"; onClick: () => void; align?: "left" | "right" }>) {
  const Icon = sorted === "asc" ? ArrowUp : sorted === "desc" ? ArrowDown : ArrowUpDown
  return (
    <div className={cn("flex", align === "right" && "justify-end")}>
      <button
        onClick={onClick}
        className={cn("inline-flex items-center gap-1.5 transition-colors hover:text-bone", sorted && "text-spot-200", align === "right" && "flex-row-reverse")}
      >
        {label}
        <Icon className={cn("h-3.5 w-3.5", !sorted && "opacity-40")} />
      </button>
    </div>
  )
}

export default function ScriptLibraryClient({ libraryScripts }: Readonly<{ libraryScripts: any[] }>) {
  const searchParams = useSearchParams()
  const router = useRouter()

  const [tab, setTab] = useState<"library" | "my-scripts">(searchParams.get("tab") === "my-scripts" ? "my-scripts" : "library")
  const [view, setView] = useState<"posters" | "table">("posters")
  const [userScripts, setUserScripts] = useState<ScriptRow[]>([])
  const [loadingMine, setLoadingMine] = useState(true)
  const [search, setSearch] = useState(searchParams.get("q") ?? "")
  const [genre, setGenre] = useState<string>("all")
  const [difficulty, setDifficulty] = useState<string | null>(null)
  const [sorting, setSorting] = useState<SortingState>([{ id: "title", desc: false }])
  const [showUpload, setShowUpload] = useState(false)
  const [toDelete, setToDelete] = useState<ScriptRow | null>(null)
  const [deleting, setDeleting] = useState(false)

  // Header search navigates here with ?q=; keep the box in sync
  useEffect(() => { setSearch(searchParams.get("q") ?? "") }, [searchParams])

  useEffect(() => {
    fetch("/api/scripts")
      .then((r) => r.json())
      .then((d) => setUserScripts((d.scripts ?? []).map(toRow)))
      .catch(() => {})
      .finally(() => setLoadingMine(false))
  }, [])

  const library = useMemo(() => libraryScripts.map(toRow), [libraryScripts])
  const source = tab === "library" ? library : userScripts

  // Genre and difficulty are applied before the table; search and sorting inside it
  const data = useMemo(
    () => source.filter((s) => (genre === "all" || s.genre === genre) && (!difficulty || s.difficulty === difficulty)),
    [source, genre, difficulty],
  )
  const genres = useMemo(() => [...new Set(source.map((s) => s.genre))].sort(), [source])

  const columns = useMemo<ColumnDef<ScriptRow>[]>(() => [
    {
      accessorKey: "title",
      header: ({ column }) => <SortHeader label="Title" sorted={column.getIsSorted()} onClick={() => column.toggleSorting(column.getIsSorted() === "asc")} />,
      cell: ({ row }) => (
        <Link href={`/dashboard/scripts/${row.original.id}`} className="group flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-gradient-to-b from-spot-400/15 to-transparent font-display text-lg text-spot-200">
            {row.original.title.charAt(0)}
          </span>
          <span className="font-display text-base text-bone transition-colors group-hover:text-spot-200">{row.original.title}</span>
        </Link>
      ),
    },
    {
      accessorKey: "genre",
      header: ({ column }) => <SortHeader label="Genre" sorted={column.getIsSorted()} onClick={() => column.toggleSorting(column.getIsSorted() === "asc")} />,
      cell: ({ getValue }) => <span className="text-bone/60">{getValue<string>()}</span>,
    },
    {
      accessorKey: "difficulty",
      sortingFn: (a, b) => (DIFFICULTY_ORDER[a.original.difficulty] ?? 9) - (DIFFICULTY_ORDER[b.original.difficulty] ?? 9),
      header: ({ column }) => <SortHeader label="Difficulty" sorted={column.getIsSorted()} onClick={() => column.toggleSorting(column.getIsSorted() === "asc")} />,
      cell: ({ getValue }) => <DifficultyBadge difficulty={getValue<string>()} />,
    },
    {
      accessorKey: "scenes",
      header: ({ column }) => <SortHeader label="Scenes" align="right" sorted={column.getIsSorted()} onClick={() => column.toggleSorting(column.getIsSorted() === "asc")} />,
      cell: ({ getValue }) => <span className="block text-right tabular-nums text-bone/70">{getValue<number>().toLocaleString()}</span>,
    },
    {
      id: "actions",
      enableSorting: false,
      header: () => <span className="sr-only">Actions</span>,
      cell: ({ row }) => (
        <div className="flex items-center justify-end gap-2">
          {tab === "my-scripts" && (
            <button
              onClick={() => setToDelete(row.original)}
              className="rounded-full p-2 text-bone/40 transition-colors hover:bg-velvet-600/15 hover:text-velvet-300"
              aria-label={`Delete ${row.original.title}`}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
          <Link href={`/dashboard/scripts/${row.original.id}`} className="rounded-full border border-white/10 px-4 py-1.5 text-xs text-bone/80 transition-colors hover:border-spot-400/40 hover:text-spot-200">
            Open
          </Link>
        </div>
      ),
    },
  ], [tab])

  const table = useReactTable({
    data,
    columns,
    state: { sorting, globalFilter: search },
    onSortingChange: setSorting,
    onGlobalFilterChange: setSearch,
    globalFilterFn: matchesSearch,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 10 } },
  })

  // Posters show every match; the table view pages them
  const posterRows = table.getPrePaginationRowModel().rows
  const resultCount = posterRows.length
  const filtersActive = Boolean(search || genre !== "all" || difficulty)

  const clearFilters = () => {
    setSearch("")
    setGenre("all")
    setDifficulty(null)
    if (searchParams.get("q")) router.replace("/dashboard/scripts")
  }

  const confirmDelete = async () => {
    if (!toDelete) return
    setDeleting(true)
    try {
      await fetch(`/api/scripts/${toDelete.id}`, { method: "DELETE" })
      setUserScripts((prev) => prev.filter((s) => s.id !== toDelete.id))
    } finally {
      setDeleting(false)
      setToDelete(null)
    }
  }

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      {/* Title */}
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow">Script library</p>
          <h1 className="mt-2 font-display text-4xl text-bone md:text-5xl">
            Pick your <span className="italic text-gilded">next role</span>
          </h1>
          <p className="mt-2 text-bone/55">
            {library.length} screenplays, {library.reduce((n, s) => n + s.scenes, 0).toLocaleString()} scenes, plus anything you upload.
          </p>
        </div>
        <button onClick={() => setShowUpload(true)} className="btn-spotlight self-start px-5 py-2.5 text-sm sm:self-auto">
          <Plus className="h-4 w-4" /> Upload a script
        </button>
      </div>

      {/* Toolbar */}
      <div className="panel flex flex-col gap-4 p-4 lg:flex-row lg:items-center">
        <Tabs value={tab} onValueChange={(v) => { setTab(v as typeof tab); setGenre("all"); setDifficulty(null) }}>
          <TabsList className="h-10 rounded-full bg-black/30 p-1">
            <TabsTrigger value="library" className="gap-2 rounded-full px-4 data-[state=active]:bg-spot-400/15 data-[state=active]:text-spot-100">
              <Library className="h-4 w-4" /> Library <span className="text-bone/40">{library.length}</span>
            </TabsTrigger>
            <TabsTrigger value="my-scripts" className="gap-2 rounded-full px-4 data-[state=active]:bg-spot-400/15 data-[state=active]:text-spot-100">
              <Upload className="h-4 w-4" /> My scripts <span className="text-bone/40">{userScripts.length}</span>
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-bone/30" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by title or genre…"
            className="h-10 w-full rounded-full border border-white/[0.08] bg-black/30 pl-11 pr-4 text-sm text-bone placeholder:text-bone/30 outline-none focus:border-spot-400/40"
          />
        </div>

        <Select value={genre} onValueChange={setGenre}>
          <SelectTrigger className="h-10 w-full rounded-full border-white/[0.08] bg-black/30 text-bone lg:w-44">
            <SelectValue placeholder="Genre" />
          </SelectTrigger>
          <SelectContent className="border-white/10 bg-stage-850 text-bone">
            <SelectItem value="all">All genres</SelectItem>
            {genres.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}
          </SelectContent>
        </Select>

        <div className="flex gap-1.5" role="group" aria-label="Difficulty">
          {DIFFICULTIES.map((d) => (
            <button
              key={d}
              onClick={() => setDifficulty(difficulty === d ? null : d)}
              aria-pressed={difficulty === d}
              className={cn(
                "rounded-full border px-3 py-2 text-xs transition-all",
                difficulty === d ? "border-spot-400/50 bg-spot-400/15 text-spot-100" : "border-white/[0.08] text-bone/55 hover:text-bone",
              )}
            >
              {d}
            </button>
          ))}
        </div>

        <div className="flex rounded-full border border-white/[0.08] bg-black/30 p-1" role="group" aria-label="View">
          {([["posters", LayoutGrid], ["table", Rows3]] as const).map(([v, Icon]) => (
            <button
              key={v}
              onClick={() => setView(v)}
              aria-pressed={view === v}
              aria-label={v === "posters" ? "Poster view" : "Table view"}
              className={cn("relative rounded-full p-2 transition-colors", view === v ? "text-stage-950" : "text-bone/50 hover:text-bone")}
            >
              {view === v && <motion.span layoutId="view-toggle" className="absolute inset-0 rounded-full bg-spot-300" transition={{ type: "spring", stiffness: 400, damping: 32 }} />}
              <Icon className="relative h-4 w-4" />
            </button>
          ))}
        </div>
      </div>

      {/* Result line */}
      <div className="-mt-3 flex items-center justify-between text-sm text-bone/45">
        <span>{resultCount} {resultCount === 1 ? "script" : "scripts"}</span>
        {filtersActive && (
          <button onClick={clearFilters} className="inline-flex items-center gap-1 text-spot-300/80 hover:text-spot-200">
            <X className="h-3.5 w-3.5" /> Clear filters
          </button>
        )}
      </div>

      {/* Results */}
      {tab === "my-scripts" && loadingMine ? (
        <div className="flex flex-col items-center py-24 text-bone/40">
          <Loader2 className="mb-3 h-8 w-8 animate-spin text-spot-300" /> Loading your scripts…
        </div>
      ) : resultCount === 0 ? (
        <div className="panel flex flex-col items-center px-6 py-20 text-center">
          <Film className="h-12 w-12 text-bone/15" />
          <h3 className="mt-4 font-display text-2xl text-bone">
            {tab === "my-scripts" && userScripts.length === 0 ? "Your shelf is empty" : "No scripts match"}
          </h3>
          <p className="mt-2 max-w-sm text-bone/50">
            {tab === "my-scripts" && userScripts.length === 0
              ? "Upload a script (a .txt file or pasted text) and it will be split into scenes you can rehearse."
              : "Try a different search, genre or difficulty."}
          </p>
          {tab === "my-scripts" && userScripts.length === 0 ? (
            <button onClick={() => setShowUpload(true)} className="btn-spotlight mt-6 px-5 py-2.5 text-sm"><Plus className="h-4 w-4" /> Upload a script</button>
          ) : (
            <button onClick={clearFilters} className="mt-6 rounded-full border border-white/10 px-5 py-2.5 text-sm text-bone/80 hover:border-white/25">Clear filters</button>
          )}
        </div>
      ) : view === "posters" ? (
        <motion.div layout className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          <AnimatePresence mode="popLayout">
            {posterRows.map((row) => (
              <motion.div
                key={row.original.id}
                layout
                initial={{ opacity: 0, scale: 0.94 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.94 }}
                transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                className="relative"
              >
                <FilmPoster script={row.original} />
                {tab === "my-scripts" && (
                  <button
                    onClick={() => setToDelete(row.original)}
                    className="absolute bottom-4 right-4 z-10 rounded-full bg-black/50 p-2 text-bone/60 backdrop-blur transition-colors hover:bg-velvet-600/30 hover:text-velvet-200"
                    aria-label={`Delete ${row.original.title}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      ) : (
        <div className="panel overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                {table.getHeaderGroups().map((hg) => (
                  <TableRow key={hg.id} className="border-white/[0.06] hover:bg-transparent">
                    {hg.headers.map((h) => (
                      <TableHead key={h.id} className="h-12 text-xs font-medium uppercase tracking-wider text-bone/45">
                        {flexRender(h.column.columnDef.header, h.getContext())}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {table.getRowModel().rows.map((row) => (
                  <TableRow key={row.id} className="border-white/[0.05] transition-colors hover:bg-white/[0.025]">
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id} className="py-3">{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="flex items-center justify-between border-t border-white/[0.06] px-5 py-3 text-sm text-bone/50">
            <span>
              Page {table.getState().pagination.pageIndex + 1} of {Math.max(1, table.getPageCount())}
            </span>
            <div className="flex gap-2">
              <button onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()} className="rounded-full border border-white/10 p-2 transition-colors hover:border-white/25 disabled:opacity-30" aria-label="Previous page">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button onClick={() => table.nextPage()} disabled={!table.getCanNextPage()} className="rounded-full border border-white/10 p-2 transition-colors hover:border-white/25 disabled:opacity-30" aria-label="Next page">
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {showUpload && <UploadScriptModal onClose={() => setShowUpload(false)} />}

      <AlertDialog open={toDelete !== null} onOpenChange={(open) => !open && setToDelete(null)}>
        <AlertDialogContent className="border-white/10 bg-stage-850 text-bone">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display text-2xl">Strike this script?</AlertDialogTitle>
            <AlertDialogDescription className="text-bone/55">
              &ldquo;{toDelete?.title}&rdquo; and all its scenes will be removed from your shelf. This can&apos;t be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-full border-white/10 bg-transparent text-bone hover:bg-white/5 hover:text-bone">Keep it</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} disabled={deleting} className="btn-velvet px-5">
              {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />} Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

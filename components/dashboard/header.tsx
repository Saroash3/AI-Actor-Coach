"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Bell, Search, LogOut, User as UserIcon, TrendingUp } from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { useAuth } from "@/lib/auth-context"
import { getUserInitials } from "@/lib/auth"

export function DashboardHeader() {
  const { user, logout } = useAuth()
  const router = useRouter()
  const [query, setQuery] = useState("")

  const initials = user ? getUserInitials(user.name) : "?"

  // Search goes straight to the script library, pre-filtered
  const onSearch = (e: React.FormEvent) => {
    e.preventDefault()
    const q = query.trim()
    router.push(q ? `/dashboard/scripts?q=${encodeURIComponent(q)}` : "/dashboard/scripts")
  }

  return (
    <header className="sticky top-0 z-30 border-b border-white/[0.06] bg-stage-950/70 backdrop-blur-xl">
      <div className="flex h-16 items-center justify-between gap-4 px-6 lg:px-10">
        <form onSubmit={onSearch} className="relative ml-12 hidden max-w-md flex-1 md:flex lg:ml-0" role="search">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-bone/30" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search screenplays…"
            className="h-10 w-full rounded-full border border-white/[0.08] bg-white/[0.03] pl-11 pr-4 text-sm text-bone placeholder:text-bone/30 outline-none transition-colors focus:border-spot-400/40 focus:bg-white/[0.05]"
          />
        </form>
        <div className="md:hidden" />

        <div className="flex items-center gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <button className="relative rounded-full p-2.5 text-bone/60 transition-colors hover:bg-white/5 hover:text-bone" aria-label="Notifications">
                <Bell className="h-5 w-5" />
              </button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-72 border-white/10 bg-stage-850 p-0 text-bone">
              <div className="border-b border-white/[0.06] px-4 py-3 text-sm font-medium">Notes from backstage</div>
              <div className="px-4 py-8 text-center">
                <Bell className="mx-auto h-6 w-6 text-bone/20" />
                <p className="mt-2 text-sm text-bone/50">Nothing new. Go rehearse a scene!</p>
              </div>
            </PopoverContent>
          </Popover>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="rounded-full ring-2 ring-spot-400/25 ring-offset-2 ring-offset-stage-950 transition-shadow hover:ring-spot-400/60" aria-label="Account menu">
                <Avatar className="h-9 w-9">
                  <AvatarFallback className="bg-gradient-to-b from-spot-300 to-spot-600 text-sm font-semibold text-stage-950">{initials}</AvatarFallback>
                </Avatar>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 border-white/10 bg-stage-850 text-bone">
              <DropdownMenuLabel className="font-normal">
                <p className="text-sm font-medium">{user?.name ?? "Actor"}</p>
                <p className="truncate text-xs text-bone/50">{user?.email}</p>
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-white/10" />
              <DropdownMenuItem asChild className="cursor-pointer focus:bg-white/5 focus:text-bone">
                <Link href="/dashboard/profile"><UserIcon className="mr-2 h-4 w-4" /> Profile</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild className="cursor-pointer focus:bg-white/5 focus:text-bone">
                <Link href="/dashboard/progress"><TrendingUp className="mr-2 h-4 w-4" /> Progress</Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-white/10" />
              <DropdownMenuItem
                onClick={() => { logout(); router.push("/") }}
                className="cursor-pointer text-velvet-300 focus:bg-velvet-600/10 focus:text-velvet-200"
              >
                <LogOut className="mr-2 h-4 w-4" /> Exit stage
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}

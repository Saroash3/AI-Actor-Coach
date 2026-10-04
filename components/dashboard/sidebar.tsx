"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { motion } from "framer-motion"
import {
  LayoutDashboard, Library, Clapperboard, BarChart3, TrendingUp,
  Users, ClipboardList, User, LogOut, Menu, X,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useAuth } from "@/lib/auth-context"
import { Logo } from "@/components/brand/logo"

const SECTIONS = [
  {
    title: "Rehearse",
    items: [
      { href: "/dashboard",           icon: LayoutDashboard, label: "Backstage" },
      { href: "/dashboard/scripts",   icon: Library,         label: "Script Library" },
      { href: "/dashboard/practice",  icon: Clapperboard,    label: "Practice Session" },
    ],
  },
  {
    title: "Review",
    items: [
      { href: "/dashboard/analysis",  icon: BarChart3,  label: "Performance Analysis" },
      { href: "/dashboard/progress",  icon: TrendingUp, label: "Progress Tracker" },
    ],
  },
  {
    title: "Company",
    items: [
      { href: "/dashboard/community",   icon: Users,         label: "Community Feedback" },
      { href: "/dashboard/assignments", icon: ClipboardList, label: "Assignments" },
      { href: "/dashboard/profile",     icon: User,          label: "Profile" },
    ],
  },
]

function isActive(pathname: string, href: string) {
  return href === "/dashboard" ? pathname === href : pathname.startsWith(href)
}

export function DashboardSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { logout } = useAuth()
  const [mobileOpen, setMobileOpen] = useState(false)

  const handleLogout = () => {
    logout()
    router.push("/")
  }

  return (
    <>
      <button
        className="fixed left-4 top-4 z-50 rounded-full border border-white/10 bg-stage-900/80 p-2.5 text-bone backdrop-blur-xl lg:hidden"
        onClick={() => setMobileOpen(!mobileOpen)}
        aria-label={mobileOpen ? "Close menu" : "Open menu"}
      >
        {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-stage-950/80 backdrop-blur-sm lg:hidden" onClick={() => setMobileOpen(false)} />
      )}

      <aside
        className={cn(
          "fixed left-0 top-0 z-40 h-screen w-64 border-r border-white/[0.06] bg-stage-900/95 backdrop-blur-2xl transition-transform duration-300 lg:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        {/* a faint spotlight from the top of the wing */}
        <div className="pointer-events-none absolute -top-24 left-1/2 h-64 w-64 -translate-x-1/2 rounded-full bg-spot-400/[0.07] blur-3xl" aria-hidden />

        <div className="relative flex h-full flex-col">
          <div className="px-6 pb-6 pt-7">
            <Logo href="/dashboard" />
          </div>

          <nav className="flex-1 space-y-7 overflow-y-auto px-3 pb-6">
            {SECTIONS.map((section) => (
              <div key={section.title}>
                <p className="mb-2 px-4 text-[10px] font-semibold uppercase tracking-[0.25em] text-bone/30">{section.title}</p>
                <div className="space-y-0.5">
                  {section.items.map((item) => {
                    const active = isActive(pathname, item.href)
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setMobileOpen(false)}
                        className={cn(
                          "relative flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm transition-colors duration-200",
                          active ? "text-bone" : "text-bone/50 hover:bg-white/[0.03] hover:text-bone/85",
                        )}
                      >
                        {active && (
                          <motion.span
                            layoutId="sidebar-active"
                            className="absolute inset-0 rounded-xl border border-spot-400/20 bg-gradient-to-r from-spot-400/[0.14] to-transparent"
                            transition={{ type: "spring", stiffness: 380, damping: 32 }}
                          >
                            <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-spot-300 shadow-[0_0_12px_rgba(241,205,114,0.8)]" />
                          </motion.span>
                        )}
                        <item.icon className={cn("relative h-[18px] w-[18px]", active && "text-spot-300")} />
                        <span className="relative">{item.label}</span>
                      </Link>
                    )
                  })}
                </div>
              </div>
            ))}
          </nav>

          <div className="border-t border-white/[0.06] p-3">
            <button
              onClick={handleLogout}
              className="flex w-full items-center gap-3 rounded-xl px-4 py-2.5 text-sm text-bone/50 transition-colors hover:bg-velvet-600/10 hover:text-velvet-300"
            >
              <LogOut className="h-[18px] w-[18px]" />
              Exit stage
            </button>
          </div>
        </div>
      </aside>
    </>
  )
}

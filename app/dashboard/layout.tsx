import { DashboardSidebar } from "@/components/dashboard/sidebar"
import { DashboardHeader } from "@/components/dashboard/header"
import { AuthGuard } from "@/components/auth-guard"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <AuthGuard>
      <div className="relative min-h-screen bg-stage-950">
        {/* stage lighting: a gold key light and a velvet fill */}
        <div className="pointer-events-none fixed inset-0" aria-hidden>
          <div className="absolute -top-40 right-[10%] h-[700px] w-[700px] rounded-full bg-spot-400/[0.05] blur-[160px]" />
          <div className="absolute -bottom-40 left-[15%] h-[500px] w-[500px] rounded-full bg-velvet-700/[0.08] blur-[160px]" />
        </div>

        <DashboardSidebar />
        <div className="relative z-10 lg:pl-64">
          <DashboardHeader />
          <main className="px-6 py-8 lg:px-10">{children}</main>
        </div>
      </div>
    </AuthGuard>
  )
}

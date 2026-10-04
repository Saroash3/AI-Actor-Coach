"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Plus, Calendar, User, BookOpen, Clock, CheckCircle, AlertCircle, Hourglass, Search } from "lucide-react"

const assignments = [
  {
    id: 1,
    script: "Hamlet",
    scene: "Act III, Scene 1",
    student: "John Doe",
    deadline: "Mar 15, 2024",
    status: "completed",
  },
  {
    id: 2,
    script: "Romeo and Juliet",
    scene: "Act II, Scene 2",
    student: "Sarah Mitchell",
    deadline: "Mar 18, 2024",
    status: "in-progress",
  },
  {
    id: 3,
    script: "Macbeth",
    scene: "Act I, Scene 7",
    student: "Michael Chen",
    deadline: "Mar 20, 2024",
    status: "pending",
  },
  {
    id: 4,
    script: "A Streetcar Named Desire",
    scene: "Scene 4",
    student: "Emily Rodriguez",
    deadline: "Mar 22, 2024",
    status: "overdue",
  },
  {
    id: 5,
    script: "The Glass Menagerie",
    scene: "Scene 7",
    student: "James Lee",
    deadline: "Mar 25, 2024",
    status: "pending",
  },
]

const statusConfig = {
  completed: {
    label: "Completed",
    icon: CheckCircle,
    className: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  },
  "in-progress": {
    label: "In Progress",
    icon: Hourglass,
    className: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  },
  pending: {
    label: "Pending",
    icon: Clock,
    className: "bg-white/5 text-white/40 border-white/10",
  },
  overdue: {
    label: "Overdue",
    icon: AlertCircle,
    className: "bg-red-500/10 text-red-400 border-red-500/20",
  },
}

export default function AssignmentsPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl text-bone">Assignments</h1>
          <p className="text-white/50">Manage and track your practice assignments</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-b from-spot-300 to-spot-500 !text-stage-950 hover:from-spot-200 hover:to-spot-400 text-white rounded-full shadow-lg shadow-spot-500/25">
              <Plus className="w-4 h-4 mr-2" />
              Assign Scene
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-[#0f172a] border-white/10 text-white">
            <DialogHeader>
              <DialogTitle>Create New Assignment</DialogTitle>
              <DialogDescription className="text-white/50">
                Assign a scene to a student for practice
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="script" className="text-white/70">Script</Label>
                <Select>
                  <SelectTrigger className="bg-white/5 border-white/10 text-white">
                    <SelectValue placeholder="Select a script" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1e293b] border-white/10 text-white">
                    <SelectItem value="hamlet">Hamlet</SelectItem>
                    <SelectItem value="romeo">Romeo and Juliet</SelectItem>
                    <SelectItem value="macbeth">Macbeth</SelectItem>
                    <SelectItem value="streetcar">A Streetcar Named Desire</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="scene" className="text-white/70">Scene</Label>
                <Select>
                  <SelectTrigger className="bg-white/5 border-white/10 text-white">
                    <SelectValue placeholder="Select a scene" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1e293b] border-white/10 text-white">
                    <SelectItem value="scene1">Act I, Scene 1</SelectItem>
                    <SelectItem value="scene2">Act I, Scene 2</SelectItem>
                    <SelectItem value="scene3">Act II, Scene 1</SelectItem>
                    <SelectItem value="scene4">Act II, Scene 2</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="student" className="text-white/70">Student</Label>
                <Select>
                  <SelectTrigger className="bg-white/5 border-white/10 text-white">
                    <SelectValue placeholder="Select a student" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1e293b] border-white/10 text-white">
                    <SelectItem value="john">John Doe</SelectItem>
                    <SelectItem value="sarah">Sarah Mitchell</SelectItem>
                    <SelectItem value="michael">Michael Chen</SelectItem>
                    <SelectItem value="emily">Emily Rodriguez</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="deadline" className="text-white/70">Deadline</Label>
                <Input type="date" id="deadline" className="bg-white/5 border-white/10 text-white" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)} className="border-white/10 text-white hover:bg-white/5">
                Cancel
              </Button>
              <Button onClick={() => setIsDialogOpen(false)} className="bg-spot-600 hover:bg-spot-500 text-white">
                Create Assignment
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Assignments", value: assignments.length, icon: BookOpen, color: "text-spot-400", bg: "bg-spot-500/10" },
          { label: "Completed", value: assignments.filter((a) => a.status === "completed").length, icon: CheckCircle, color: "text-emerald-400", bg: "bg-emerald-500/10" },
          { label: "In Progress", value: assignments.filter((a) => a.status === "in-progress").length, icon: Hourglass, color: "text-blue-400", bg: "bg-blue-500/10" },
          { label: "Overdue", value: assignments.filter((a) => a.status === "overdue").length, icon: AlertCircle, color: "text-red-400", bg: "bg-red-500/10" },
        ].map((stat, i) => (
          <div key={i} className="p-6 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10">
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-xl ${stat.bg}`}>
                <stat.icon className={`w-5 h-5 ${stat.color}`} />
              </div>
              <div>
                <p className="text-sm text-white/50">{stat.label}</p>
                <p className="text-2xl font-bold text-white">{stat.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Filter & Table Area */}
      <div className="p-6 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <h2 className="font-display text-xl text-bone">Recent Assignments</h2>
          <div className="relative max-w-sm w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
            <Input 
              placeholder="Search by student or script..." 
              className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/30 rounded-xl"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
        
        <div className="overflow-x-auto -mx-6 px-6">
          <Table>
            <TableHeader>
              <TableRow className="border-white/5 hover:bg-transparent">
                <TableHead className="text-white/40 font-medium">Script</TableHead>
                <TableHead className="text-white/40 font-medium">Scene</TableHead>
                <TableHead className="text-white/40 font-medium">Student</TableHead>
                <TableHead className="text-white/40 font-medium">Deadline</TableHead>
                <TableHead className="text-white/40 font-medium">Status</TableHead>
                <TableHead className="text-white/40 font-medium text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {assignments.map((assignment) => {
                const status = statusConfig[assignment.status as keyof typeof statusConfig]
                const StatusIcon = status.icon
                return (
                  <TableRow key={assignment.id} className="border-white/5 hover:bg-white/5 transition-colors">
                    <TableCell className="font-medium text-white">{assignment.script}</TableCell>
                    <TableCell className="text-white/60">{assignment.scene}</TableCell>
                    <TableCell className="text-white/60">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-spot-400/30 to-spot-600/30 flex items-center justify-center text-[10px] text-white">
                          {assignment.student.split(' ').map(n => n[0]).join('')}
                        </div>
                        {assignment.student}
                      </div>
                    </TableCell>
                    <TableCell className="text-white/60">{assignment.deadline}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`${status.className} rounded-full font-normal border`}>
                        <StatusIcon className="w-3 h-3 mr-1" />
                        {status.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" className="text-spot-400 hover:text-spot-300 hover:bg-spot-400/10 rounded-full">
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  )
}

"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { 
  Camera, 
  Save, 
  User, 
  Mail, 
  Lock,
  Award,
  Target,
  Video,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Play,
  Calendar,
  Activity
} from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { getUserInitials } from "@/lib/auth"
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip
} from "recharts"

const performanceSummary = {
  totalSessions: 24,
  averageScore: 78,
  emotionAccuracy: 82,
  completedAssignments: 8,
  rank: "Intermediate",
  memberSince: "January 2024",
}

const skillData = [
  { subject: 'Vocal Projection', A: 85, fullMark: 100 },
  { subject: 'Emotion Accuracy', A: 82, fullMark: 100 },
  { subject: 'Body Language', A: 70, fullMark: 100 },
  { subject: 'Timing & Pacing', A: 88, fullMark: 100 },
  { subject: 'Line Memorization', A: 95, fullMark: 100 },
]

const recentRecordings = [
  { id: 1, title: 'Hamlet - Act III, Scene 1', date: '2 hours ago', score: 85, emotion: 'Melancholy' },
  { id: 2, title: 'Romeo & Juliet - Balcony Scene', date: 'Yesterday', score: 92, emotion: 'Love' },
  { id: 3, title: 'The Crucible - Court Scene', date: '3 days ago', score: 78, emotion: 'Anger' },
]

const achievements = [
  { title: "First Performance", description: "Completed your first practice session", earned: true, progress: 100 },
  { title: "Emotion Master", description: "Achieved 80% emotion accuracy", earned: true, progress: 100 },
  { title: "Dedicated Learner", description: "Completed 10 practice sessions", earned: true, progress: 100 },
  { title: "Rising Star", description: "Receive 50 community likes", earned: false, progress: 40 },
  { title: "Perfect Score", description: "Score 100% on any performance", earned: false, progress: 95 },
]

// Generate fake heatmap data for the last 30 days
const generateActivityData = () => {
  const data = []
  const today = new Date()
  for (let i = 29; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    data.push({
      date: d,
      count: Math.floor(Math.random() * 5) // 0 to 4 sessions per day
    })
  }
  return data
}
const activityData = generateActivityData()

export default function ProfilePage() {
  const { user, updateProfile } = useAuth()
  const [isEditing, setIsEditing] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [formData, setFormData] = useState({
    name: user?.name || "",
    email: user?.email || "",
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  })

  const initials = user ? getUserInitials(user.name) : "?"

  const handleSave = () => {
    setError("")
    setSuccess("")

    // Validate passwords match  
    if (formData.newPassword && formData.newPassword !== formData.confirmPassword) {
      setError("New passwords do not match")
      return
    }

    const updates: { name?: string; email?: string; newPassword?: string; currentPassword?: string } = {}
    
    if (formData.name !== user?.name) updates.name = formData.name
    if (formData.email !== user?.email) updates.email = formData.email
    if (formData.newPassword) {
      updates.newPassword = formData.newPassword
      updates.currentPassword = formData.currentPassword
    }

    if (Object.keys(updates).length === 0) {
      setIsEditing(false)
      return
    }

    const result = updateProfile(updates)
    if (result.error) {
      setError(result.error)
      return
    }

    setSuccess("Profile updated successfully!")
    setIsEditing(false)
    setFormData(prev => ({ ...prev, currentPassword: "", newPassword: "", confirmPassword: "" }))
    setTimeout(() => setSuccess(""), 3000)
  }

  const handleCancel = () => {
    setIsEditing(false)
    setError("")
    setFormData({
      name: user?.name || "",
      email: user?.email || "",
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    })
  }

  // Get color intensity for heatmap based on count
  const getActivityColor = (count: number) => {
    if (count === 0) return 'bg-white/5 border-white/5'
    if (count === 1) return 'bg-spot-500/20 border-spot-500/20'
    if (count === 2) return 'bg-spot-500/40 border-spot-500/30'
    if (count === 3) return 'bg-spot-500/60 border-spot-500/40'
    return 'bg-spot-500 border-spot-400 shadow-[0_0_10px_rgba(168,85,247,0.4)]'
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-display text-4xl text-bone">Profile Dashboard</h1>
        <p className="text-white/50">Manage your settings and track your acting journey</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left Column: Profile Card & Heatmap */}
        <div className="lg:col-span-2 space-y-6">
          <div className="p-6 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 relative overflow-hidden">
            {/* Decorative background glow */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-spot-500/10 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2 pointer-events-none" />
            
            <div className="mb-6 relative z-10">
              <h2 className="font-display text-xl text-bone">Personal Information</h2>
              <p className="text-sm text-white/40">Update your profile details</p>
            </div>

            {/* Error/Success Messages */}
            {error && (
              <div className="flex items-center gap-2 p-3 mb-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm relative z-10">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {error}
              </div>
            )}
            {success && (
              <div className="flex items-center gap-2 p-3 mb-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm relative z-10">
                <CheckCircle className="w-4 h-4 shrink-0" />
                {success}
              </div>
            )}

            <div className="space-y-6 relative z-10">
              {/* Avatar & Basic Info */}
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
                <div className="relative group">
                  <Avatar className="w-28 h-28 border-[3px] border-spot-500/30 shadow-[0_0_30px_rgba(168,85,247,0.15)] transition-all duration-300 group-hover:border-spot-500/60">
                    <AvatarImage src="/placeholder-avatar.jpg" />
                    <AvatarFallback className="text-3xl bg-gradient-to-br from-spot-600 to-spot-600 text-white font-bold">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <button className="absolute bottom-1 right-1 p-2.5 bg-gradient-to-br from-spot-300 to-spot-600 text-white rounded-full shadow-lg hover:shadow-spot-500/40 transition-all hover:scale-110">
                    <Camera className="w-4 h-4" />
                  </button>
                </div>
                <div className="text-center sm:text-left flex-1">
                  <h3 className="text-2xl font-bold text-white mb-1">{user?.name || "User"}</h3>
                  <p className="text-white/60 mb-3 flex items-center justify-center sm:justify-start gap-2">
                    <Mail className="w-4 h-4" />
                    {user?.email || ""}
                  </p>
                  <div className="flex flex-wrap justify-center sm:justify-start gap-2">
                    <Badge className="bg-spot-500/10 text-spot-400 border border-spot-500/20 px-3 py-1">
                      <Target className="w-3 h-3 mr-1" />
                      {performanceSummary.rank}
                    </Badge>
                    <Badge className="bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 px-3 py-1 capitalize">
                      <User className="w-3 h-3 mr-1" />
                      {user?.role || "student"}
                    </Badge>
                    <Badge className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-3 py-1">
                      <Calendar className="w-3 h-3 mr-1" />
                      Since {performanceSummary.memberSince.split(" ")[1]}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Form Fields */}
              <div className="grid gap-5 pt-4 border-t border-white/5">
                <div className="grid sm:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-white/70">Full Name</Label>
                    <div className="relative">
                      <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        disabled={!isEditing}
                        className="pl-11 bg-white/5 border-white/10 text-white disabled:text-white/50 disabled:opacity-70 rounded-xl h-11 focus:border-spot-500/50"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-white/70">Email Address</Label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        disabled={!isEditing}
                        className="pl-11 bg-white/5 border-white/10 text-white disabled:text-white/50 disabled:opacity-70 rounded-xl h-11 focus:border-spot-500/50"
                      />
                    </div>
                  </div>
                </div>

                {isEditing && (
                  <div className="bg-black/20 p-5 rounded-xl border border-white/5 mt-2">
                    <h4 className="font-medium text-white mb-4 flex items-center gap-2">
                      <Lock className="w-4 h-4 text-spot-400" />
                      Change Password
                    </h4>
                    <div className="grid gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="currentPassword" className="text-white/70">Current Password</Label>
                        <Input
                          id="currentPassword"
                          type="password"
                          value={formData.currentPassword}
                          onChange={(e) => setFormData({ ...formData, currentPassword: e.target.value })}
                          className="bg-white/5 border-white/10 text-white rounded-xl h-11 focus:border-spot-500/50"
                          placeholder="Required to change password"
                        />
                      </div>
                      <div className="grid sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="newPassword" className="text-white/70">New Password</Label>
                          <Input
                            id="newPassword"
                            type="password"
                            value={formData.newPassword}
                            onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
                            className="bg-white/5 border-white/10 text-white rounded-xl h-11 focus:border-spot-500/50"
                            placeholder="Min. 6 characters"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="confirmPassword" className="text-white/70">Confirm New Password</Label>
                          <Input
                            id="confirmPassword"
                            type="password"
                            value={formData.confirmPassword}
                            onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                            className="bg-white/5 border-white/10 text-white rounded-xl h-11 focus:border-spot-500/50"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-2">
                {isEditing ? (
                  <>
                    <Button variant="outline" onClick={handleCancel} className="border-white/10 text-white/60 hover:text-white hover:bg-white/5 rounded-xl px-6">
                      Cancel
                    </Button>
                    <Button onClick={handleSave} className="bg-gradient-to-b from-spot-300 to-spot-500 !text-stage-950 hover:from-spot-200 hover:to-spot-400 text-white rounded-xl shadow-lg shadow-spot-500/25 px-6">
                      <Save className="w-4 h-4 mr-2" />
                      Save Changes
                    </Button>
                  </>
                ) : (
                  <Button onClick={() => setIsEditing(true)} className="bg-gradient-to-b from-spot-300 to-spot-500 !text-stage-950 hover:from-spot-200 hover:to-spot-400 text-white rounded-xl shadow-lg shadow-spot-500/25 px-6">
                    Edit Profile
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Activity Heatmap */}
          <div className="p-6 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-emerald-400" />
                <h2 className="font-display text-xl text-bone">Activity Heatmap</h2>
              </div>
              <span className="text-sm text-white/50">Last 30 days</span>
            </div>
            
            <div className="overflow-x-auto pb-2">
              <div className="flex flex-wrap gap-1.5 min-w-[500px]">
                {activityData.map((day, i) => (
                  <div
                    key={i}
                    title={`${day.date.toDateString()}: ${day.count} sessions`}
                    className={`w-[calc(100%/15-6px)] aspect-square rounded-md border ${getActivityColor(day.count)} transition-all hover:scale-110 cursor-help`}
                  />
                ))}
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 mt-4 text-xs text-white/40">
              <span>Less</span>
              <div className="flex gap-1.5">
                {[0, 1, 2, 3, 4].map((i) => (
                  <div key={i} className={`w-3 h-3 rounded-sm border ${getActivityColor(i)}`} />
                ))}
              </div>
              <span>More</span>
            </div>
          </div>

          {/* Achievements */}
          <div className="p-6 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <Award className="w-5 h-5 text-orange-400" />
                <h2 className="font-display text-xl text-bone">Achievements</h2>
              </div>
              <span className="text-sm font-medium text-orange-400 bg-orange-500/10 px-3 py-1 rounded-full border border-orange-500/20">
                {achievements.filter(a => a.earned).length} / {achievements.length} Unlocked
              </span>
            </div>
            
            <div className="grid sm:grid-cols-2 gap-4">
              {achievements.map((achievement, index) => (
                <div
                  key={index}
                  className={`p-4 rounded-xl border relative overflow-hidden group ${
                    achievement.earned
                      ? "bg-gradient-to-br from-spot-500/10 to-transparent border-spot-500/20"
                      : "bg-white/[0.02] border-white/5"
                  }`}
                >
                  {achievement.earned && (
                    <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-bl from-spot-500/20 to-transparent rounded-bl-full pointer-events-none" />
                  )}
                  
                  <div className="flex items-start gap-4">
                    <div
                      className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 shadow-inner ${
                        achievement.earned 
                          ? "bg-gradient-to-br from-spot-300 to-spot-600 text-white shadow-spot-500/20" 
                          : "bg-white/5 text-white/20"
                      }`}
                    >
                      <Award className={`w-6 h-6 ${!achievement.earned && "opacity-50 grayscale"}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`font-semibold truncate ${achievement.earned ? "text-white" : "text-white/60"}`}>
                        {achievement.title}
                      </p>
                      <p className="text-xs text-white/40 mt-1 line-clamp-2">
                        {achievement.description}
                      </p>
                      
                      {!achievement.earned && (
                        <div className="mt-3">
                          <div className="flex justify-between text-[10px] text-white/40 mb-1">
                            <span>Progress</span>
                            <span>{achievement.progress}%</span>
                          </div>
                          <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-gradient-to-r from-orange-500/50 to-orange-400 rounded-full" 
                              style={{ width: `${achievement.progress}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Stats & Recent Recordings */}
        <div className="space-y-6">
          {/* Radar Chart (Skills Breakdown) */}
          <div className="p-6 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-5 h-5 text-spot-400" />
              <h2 className="font-display text-xl text-bone">Skill Breakdown</h2>
            </div>
            <p className="text-xs text-white/40 mb-6">Based on AI analysis across all sessions</p>
            
            <div className="h-64 w-full relative">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="70%" data={skillData}>
                  <PolarGrid stroke="rgba(255,255,255,0.1)" />
                  <PolarAngleAxis 
                    dataKey="subject" 
                    tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 10, fontWeight: 500 }} 
                  />
                  <PolarRadiusAxis 
                    angle={30} 
                    domain={[0, 100]} 
                    tick={false} 
                    axisLine={false} 
                  />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#12162a', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '8px' }}
                    itemStyle={{ color: '#a855f7' }}
                  />
                  <Radar 
                    name="Skills" 
                    dataKey="A" 
                    stroke="#a855f7" 
                    fill="#a855f7" 
                    fillOpacity={0.4} 
                  />
                </RadarChart>
              </ResponsiveContainer>
              {/* Inner glow behind the chart */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 bg-spot-500/20 rounded-full blur-[40px] pointer-events-none" />
            </div>
          </div>

          {/* Performance Summary Stats */}
          <div className="p-6 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10">
            <h2 className="font-display text-xl text-bone mb-6">Overall Stats</h2>
            
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="p-4 rounded-xl bg-gradient-to-br from-spot-400/10 to-spot-600/10 border border-spot-500/20 text-center">
                <span className="text-3xl font-bold text-white block mb-1">
                  {performanceSummary.averageScore}<span className="text-lg text-white/50">%</span>
                </span>
                <span className="text-xs text-spot-300 font-medium tracking-wide uppercase">Avg Score</span>
              </div>
              <div className="p-4 rounded-xl bg-gradient-to-br from-cyan-500/10 to-emerald-500/10 border border-cyan-500/20 text-center">
                <span className="text-3xl font-bold text-white block mb-1">
                  {performanceSummary.emotionAccuracy}<span className="text-lg text-white/50">%</span>
                </span>
                <span className="text-xs text-cyan-300 font-medium tracking-wide uppercase">Emotion Acc</span>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-lg bg-white/[0.03] border border-white/5">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/5 rounded-lg"><Video className="w-4 h-4 text-white/60" /></div>
                  <span className="text-sm text-white/70">Total Practice Sessions</span>
                </div>
                <span className="font-bold text-white text-lg">{performanceSummary.totalSessions}</span>
              </div>
              
              <div className="flex items-center justify-between p-3 rounded-lg bg-white/[0.03] border border-white/5">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/5 rounded-lg"><Target className="w-4 h-4 text-white/60" /></div>
                  <span className="text-sm text-white/70">Assignments Done</span>
                </div>
                <div className="text-right">
                  <span className="font-bold text-white text-lg">{performanceSummary.completedAssignments}</span>
                  <span className="text-xs text-white/40 ml-1">/ 12</span>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Recordings */}
          <div className="p-6 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-display text-xl text-bone">Recent Recordings</h2>
              <Button variant="link" className="text-spot-400 h-auto p-0 text-xs">View all</Button>
            </div>

            <div className="space-y-3">
              {recentRecordings.map((recording) => (
                <div key={recording.id} className="group p-3 rounded-xl bg-white/[0.02] border border-white/5 hover:border-spot-500/30 hover:bg-white/5 transition-all flex gap-3">
                  <div className="w-16 h-12 bg-black/40 rounded-lg flex items-center justify-center shrink-0 border border-white/10 relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                    <Play className="w-5 h-5 text-white/80 group-hover:text-white group-hover:scale-110 transition-all z-10" fill="currentColor" />
                  </div>
                  <div className="flex-1 min-w-0 flex flex-col justify-center">
                    <p className="text-sm font-medium text-white truncate">{recording.title}</p>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-xs text-white/40">{recording.date}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] px-1.5 py-0.5 rounded uppercase tracking-wider bg-white/10 text-white/60">{recording.emotion}</span>
                        <span className="text-xs font-semibold text-emerald-400">{recording.score}%</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}

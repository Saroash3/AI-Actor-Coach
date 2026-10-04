"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { TrendingUp, Target, Smile, Mic, Calendar, Award, CheckCircle2, Clock } from "lucide-react"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from "recharts"

const weeklyPerformance = [
  { week: "Week 1", score: 62 },
  { week: "Week 2", score: 68 },
  { week: "Week 3", score: 65 },
  { week: "Week 4", score: 72 },
  { week: "Week 5", score: 75 },
  { week: "Week 6", score: 78 },
  { week: "Week 7", score: 82 },
  { week: "Week 8", score: 78 },
]

const emotionProgress = [
  { month: "Jan", accuracy: 55 },
  { month: "Feb", accuracy: 62 },
  { month: "Mar", accuracy: 68 },
  { month: "Apr", accuracy: 74 },
  { month: "May", accuracy: 79 },
  { month: "Jun", accuracy: 82 },
]

const voiceProgress = [
  { month: "Jan", clarity: 60, pitch: 55, tone: 58 },
  { month: "Feb", clarity: 65, pitch: 60, tone: 62 },
  { month: "Mar", clarity: 70, pitch: 68, tone: 65 },
  { month: "Apr", clarity: 75, pitch: 72, tone: 70 },
  { month: "May", clarity: 82, pitch: 78, tone: 76 },
  { month: "Jun", clarity: 88, pitch: 81, tone: 80 },
]

const milestones = [
  { title: "First Practice Session", date: "Jan 15", achieved: true, type: "milestone" },
  { title: "10 Sessions Completed", date: "Feb 8", achieved: true, type: "milestone" },
  { title: "75% Average Score", date: "Mar 22", achieved: true, type: "performance" },
  { title: "25 Sessions Completed", date: "May 5", achieved: true, type: "milestone" },
  { title: "80% Emotion Accuracy", date: "Jun 1", achieved: true, type: "performance" },
  { title: "50 Sessions Completed", date: "In Progress", achieved: false, type: "milestone" },
]

export default function ProgressTrackerPage() {
  return (
    <div className="space-y-8 pb-10">
      {/* Header */}
      <div className="relative overflow-hidden p-8 rounded-3xl bg-gradient-to-r from-spot-500/10 via-spot-500/10 to-transparent border border-white/5">
        <div className="relative z-10">
          <h1 className="font-display text-4xl text-bone mb-2 tracking-tight">Progress Tracker</h1>
          <p className="text-white/60 text-lg">Visualize your journey to becoming a master actor</p>
        </div>
        <div className="absolute top-0 right-0 w-64 h-64 bg-spot-500/20 blur-[100px] -mr-32 -mt-32 rounded-full" />
      </div>

      {/* Stats Overview */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: "Overall Progress", value: "+26%", icon: TrendingUp, color: "from-spot-300 to-spot-600", bg: "bg-spot-500/10" },
          { label: "Current Average", value: "78%", icon: Target, color: "from-blue-500 to-cyan-500", bg: "bg-blue-500/10" },
          { label: "Sessions Month", value: "12", icon: Calendar, color: "from-pink-500 to-spot-500", bg: "bg-pink-500/10" },
          { label: "Milestones", value: "5", icon: Award, color: "from-amber-500 to-orange-500", bg: "bg-amber-500/10" },
        ].map((stat, i) => (
          <Card key={i} className="group overflow-hidden border-white/5 bg-white/[0.03] backdrop-blur-xl hover:bg-white/[0.06] transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className={`p-4 rounded-2xl ${stat.bg} group-hover:scale-110 transition-transform duration-300`}>
                  <stat.icon className={`w-6 h-6 text-white`} />
                </div>
                <div>
                  <p className="text-sm font-medium text-white/40 uppercase tracking-wider">{stat.label}</p>
                  <p className="text-3xl font-bold text-white mt-0.5">{stat.value}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Grid */}
      <div className="grid lg:grid-cols-2 gap-8">
        {/* Weekly Performance Chart */}
        <Card className="border-white/5 bg-white/[0.02] backdrop-blur-xl overflow-hidden">
          <CardHeader className="border-b border-white/5 pb-8">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl flex items-center gap-2 text-white">
                  <TrendingUp className="w-5 h-5 text-spot-400" />
                  Weekly Performance
                </CardTitle>
                <CardDescription className="text-white/40 mt-1">Consistency and growth over 8 weeks</CardDescription>
              </div>
              <Badge variant="outline" className="bg-spot-500/10 text-spot-400 border-spot-500/20">
                Live Data
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-8">
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={weeklyPerformance}>
                  <defs>
                    <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#a855f7" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis 
                    dataKey="week" 
                    tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 12 }}
                    axisLine={false}
                    tickLine={false}
                    dy={10}
                  />
                  <YAxis 
                    tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 12 }}
                    axisLine={false}
                    tickLine={false}
                    dx={-10}
                    domain={[50, 100]}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(15, 15, 25, 0.95)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '16px',
                      boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
                      backdropFilter: 'blur(10px)'
                    }}
                    itemStyle={{ color: '#fff' }}
                    labelStyle={{ color: 'rgba(255,255,255,0.6)', marginBottom: '4px' }}
                  />
                  <Area
                    type="monotone"
                    dataKey="score"
                    stroke="#a855f7"
                    strokeWidth={4}
                    fill="url(#colorScore)"
                    animationDuration={2000}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Emotion Recognition Progress */}
        <Card className="border-white/5 bg-white/[0.02] backdrop-blur-xl overflow-hidden">
          <CardHeader className="border-b border-white/5 pb-8">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl flex items-center gap-2 text-white">
                  <Smile className="w-5 h-5 text-blue-400" />
                  Emotion Accuracy
                </CardTitle>
                <CardDescription className="text-white/40 mt-1">Accuracy in recognizing and portraying emotions</CardDescription>
              </div>
              <Badge variant="outline" className="bg-blue-500/10 text-blue-400 border-blue-500/20">
                +12% Trend
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-8">
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={emotionProgress}>
                  <defs>
                    <linearGradient id="colorEmotion" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis 
                    dataKey="month" 
                    tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 12 }}
                    axisLine={false}
                    tickLine={false}
                    dy={10}
                  />
                  <YAxis 
                    tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 12 }}
                    axisLine={false}
                    tickLine={false}
                    dx={-10}
                    domain={[40, 100]}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(15, 15, 25, 0.95)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '16px',
                      backdropFilter: 'blur(10px)'
                    }}
                    itemStyle={{ color: '#fff' }}
                  />
                  <Area
                    type="monotone"
                    dataKey="accuracy"
                    stroke="#3b82f6"
                    strokeWidth={4}
                    fill="url(#colorEmotion)"
                    animationDuration={2500}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Voice Modulation Progress */}
        <Card className="border-white/5 bg-white/[0.02] backdrop-blur-xl">
          <CardHeader>
            <CardTitle className="text-xl flex items-center gap-2 text-white">
              <Mic className="w-5 h-5 text-cyan-400" />
              Voice Modulation
            </CardTitle>
            <CardDescription className="text-white/40">Clarity, pitch stability, and tone match</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={voiceProgress}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis 
                    dataKey="month" 
                    tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 12 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis 
                    tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 12 }}
                    axisLine={false}
                    tickLine={false}
                    domain={[40, 100]}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(15, 15, 25, 0.95)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '16px',
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="clarity"
                    stroke="#22d3ee"
                    strokeWidth={3}
                    dot={{ fill: '#22d3ee', strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6, strokeWidth: 0 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="pitch"
                    stroke="#818cf8"
                    strokeWidth={3}
                    dot={{ fill: '#818cf8', strokeWidth: 2, r: 4 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="tone"
                    stroke="#c084fc"
                    strokeWidth={3}
                    dot={{ fill: '#c084fc', strokeWidth: 2, r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-center gap-8 mt-6">
              {[
                { label: 'Clarity', color: 'bg-cyan-400' },
                { label: 'Pitch', color: 'bg-indigo-400' },
                { label: 'Tone', color: 'bg-spot-400' },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${item.color} shadow-lg shadow-${item.color.split('-')[1]}-500/20`} />
                  <span className="text-sm font-medium text-white/60">{item.label}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Milestones */}
        <Card className="border-white/5 bg-white/[0.02] backdrop-blur-xl">
          <CardHeader>
            <CardTitle className="text-xl flex items-center gap-2 text-white">
              <Award className="w-5 h-5 text-amber-400" />
              Recent Achievements
            </CardTitle>
            <CardDescription className="text-white/40">Tracking your major professional milestones</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {milestones.map((milestone, index) => (
                <div
                  key={index}
                  className={`flex items-center gap-4 p-4 rounded-2xl transition-all duration-300 border border-transparent hover:border-white/5 group ${
                    milestone.achieved ? 'bg-white/[0.03]' : 'bg-transparent opacity-50'
                  }`}
                >
                  <div
                    className={`w-12 h-12 rounded-xl flex items-center justify-center transition-transform duration-300 group-hover:rotate-12 ${
                      milestone.achieved 
                        ? milestone.type === 'milestone' 
                          ? 'bg-spot-500/20 text-spot-400' 
                          : 'bg-green-500/20 text-green-400'
                        : 'bg-white/5 text-white/20'
                    }`}
                  >
                    {milestone.achieved ? (
                      <CheckCircle2 className="w-6 h-6" />
                    ) : (
                      <Clock className="w-6 h-6" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-white group-hover:text-spot-300 transition-colors">{milestone.title}</p>
                    <p className="text-sm text-white/40 font-medium">{milestone.date}</p>
                  </div>
                  {milestone.achieved ? (
                    <div className="flex flex-col items-end gap-1">
                      <Badge variant="outline" className="bg-spot-500/10 text-spot-400 border-spot-500/20 px-3 py-1">
                        Completed
                      </Badge>
                    </div>
                  ) : (
                    <Badge variant="outline" className="bg-white/5 text-white/40 border-white/10 px-3 py-1">
                      In Progress
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

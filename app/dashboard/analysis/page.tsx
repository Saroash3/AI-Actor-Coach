"use client"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  Play, 
  Smile, 
  Mic, 
  User, 
  TrendingUp,
  AlertCircle,
  CheckCircle,
  ChevronRight,
  Video
} from "lucide-react"

const performanceData = {
  overallScore: 78,
  scene: "Hamlet - Act III, Scene 1",
  date: "Today at 2:30 PM",
  duration: "5:42",
  emotions: {
    happiness: 45,
    sadness: 82,
    anger: 23,
    fear: 38,
    surprise: 55,
    contempt: 12,
    neutral: 67,
  },
  voice: {
    pitchStability: 76,
    toneMatch: 81,
    speechClarity: 88,
    pacing: 72,
  },
  bodyLanguage: {
    posture: 85,
    gestures: 71,
    movementControl: 78,
    eyeContact: 82,
  },
  suggestions: [
    {
      type: "improvement",
      title: "Vary your vocal pitch more",
      description: "Try to add more emotional range to your voice during the contemplative sections.",
    },
    {
      type: "improvement",
      title: "Slow down during key moments",
      description: "The pacing felt rushed during 'the heart-ache and thousand natural shocks'. Take your time.",
    },
    {
      type: "success",
      title: "Excellent emotional depth",
      description: "Your sadness conveyance was very authentic. The melancholy came through clearly.",
    },
    {
      type: "success",
      title: "Strong posture maintained",
      description: "You maintained a weighted, contemplative posture throughout the scene.",
    },
  ],
}

export default function PerformanceAnalysisPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl text-bone">Performance Analysis</h1>
          <p className="text-white/50">AI feedback on your latest performance</p>
        </div>
        <Button variant="outline" className="border-white/10 text-white hover:bg-white/5 rounded-full">
          View All Sessions
          <ChevronRight className="w-4 h-4 ml-1" />
        </Button>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Video Playback */}
        <div className="lg:col-span-1 space-y-4">
          <div className="rounded-2xl overflow-hidden bg-white/5 backdrop-blur-xl border border-white/10">
            <div className="aspect-video bg-gradient-to-br from-[#0d1120] to-[#151c32] flex items-center justify-center relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-spot-400/10 to-spot-600/10" />
              <div className="relative text-center">
                <div className="w-16 h-16 rounded-full bg-white/10 backdrop-blur-xl border border-white/20 flex items-center justify-center mx-auto mb-3 cursor-pointer hover:bg-white/20 transition-all shadow-lg shadow-spot-500/20">
                  <Play className="w-8 h-8 text-white fill-current" />
                </div>
                <p className="text-white/50 text-sm">{performanceData.duration}</p>
              </div>
            </div>
            <div className="p-4">
              <h3 className="font-semibold text-white">{performanceData.scene}</h3>
              <p className="text-sm text-white/40">{performanceData.date}</p>
            </div>
          </div>

          {/* Overall Score */}
          <div className="p-6 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10">
            <h3 className="font-display text-xl text-bone mb-4">Overall Performance</h3>
            <div className="flex items-center justify-center py-4">
              <div className="relative w-32 h-32">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="8"
                    className="text-white/10"
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill="none"
                    stroke="url(#gradient)"
                    strokeWidth="8"
                    strokeDasharray={`${performanceData.overallScore * 2.51} 251`}
                    strokeLinecap="round"
                  />
                  <defs>
                    <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#a855f7" />
                      <stop offset="100%" stopColor="#3b82f6" />
                    </linearGradient>
                  </defs>
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-3xl font-bold text-white">{performanceData.overallScore}%</span>
                </div>
              </div>
            </div>
            <div className="flex justify-center">
              <Badge className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <TrendingUp className="w-3 h-3 mr-1" />
                +5% from last
              </Badge>
            </div>
          </div>
        </div>

        {/* Analysis Cards */}
        <div className="lg:col-span-2 space-y-4">
          {/* Emotion Detection */}
          <div className="p-6 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10">
            <div className="flex items-center gap-2 text-lg font-semibold text-white mb-2">
              <Smile className="w-5 h-5 text-spot-400" />
              Emotion Detection
            </div>
            <p className="text-white/40 text-sm mb-6">How well you conveyed each emotion</p>
            <div className="grid sm:grid-cols-2 gap-4">
              {Object.entries(performanceData.emotions).map(([emotion, value]) => (
                <div key={emotion} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="capitalize text-white/70">{emotion}</span>
                    <span className="text-white">{value}%</span>
                  </div>
                  <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-spot-300 to-spot-600 rounded-full transition-all duration-500"
                      style={{ width: `${value}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Voice Analysis */}
          <div className="p-6 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10">
            <div className="flex items-center gap-2 text-lg font-semibold text-white mb-2">
              <Mic className="w-5 h-5 text-cyan-400" />
              Voice Analysis
            </div>
            <p className="text-white/40 text-sm mb-6">Analysis of your vocal performance</p>
            <div className="grid sm:grid-cols-2 gap-6">
              {Object.entries(performanceData.voice).map(([metric, value]) => (
                <div key={metric} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-white/70 capitalize">
                      {metric.replace(/([A-Z])/g, ' $1').trim()}
                    </span>
                    <span className="text-sm font-semibold text-white">{value}%</span>
                  </div>
                  <div className="h-3 bg-white/10 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-cyan-500 to-spot-500 rounded-full transition-all duration-500 shadow-lg shadow-cyan-500/20"
                      style={{ width: `${value}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Body Language */}
          <div className="p-6 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10">
            <div className="flex items-center gap-2 text-lg font-semibold text-white mb-2">
              <User className="w-5 h-5 text-emerald-400" />
              Body Language
            </div>
            <p className="text-white/40 text-sm mb-6">Physical performance metrics</p>
            <div className="grid sm:grid-cols-2 gap-6">
              {Object.entries(performanceData.bodyLanguage).map(([metric, value]) => (
                <div key={metric} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-white/70 capitalize">
                      {metric.replace(/([A-Z])/g, ' $1').trim()}
                    </span>
                    <span className="text-sm font-semibold text-white">{value}%</span>
                  </div>
                  <div className="h-3 bg-white/10 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-emerald-500 to-green-500 rounded-full transition-all duration-500 shadow-lg shadow-emerald-500/20"
                      style={{ width: `${value}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* AI Suggestions */}
          <div className="p-6 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10">
            <div className="flex items-center gap-2 text-lg font-semibold text-white mb-2">
              <Video className="w-5 h-5 text-orange-400" />
              AI Improvement Suggestions
            </div>
            <p className="text-white/40 text-sm mb-6">Personalized feedback to enhance your performance</p>
            <div className="space-y-3">
              {performanceData.suggestions.map((suggestion, index) => (
                <div
                  key={index}
                  className={`p-4 rounded-xl backdrop-blur-sm transition-all hover:scale-[1.01] ${
                    suggestion.type === "success"
                      ? "bg-emerald-500/10 border border-emerald-500/20 hover:border-emerald-500/40"
                      : "bg-spot-500/10 border border-spot-500/20 hover:border-spot-500/40"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {suggestion.type === "success" ? (
                      <CheckCircle className="w-5 h-5 text-emerald-400 mt-0.5" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-spot-400 mt-0.5" />
                    )}
                    <div>
                      <h4 className="font-medium text-white">{suggestion.title}</h4>
                      <p className="text-sm text-white/50 mt-1">{suggestion.description}</p>
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

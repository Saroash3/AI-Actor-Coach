"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { 
  Play, 
  Star, 
  MessageSquare, 
  ThumbsUp,
  Send,
  Clock,
  Filter,
  Share2
} from "lucide-react"

const posts = [
  {
    id: 1,
    author: {
      name: "Sarah Mitchell",
      avatar: null,
      initials: "SM",
    },
    scene: "Hamlet - To Be or Not To Be",
    timeAgo: "2 hours ago",
    rating: 4.5,
    likes: 24,
    comments: [
      {
        author: { name: "James Lee", initials: "JL" },
        text: "Excellent emotional depth! The pauses were perfectly timed.",
        timeAgo: "1 hour ago",
      },
      {
        author: { name: "Maria Garcia", initials: "MG" },
        text: "I loved the way you conveyed the melancholy. Very authentic!",
        timeAgo: "45 min ago",
      },
    ],
  },
  {
    id: 2,
    author: {
      name: "Michael Chen",
      avatar: null,
      initials: "MC",
    },
    scene: "Romeo and Juliet - Balcony Scene",
    timeAgo: "5 hours ago",
    rating: 4.2,
    likes: 18,
    comments: [
      {
        author: { name: "Emma Wilson", initials: "EW" },
        text: "Beautiful delivery! The romantic emotion really came through.",
        timeAgo: "3 hours ago",
      },
    ],
  },
  {
    id: 3,
    author: {
      name: "Emily Rodriguez",
      avatar: null,
      initials: "ER",
    },
    scene: "A Streetcar Named Desire - Scene 4",
    timeAgo: "Yesterday",
    rating: 4.8,
    likes: 45,
    comments: [
      {
        author: { name: "David Brown", initials: "DB" },
        text: "One of the best performances I've seen on this platform!",
        timeAgo: "20 hours ago",
      },
      {
        author: { name: "Lisa Johnson", initials: "LJ" },
        text: "The desperation was palpable. Incredible work!",
        timeAgo: "18 hours ago",
      },
      {
        author: { name: "Robert Kim", initials: "RK" },
        text: "Your body language was spot on. Really impressive.",
        timeAgo: "12 hours ago",
      },
    ],
  },
]

export default function CommunityFeedbackPage() {
  const [newComment, setNewComment] = useState("")
  const [expandedPost, setExpandedPost] = useState<number | null>(null)

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }).map((_, i) => (
      <Star
        key={i}
        className={`w-3.5 h-3.5 ${
          i < Math.floor(rating)
            ? "text-yellow-400 fill-yellow-400"
            : i < rating
            ? "text-yellow-400 fill-yellow-400/50"
            : "text-white/10"
        }`}
      />
    ))
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl text-bone">Community Feedback</h1>
          <p className="text-white/50">Watch performances and share feedback with peers</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="rounded-full border-white/10 text-white hover:bg-white/5">
            <Filter className="w-4 h-4 mr-2" />
            Filter
          </Button>
          <Button size="sm" className="bg-gradient-to-b from-spot-300 to-spot-500 !text-stage-950 hover:from-spot-200 hover:to-spot-400 text-white rounded-full shadow-lg shadow-spot-500/25">
            <Share2 className="w-4 h-4 mr-2" />
            Share Your Performance
          </Button>
        </div>
      </div>

      {/* Posts */}
      <div className="grid gap-6">
        {posts.map((post) => (
          <div key={post.id} className="p-6 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 overflow-hidden group">
            {/* Post Header */}
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-center gap-4">
                <Avatar className="h-12 w-12 border border-white/10">
                  <AvatarImage src={post.author.avatar || undefined} />
                  <AvatarFallback className="bg-gradient-to-br from-spot-400/30 to-spot-600/30 text-white">
                    {post.author.initials}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold text-white leading-tight">{post.author.name}</p>
                  <div className="flex items-center gap-2 text-xs text-white/40 mt-1">
                    <Clock className="w-3 h-3" />
                    {post.timeAgo}
                  </div>
                </div>
              </div>
              <div className="flex flex-col items-end gap-1">
                <div className="flex items-center gap-0.5">{renderStars(post.rating)}</div>
                <span className="text-[10px] text-white/30 uppercase tracking-wider font-bold">Acting Score</span>
              </div>
            </div>

            {/* Video Content Placeholder */}
            <div className="relative aspect-video rounded-2xl overflow-hidden bg-gradient-to-br from-[#0d1120] to-[#1a2333] border border-white/5 mb-6 group-hover:border-spot-500/20 transition-all duration-300">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-16 h-16 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center cursor-pointer hover:bg-white/20 hover:scale-110 transition-all border border-white/10 shadow-2xl">
                  <Play className="w-7 h-7 text-white fill-white ml-1" />
                </div>
              </div>
              
              {/* Overlay Label */}
              <div className="absolute bottom-4 left-4 flex items-center gap-2">
                <Badge className="bg-spot-500/20 backdrop-blur-md text-spot-400 border border-spot-500/20 px-3 py-1 text-xs">
                  {post.scene}
                </Badge>
              </div>
            </div>

            {/* Post Footer / Actions */}
            <div className="flex items-center gap-6">
              <button className="flex items-center gap-2 text-white/60 hover:text-white transition-colors">
                <ThumbsUp className="w-5 h-5" />
                <span className="text-sm font-medium">{post.likes}</span>
              </button>
              <button 
                onClick={() => setExpandedPost(expandedPost === post.id ? null : post.id)}
                className={`flex items-center gap-2 transition-colors ${expandedPost === post.id ? 'text-spot-400' : 'text-white/60 hover:text-white'}`}
              >
                <MessageSquare className="w-5 h-5" />
                <span className="text-sm font-medium">{post.comments.length} Comments</span>
              </button>
            </div>

            {/* Comments Section */}
            {expandedPost === post.id && (
              <div className="mt-6 pt-6 border-t border-white/5 space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                {post.comments.map((comment, index) => (
                  <div key={index} className="flex gap-4">
                    <Avatar className="w-8 h-8 border border-white/5">
                      <AvatarFallback className="text-[10px] bg-white/10 text-white/60">
                        {comment.author.initials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
                        <p className="text-xs font-bold text-white/80 mb-1">{comment.author.name}</p>
                        <p className="text-sm text-white/60 leading-relaxed">{comment.text}</p>
                      </div>
                      <p className="text-[10px] text-white/20 mt-2 ml-2 uppercase tracking-tighter">
                        {comment.timeAgo}
                      </p>
                    </div>
                  </div>
                ))}

                {/* Add Comment Field */}
                <div className="flex gap-4 pt-2">
                  <Avatar className="w-8 h-8 border border-white/10 shadow-lg shadow-spot-500/20">
                    <AvatarFallback className="text-[10px] bg-gradient-to-br from-spot-300 to-spot-600 text-white">
                      MT
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 relative">
                    <Textarea
                      placeholder="Write constructive feedback..."
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      className="min-h-[44px] max-h-32 bg-white/5 border-white/10 text-white placeholder:text-white/20 rounded-2xl focus:border-spot-500/50 focus:ring-spot-500/20 transition-all pr-12"
                      rows={1}
                    />
                    <Button 
                      size="icon" 
                      disabled={!newComment.trim()}
                      className="absolute right-1 bottom-1 h-8 w-8 rounded-xl bg-spot-600 hover:bg-spot-500 disabled:opacity-50 disabled:bg-white/10"
                    >
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

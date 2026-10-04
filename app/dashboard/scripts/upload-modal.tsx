"use client"

import { useState, useRef } from "react"
import { createPortal } from "react-dom"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Upload, X } from "lucide-react"

export default function UploadScriptModal({ onClose }: { onClose: () => void }) {
  const [uploadTitle, setUploadTitle] = useState("")
  const [uploadAuthor, setUploadAuthor] = useState("")
  const [uploadGenre, setUploadGenre] = useState("")
  const [uploadText, setUploadText] = useState("")
  const [uploadError, setUploadError] = useState("")
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.name.endsWith(".txt") && file.type !== "text/plain") {
      setUploadError("Please upload a .txt file")
      return
    }
    const reader = new FileReader()
    reader.onload = (ev) => {
      const text = ev.target?.result as string
      setUploadText(text)
      if (!uploadTitle) {
        setUploadTitle(file.name.replace(/\.txt$/, ""))
      }
      setUploadError("")
    }
    reader.readAsText(file)
  }

  const handleUploadSubmit = async () => {
    if (!uploadTitle.trim()) {
      setUploadError("Title is required")
      return
    }
    if (!uploadText.trim()) {
      setUploadError("Script text is required — paste or upload a .txt file")
      return
    }

    setIsUploading(true)
    try {
      const response = await fetch('/api/scripts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: uploadTitle,
          author: uploadAuthor,
          genre: uploadGenre,
          rawText: uploadText
        })
      })

      if (!response.ok) {
        const err = await response.json().catch(() => ({}))
        throw new Error(err.error || 'Upload failed')
      }

      // Switch to My Scripts tab after upload
      globalThis.location.href = globalThis.location.pathname + '?tab=my-scripts'
      
    } catch (err: any) {
      setUploadError(err.message)
      setIsUploading(false)
    }
  }

  // Portal to <body> so the backdrop covers the sidebar and header too
  // (the dashboard content column is its own stacking context)
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-stage-850 border border-white/10 rounded-2xl p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-display text-2xl text-bone">Upload a script</h2>
          <button onClick={onClose} className="text-white/40 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {uploadError && (
          <div className="flex items-center gap-2 p-3 mb-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            {uploadError}
          </div>
        )}

        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-white/70">Title *</Label>
            <Input
              value={uploadTitle}
              onChange={(e) => setUploadTitle(e.target.value)}
              placeholder="e.g., My Custom Monologue"
              className="bg-white/5 border-white/10 text-white placeholder:text-white/25 rounded-xl"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-white/70">Author</Label>
              <Input
                value={uploadAuthor}
                onChange={(e) => setUploadAuthor(e.target.value)}
                placeholder="Author name"
                className="bg-white/5 border-white/10 text-white placeholder:text-white/25 rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-white/70">Genre</Label>
              <Input
                value={uploadGenre}
                onChange={(e) => setUploadGenre(e.target.value)}
                placeholder="e.g., Drama"
                className="bg-white/5 border-white/10 text-white placeholder:text-white/25 rounded-xl"
              />
            </div>
          </div>

          {/* File Upload */}
          <div className="space-y-2">
            <Label className="text-white/70">Upload .txt file</Label>
            <div
              className="border-2 border-dashed border-white/10 rounded-xl p-6 text-center hover:border-spot-500/30 transition-all cursor-pointer group"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="w-8 h-8 text-spot-400/50 mx-auto mb-2 group-hover:text-spot-400 transition-colors" />
              <p className="text-sm text-white/40 group-hover:text-white/60">Click to upload a .txt file</p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".txt,text/plain"
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-white/70">Or paste script text</Label>
            <textarea
              value={uploadText}
              onChange={(e) => setUploadText(e.target.value)}
              placeholder="Paste your script text here..."
              rows={6}
              className="w-full rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/25 p-3 text-sm focus:border-spot-500/50 focus:outline-none focus:ring-1 focus:ring-spot-500/20 resize-none"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1 border-white/10 text-white/60 hover:text-white hover:bg-white/5 rounded-xl"
              disabled={isUploading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUploadSubmit}
              disabled={isUploading}
              className="flex-1 bg-gradient-to-b from-spot-300 to-spot-500 !text-stage-950 hover:from-spot-200 hover:to-spot-400 text-white rounded-xl shadow-lg shadow-spot-500/25"
            >
              <Upload className="w-4 h-4 mr-2" />
              {isUploading ? "Uploading..." : "Upload Script"}
            </Button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  )
}

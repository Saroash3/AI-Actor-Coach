import { NextResponse } from "next/server"
import mongoose from "mongoose"
import dbConnect from "@/lib/mongodb"
import Script from "@/models/Script"
import Scene from "@/models/Scene"
import LibraryScript from "@/models/LibraryScript"
import { getSession } from "@/lib/session"
import { hasDialogue } from "@/lib/scene-dialogue"

function parseElements(elements: any[]) {
  const blocks: any[] = []
  let currentSpeaker: string | null = null
  let currentLines: string[] = []
  const contextBuffer: string[] = []

  function flushContext() {
    if (contextBuffer.length > 0) {
      blocks.push({ type: "context", text: contextBuffer.join(" ") })
      contextBuffer.length = 0
    }
  }
  function flushSpeech() {
    if (currentSpeaker && currentLines.length > 0) {
      blocks.push({ type: "speech", speaker: currentSpeaker, lines: [...currentLines] })
    }
    currentSpeaker = null
    currentLines = []
  }

  for (const el of elements ?? []) {
    const content = el.content?.trim()
    if (!content) continue
    if (el.type === "text") {
      flushSpeech()
      contextBuffer.push(content)
    } else if (el.type === "speaker") {
      flushSpeech()
      flushContext()
      currentSpeaker = content
    } else if (el.type === "dialog") {
      if (currentSpeaker) {
        currentLines.push(content)
      } else {
        contextBuffer.push(content)
      }
    }
  }
  flushSpeech()
  flushContext()
  return blocks
}

// Only scenes with dialogue (scene numbers stay the original ones, so existing links keep working)
function buildSceneData(embedded: any[], _totalScenes?: number) {
  const scenes = embedded.filter((s: any) => hasDialogue(s.elements))
  return scenes.map((s: any, i: number) => ({
    number:      s.sceneNumber,       // original number (links)
    position:    i + 1,                // 1, 2, 3… among the scenes shown
    title:       s.sceneHeading || `Scene ${i + 1}`,
    description: `Scene ${i + 1} of ${scenes.length}`,
    emotion:     "To be determined",
    duration:    `~${Math.max(1, Math.ceil((s.elements?.length ?? 0) / 10))} min`,
    blocks:      parseElements(s.elements ?? []),
    lines:       (s.elements ?? [])
      .filter((el: any) => el.type === "dialog" && el.content?.trim())
      .slice(0, 3)
      .map((el: any) => el.content.trim()),
  }))
}

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const { id } = params
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 })
  }
  try {
    await dbConnect()
    // Try user-uploaded scripts first
    const dbScript = await Script.findById(id).lean<any>()

    if (dbScript) {
      const embedded: any[] = Array.isArray(dbScript.scenes) ? dbScript.scenes : []
      const totalScenes: number = embedded.filter((s: any) => hasDialogue(s.elements)).length
      const sceneData = embedded.length > 0
        ? buildSceneData(embedded, totalScenes)
        : [{ number: 1, title: dbScript.title ?? "Full Script", description: "No scene data available", emotion: "To be determined", duration: "Unknown", blocks: [], lines: [] }]

      return NextResponse.json({
        id:           dbScript._id.toString(),
        title:        dbScript.title ?? "Untitled",
        author:       dbScript.author ?? "Unknown",
        genre:        dbScript.genre ?? "Custom",
        difficulty:   dbScript.difficulty ?? "Custom",
        totalScenes,
        isUserUploaded: true,
        sceneData,
      })
    }

    // Fall back to library scripts
    const libScript = await LibraryScript.findById(id).lean<any>()
    if (!libScript) return NextResponse.json({ error: "Not found" }, { status: 404 })

    const libEmbedded: any[] = Array.isArray(libScript.scenes) ? libScript.scenes : []
    const libTotalScenes: number = libEmbedded.filter((s: any) => hasDialogue(s.elements)).length

    return NextResponse.json({
      id:          libScript._id.toString(),
      title:       libScript.title,
      author:      "Film",
      genre:       libScript.genre  ?? "Film",
      difficulty:  libScript.difficulty ?? "Intermediate",
      totalScenes: libTotalScenes,
      isLibrary:   true,
      sceneData:   buildSceneData(libEmbedded, libTotalScenes),
    })
  } catch (error) {
    console.error("Script fetch error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getSession()
    if (!session?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = params
    if (!id) return NextResponse.json({ error: "Missing ID" }, { status: 400 })

    await dbConnect()

    // Optionally check if user owns the script in a real app
    
    // Delete script and its scenes
    await Script.findByIdAndDelete(id)
    await Scene.deleteMany({ scriptId: id })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Script deletion error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

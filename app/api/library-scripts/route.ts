import { NextResponse } from "next/server"
import dbConnect from "@/lib/mongodb"
import LibraryScript from "@/models/LibraryScript"
import { dialogueSceneCount } from "@/lib/scene-dialogue"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    await dbConnect()

    // Scene counts include only scenes with dialogue (counted in the database)
    const scripts = await LibraryScript.aggregate([
      { $project: { title: 1, genre: 1, difficulty: 1, totalScenes: dialogueSceneCount } },
      { $sort: { title: 1 } },
    ])

    return NextResponse.json({
      scripts: scripts.map((s) => ({
        _id:        s._id.toString(),
        title:      s.title,
        author:     "Film",
        genre:      s.genre  ?? "Film",
        difficulty: s.difficulty ?? "Intermediate",
        scenes:     s.totalScenes ?? 0,
      })),
    })
  } catch (err) {
    console.error("[library-scripts GET]", err)
    return NextResponse.json({ scripts: [] })
  }
}

import { Suspense } from "react"
import ScriptLibraryClient from "./client-page"
import { preloadedScripts } from "@/lib/preloaded-scripts"
import dbConnect from "@/lib/mongodb"
import LibraryScript from "@/models/LibraryScript"

export const dynamic = "force-dynamic"

export default async function ScriptLibraryPage() {
  let libraryScripts: any[] = []

  try {
    await dbConnect()
    const docs = await LibraryScript
      .find({}, { title: 1, genre: 1, difficulty: 1, totalScenes: 1 })
      .sort({ title: 1 })
      .lean<any[]>()

    libraryScripts = docs.map((s: any) => ({
      _id:        s._id.toString(),
      title:      s.title,
      author:     "Film",
      genre:      s.genre       ?? "Film",
      difficulty: s.difficulty  ?? "Intermediate",
      scenes:     s.totalScenes ?? 0,
    }))
  } catch {
    // MongoDB unavailable — fall back to hardcoded scripts
  }

  if (libraryScripts.length === 0) {
    libraryScripts = preloadedScripts as any[]
  }

  // useSearchParams() in the client page needs a Suspense boundary
  return (
    <Suspense>
      <ScriptLibraryClient libraryScripts={libraryScripts} />
    </Suspense>
  )
}

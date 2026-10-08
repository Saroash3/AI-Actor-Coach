// Which scenes can be rehearsed: only those where a character actually speaks.
// The app assesses the actor's emotion while they perform lines, so scenes that are only
// action/description (narrated by the computer, nothing for the actor to say) are hidden.
// In the 30-film library this keeps 3,582 of 5,716 scenes. Nothing is deleted from the database.

/** True when the scene has a speaker followed by at least one line of dialogue */
export function hasDialogue(elements: any[] | undefined): boolean {
  let speaker = false
  for (const el of elements ?? []) {
    if (!el?.content?.trim()) continue
    if (el.type === "speaker") speaker = true
    else if (el.type === "dialog" && speaker) return true
    else if (el.type === "text") speaker = false
  }
  return false
}

/**
 * The same rule for MongoDB aggregation (counting dialogue scenes per script without loading them):
 * a scene with both a speaker and a dialog element. On the library this gives the same 3,582 scenes.
 */
export const dialogueSceneCount = {
  $size: {
    $filter: {
      input: { $ifNull: ["$scenes", []] },
      as:    "s",
      cond:  {
        $and: [
          { $in: ["speaker", { $ifNull: ["$$s.elements.type", []] }] },
          { $in: ["dialog",  { $ifNull: ["$$s.elements.type", []] }] },
        ],
      },
    },
  },
}

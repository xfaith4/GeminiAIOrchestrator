// src/services/selectServices.ts
export type FileTreeEntry = { path: string };

/**
 * Deterministic file picker for demo/testing.
 * NOTE: Must return a Promise to satisfy the OrchestrationServices type.
 */
export async function selectFiles(
  tree: FileTreeEntry[],
  _scratchpad: string,
  _step: any
): Promise<{ files: string[] }> {
  // prefer markdown & code, cap to 5
  const preferred = ['.md', '.tsx', '.ts', '.js', '.jsx', '.json'];
  const scored = tree.map(f => {
    const ix = preferred.findIndex(ext => f.path.endsWith(ext));
    return { path: f.path, score: ix === -1 ? 999 : ix };
  });
  scored.sort((a, b) => a.score - b.score);
  return { files: scored.slice(0, 5).map(s => s.path) };
}

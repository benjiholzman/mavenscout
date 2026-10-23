// Nested picker options (MultiSelect's `tree`): a node with a value can be
// selected; one without is a header. Selecting a node includes everything
// under it.

export interface TreeNode {
  label: string
  value?: string
  children?: TreeNode[]
}

/** Every selectable value in a tree, parents before their children. */
export function treeValues(nodes: TreeNode[]): string[] {
  return nodes.flatMap((n) => [...(n.value ? [n.value] : []), ...treeValues(n.children ?? [])])
}

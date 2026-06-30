export function topoSort(nodes: string[], edges: Record<string, string[]>): string[] {
  const order: string[] = [];
  const state = new Map<string, 'visiting' | 'done'>();
  const visit = (n: string, path: string[]): void => {
    const s = state.get(n);
    if (s === 'done') return;
    if (s === 'visiting') throw new Error(`dependency cycle: ${[...path, n].join(' -> ')}`);
    state.set(n, 'visiting');
    for (const dep of edges[n] ?? []) {
      if (!nodes.includes(dep)) throw new Error(`unknown dependency "${dep}" required by "${n}"`);
      visit(dep, [...path, n]);
    }
    state.set(n, 'done'); order.push(n);
  };
  for (const n of nodes) visit(n, []);
  return order;
}

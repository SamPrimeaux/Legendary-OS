import { useMemo, useState } from 'react';

export function useMediaSelection() {
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const selectedIds = useMemo(() => [...selected], [selected]);

  const toggle = (id: string) => setSelected((current) => {
    const next = new Set(current);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });
  const select = (id: string) => setSelected(new Set([id]));
  const clear = () => setSelected(new Set());
  const selectAll = (ids: string[]) => setSelected(new Set(ids));

  return { selected, selectedIds, toggle, select, clear, selectAll, count: selected.size };
}

import { useEffect, useState } from 'react'

const KEY = 'kasibi-shezhire-v1'
export const EMPTY = {
  student: { name: '', grade: '', school: '' },
  family: [
    { role: 'Атам / әжем', job: '' },
    { role: 'Әкем', job: '' },
    { role: 'Анам', job: '' },
  ],
  testBefore: null,
  testAfter: null,
  pick3: [],
  vr: {}, // { electric: { score, tokens } }
  ai: { done: [], note: '' },
}

function load() {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? { ...EMPTY, ...JSON.parse(raw) } : EMPTY
  } catch {
    return EMPTY
  }
}

export function useAppState() {
  const [s, setS] = useState(load)
  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify(s)) } catch { /* жеке режим */ }
  }, [s])
  const update = (patch) => setS((prev) => ({ ...prev, ...(typeof patch === 'function' ? patch(prev) : patch) }))
  const reset = () => setS(EMPTY)
  return [s, update, reset]
}

export function topTypes(scores) {
  if (!scores) return []
  return Object.entries(scores).sort((a, b) => b[1] - a[1]).map(([k]) => k)
}

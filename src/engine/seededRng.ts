export function createRng(seed: number) {
  let s = seed >>> 0
  const next = (): number => {
    s = (Math.imul(1664525, s) + 1013904223) >>> 0
    return s / 0x100000000
  }
  return {
    next,
    range: (min: number, max: number) => min + next() * (max - min),
    int:   (min: number, max: number) => Math.floor(min + next() * (max - min + 1)),
    pick:  <T>(arr: T[]): T => arr[Math.floor(next() * arr.length)],
  }
}

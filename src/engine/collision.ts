export function circleRect(
  cx: number, cy: number, r: number,
  rx: number, ry: number, rw: number, rh: number,
): boolean {
  const nx = Math.max(rx, Math.min(cx, rx + rw))
  const ny = Math.max(ry, Math.min(cy, ry + rh))
  return Math.hypot(cx - nx, cy - ny) < r
}

export function resolveCircleRect(
  px: number, py: number, r: number,
  rx: number, ry: number, rw: number, rh: number,
): { x: number; y: number } {
  if (!circleRect(px, py, r, rx, ry, rw, rh)) return { x: px, y: py }
  const oL = px - (rx - r)
  const oR = (rx + rw + r) - px
  const oT = py - (ry - r)
  const oB = (ry + rh + r) - py
  const m = Math.min(oL, oR, oT, oB)
  if (m === oL) return { x: rx - r, y: py }
  if (m === oR) return { x: rx + rw + r, y: py }
  if (m === oT) return { x: px, y: ry - r }
  return { x: px, y: ry + rh + r }
}

export function circleCircle(
  x1: number, y1: number, r1: number,
  x2: number, y2: number, r2: number,
): boolean {
  return Math.hypot(x1 - x2, y1 - y2) < r1 + r2
}

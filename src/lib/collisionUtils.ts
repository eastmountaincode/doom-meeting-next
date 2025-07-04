// Polygon collision detection using SAT (Separating Axis Theorem)
export function getPolygonAxes(vertices: Array<{x: number, y: number}>): Array<{x: number, y: number}> {
  const axes: Array<{x: number, y: number}> = []
  for (let i = 0; i < vertices.length; i++) {
    const v1 = vertices[i]
    const v2 = vertices[(i + 1) % vertices.length]
    const edge = { x: v2.x - v1.x, y: v2.y - v1.y }
    const normal = { x: -edge.y, y: edge.x }
    const length = Math.sqrt(normal.x * normal.x + normal.y * normal.y)
    axes.push({ x: normal.x / length, y: normal.y / length })
  }
  return axes
}

export function projectPolygon(vertices: Array<{x: number, y: number}>, axis: {x: number, y: number}): {min: number, max: number} {
  let min = vertices[0].x * axis.x + vertices[0].y * axis.y
  let max = min
  for (let i = 1; i < vertices.length; i++) {
    const dot = vertices[i].x * axis.x + vertices[i].y * axis.y
    if (dot < min) min = dot
    if (dot > max) max = dot
  }
  return { min, max }
}

export function polygonsCollide(vertices1: Array<{x: number, y: number}>, pos1: [number, number], size1: number,
                        vertices2: Array<{x: number, y: number}>, pos2: [number, number], size2: number): boolean {
  // Transform vertices to world positions
  const worldVertices1 = vertices1.map(v => ({
    x: pos1[0] + v.x * size1,
    y: pos1[1] + v.y * size1
  }))
  const worldVertices2 = vertices2.map(v => ({
    x: pos2[0] + v.x * size2,
    y: pos2[1] + v.y * size2
  }))
  
  // Get all axes to test
  const axes1 = getPolygonAxes(worldVertices1)
  const axes2 = getPolygonAxes(worldVertices2)
  const allAxes = [...axes1, ...axes2]
  
  // Test separation on each axis
  for (const axis of allAxes) {
    const proj1 = projectPolygon(worldVertices1, axis)
    const proj2 = projectPolygon(worldVertices2, axis)
    
    if (proj1.max < proj2.min || proj2.max < proj1.min) {
      return false // Separating axis found
    }
  }
  
  return true // No separating axis found, polygons collide
}

// Store collision shapes for each participant
export const participantCollisionShapes = new Map<string, Array<{x: number, y: number}>>() 
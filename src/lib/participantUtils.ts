// Generate round/circular shape and return both CSS and collision data
export function generateParticipantShape(participantId: string): { 
  clipPath: string, 
  collisionVertices: Array<{x: number, y: number}> 
} {
  // Use participant ID as seed for consistent shapes
  let seed = 0
  for (let i = 0; i < participantId.length; i++) {
    seed = participantId.charCodeAt(i) + ((seed << 5) - seed)
  }
  
  // Seeded random function
  const seededRandom = (min: number, max: number) => {
    seed = (seed * 9301 + 49297) % 233280
    return min + (seed / 233280) * (max - min)
  }
  
  // Generate 16-24 points for very smooth, round shapes
  const numPoints = Math.floor(seededRandom(16, 25))
  const cssPoints: string[] = []
  const collisionVertices: Array<{x: number, y: number}> = []
  
  for (let i = 0; i < numPoints; i++) {
    // Even angle distribution for circular shape
    const baseAngle = (i / numPoints) * 360
    const angleVariation = seededRandom(-2, 2) // Minimal variation for round shapes
    const angle = baseAngle + angleVariation
    
    // Keep radius very consistent for circular shapes: 46% to 49% from center
    const radius = seededRandom(46, 49)
    
    // Convert polar to cartesian, centered at 50%, 50%
    const cssX = Math.max(5, Math.min(95, 50 + radius * Math.cos(angle * Math.PI / 180)))
    const cssY = Math.max(5, Math.min(95, 50 + radius * Math.sin(angle * Math.PI / 180)))
    
    // CSS points (percentages)
    cssPoints.push(`${cssX.toFixed(1)}% ${cssY.toFixed(1)}%`)
    
    // Collision vertices (normalized -0.5 to 0.5 for square size)
    const collisionX = (cssX - 50) / 100 // Convert from 0-100% to -0.5 to 0.5
    const collisionY = (cssY - 50) / 100
    collisionVertices.push({ x: collisionX, y: collisionY })
  }
  
  return {
    clipPath: `polygon(${cssPoints.join(', ')})`,
    collisionVertices
  }
}

// Generate consistent color for participant
export function generateParticipantColor(participantId: string): string {
  const colors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', 
    '#FFEAA7', '#DDA0DD', '#98D8C8', '#F39C12',
    '#E74C3C', '#9B59B6', '#3498DB', '#1ABC9C'
  ]
  
  // Simple hash to get consistent color
  let hash = 0
  for (let i = 0; i < participantId.length; i++) {
    hash = participantId.charCodeAt(i) + ((hash << 5) - hash)
  }
  
  return colors[Math.abs(hash) % colors.length]
}

// Helper function to extract display name from participant metadata
export function getParticipantDisplayName(participant: { metadata?: string }): string {
  try {
    const metadata = participant.metadata
    if (metadata) {
      const parsed = JSON.parse(metadata)
      // Only return the displayName if it exists in metadata
      if (parsed.displayName) {
        return parsed.displayName
      }
    }
  } catch {
    // Metadata parsing failed
  }
  
  // Don't show the long unique identifier - return empty string instead
  return ''
} 
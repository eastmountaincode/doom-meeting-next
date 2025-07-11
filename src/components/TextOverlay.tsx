import React from 'react'

interface TextOverlayProps {
  displayText: string
  showText: boolean
  canvasSize: { width: number, height: number }
  fontFamily?: string
}

// Function to calculate optimal font size and line breaks for text to fit canvas
const calculateTextLayout = (text: string, maxWidth: number, maxHeight: number, fontFamily: string): { fontSize: number, lines: string[] } => {
  if (!text.trim()) return { fontSize: 0, lines: [] }
  
  // Create a temporary canvas to measure text
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  if (!ctx) return { fontSize: 48, lines: [text] } // fallback
  
  // More conservative sizing to ensure text stays within bounds
  const usableWidth = maxWidth * 0.85 // Use 85% of available width 
  const usableHeight = maxHeight * 0.85 // Use 85% of available height
  
  // Start with a large font size but more conservative than before
  let fontSize = Math.min(usableWidth, usableHeight) * 0.12 // Start with 12% of smallest dimension
  const minFontSize = 16 // Lower minimum font size to ensure text always fits
  const maxLines = 8 // Allow more lines if needed
  
  // Try to fit text with line breaks before shrinking
  while (fontSize >= minFontSize) {
    ctx.font = `bold ${fontSize}px ${fontFamily}`
    
    // Break text into lines that fit the width
    const words = text.split(' ')
    const lines: string[] = []
    let currentLine = ''
    
    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word
      const metrics = ctx.measureText(testLine)
      
      if (metrics.width <= usableWidth) {
        currentLine = testLine
      } else {
        if (currentLine) {
          lines.push(currentLine)
          currentLine = word
        } else {
          // Single word is too long, force it on its own line
          lines.push(word)
        }
      }
    }
    
    if (currentLine) {
      lines.push(currentLine)
    }
    
    // Check if all lines fit within height - more accurate height calculation
    const lineHeight = fontSize * 1.2 // More conservative line height
    const totalHeight = lines.length * lineHeight // Simplified - just line height * number of lines
    
    if (totalHeight <= usableHeight && lines.length <= maxLines) {
      return { fontSize, lines }
    }
    
    // If we have too many lines, try smaller font size
    fontSize -= 2 // Even smaller decrements for more granular sizing
  }
  
  // Fallback: use minimum font size with whatever lines we can fit
  ctx.font = `bold ${minFontSize}px ${fontFamily}`
  const words = text.split(' ')
  const lines: string[] = []
  let currentLine = ''
  
  // More aggressive line breaking for fallback
  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word
    const metrics = ctx.measureText(testLine)
    
    if (metrics.width <= usableWidth) {
      currentLine = testLine
    } else {
      if (currentLine) {
        lines.push(currentLine)
        currentLine = word
      } else {
        // Force word to fit
        lines.push(word)
      }
    }
  }
  
  if (currentLine) {
    lines.push(currentLine)
  }
  
  return { fontSize: minFontSize, lines }
}

export default function TextOverlay({ displayText, showText, canvasSize, fontFamily = 'Arial, sans-serif' }: TextOverlayProps) {
  if (!showText || !displayText.trim()) {
    return null
  }

  const { fontSize, lines } = calculateTextLayout(displayText, canvasSize.width, canvasSize.height, fontFamily)

  return (
    <div 
      className="absolute inset-0 flex items-center justify-center pointer-events-none"
      style={{
        width: canvasSize.width,
        height: canvasSize.height,
        zIndex: 1000,
        padding: '2%', // Reduced padding to give more space
      }}
    >
      <div
        className="text-center font-bold text-white"
        style={{
          fontSize: `${fontSize}px`,
          fontFamily: fontFamily,
          textShadow: '3px 3px 6px rgba(0,0,0,0.9)', // Stronger shadow for better readability
          maxWidth: '100%',
          maxHeight: '100%',
          lineHeight: 1.2, // Match the calculation line height
          wordBreak: 'break-word', // Allow breaking of long words
        }}
      >
        {lines.map((line, index) => (
          <div key={index}>
            {line}
          </div>
        ))}
      </div>
    </div>
  )
} 
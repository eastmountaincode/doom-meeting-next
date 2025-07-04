import React from 'react'

interface TextOverlayProps {
  displayText: string
  showText: boolean
  canvasSize: { width: number, height: number }
}

// Function to calculate optimal font size and line breaks for text to fit canvas
const calculateTextLayout = (text: string, maxWidth: number, maxHeight: number): { fontSize: number, lines: string[] } => {
  if (!text.trim()) return { fontSize: 0, lines: [] }
  
  // Create a temporary canvas to measure text
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  if (!ctx) return { fontSize: 48, lines: [text] } // fallback
  
  // Start with a large font size (bigger than before)
  let fontSize = Math.min(maxWidth, maxHeight) * 0.15 // Start with 15% of smallest dimension (much bigger)
  const minFontSize = 32 // Increased minimum font size for better readability
  const maxLines = 8 // Maximum number of lines before we start shrinking
  
  // Try to fit text with line breaks before shrinking
  while (fontSize >= minFontSize) {
    ctx.font = `bold ${fontSize}px Arial`
    const lineHeight = fontSize * 1.3 // Line height with some spacing
    
    // Break text into lines that fit the width
    const words = text.split(' ')
    const lines: string[] = []
    let currentLine = ''
    
    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word
      const metrics = ctx.measureText(testLine)
      
      if (metrics.width <= maxWidth * 0.9) {
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
    
    // Check if all lines fit within height
    const totalHeight = lines.length * lineHeight
    if (totalHeight <= maxHeight * 0.9 && lines.length <= maxLines) {
      return { fontSize, lines }
    }
    
    // If we have too many lines, try smaller font size
    fontSize -= 4
  }
  
  // Fallback: use minimum font size with whatever lines we can fit
  ctx.font = `bold ${minFontSize}px Arial`
  const lineHeight = minFontSize * 1.3
  const words = text.split(' ')
  const lines: string[] = []
  let currentLine = ''
  
  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word
    const metrics = ctx.measureText(testLine)
    
    if (metrics.width <= maxWidth * 0.9) {
      currentLine = testLine
    } else {
      if (currentLine) {
        lines.push(currentLine)
        currentLine = word
      } else {
        lines.push(word)
      }
    }
  }
  
  if (currentLine) {
    lines.push(currentLine)
  }
  
  return { fontSize: minFontSize, lines }
}

export default function TextOverlay({ displayText, showText, canvasSize }: TextOverlayProps) {
  if (!showText || !displayText.trim()) {
    return null
  }

  const { fontSize, lines } = calculateTextLayout(displayText, canvasSize.width, canvasSize.height)

  return (
    <div 
      className="absolute inset-0 flex items-center justify-center pointer-events-none"
      style={{
        width: canvasSize.width,
        height: canvasSize.height,
        zIndex: 1000,
      }}
    >
      <div
        className="text-center font-bold text-white px-6 py-4"
        style={{
          fontSize: `${fontSize}px`,
          textShadow: '2px 2px 4px rgba(0,0,0,0.8)',
          maxWidth: '90%',
          lineHeight: 1.3,
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
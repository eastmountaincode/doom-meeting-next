import React from 'react'
import { QRCodeSVG } from 'qrcode.react'

interface QRCodeOverlayProps {
  show: boolean
  color: 'black' | 'white'
  canvasSize: { width: number, height: number }
}

export default function QRCodeOverlay({ show, color, canvasSize }: QRCodeOverlayProps) {
  if (!show) {
    return null
  }

  // Always use the main site URL for the QR code
  const qrUrl = 'https://doom-meeting-next.vercel.app/'
  
  // Calculate QR code size based on canvas size
  const qrSize = Math.min(canvasSize.width, canvasSize.height) * 0.6 // 60% of smallest dimension
  const qrCodeBoxSize = qrSize + 40 // QR code white/black background (qrSize + 20px padding on each side)
  const containerPadding = 40

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
        className="flex flex-col items-center justify-center"
        style={{
          backgroundColor: 'rgba(255,255,255,0.0)',
          borderRadius: '8px',
          padding: `${containerPadding}px`,
          backdropFilter: 'blur(8px)',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
        }}
      >
        <div 
          style={{ 
            width: qrCodeBoxSize, 
            height: qrCodeBoxSize, 
            backgroundColor: color === 'white' ? '#ffffff' : '#000000',
            borderRadius: '3px',
            padding: '20px',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <QRCodeSVG
            value={qrUrl}
            size={qrSize}
            level="M"
            bgColor="transparent"
            fgColor={color === 'white' ? '#000000' : '#ffffff'}
          />
        </div>
        
        <div
          style={{
            fontWeight: 600,
            fontSize: Math.min(qrSize * 0.08, 32),
            lineHeight: 1.1,
            color: color === 'white' ? '#ffffff' : '#000000',
            letterSpacing: '0.5px',
            textAlign: 'center',
            pointerEvents: 'none',
            userSelect: 'none',
          }}
        >
          JOIN DOOM MEETING
        </div>
      </div>
    </div>
  )
} 
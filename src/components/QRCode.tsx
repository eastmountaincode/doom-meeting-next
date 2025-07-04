import React from 'react'
import { QRCodeSVG } from 'qrcode.react'

interface QRCodeProps {
  show: boolean
  size?: number
  color: 'black' | 'white'
}

export default function QRCode({ show, size = 120, color }: QRCodeProps) {
  if (!show) return null

  // Always use the main site URL for the QR code
  const qrUrl = 'https://doom-meeting-next.vercel.app/'
  const padding = 10
  const containerSize = size + padding * 2

  return (
    <div 
      className="fixed z-50 flex flex-col items-start"
      style={{
        top: 8,
        left: 8,
        position: 'fixed',
        width: containerSize,
        pointerEvents: 'none',
        backdropFilter: 'blur(8px)',
        background: 'rgba(255,255,255,0.0)',
        boxSizing: 'border-box',
        padding: 8,
        borderRadius: 3,
      }}
    >
      <div style={{ width: size, height: size, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <QRCodeSVG
          value={qrUrl}
          size={size}
          level="M"
          bgColor="transparent"
          fgColor={color === 'white' ? '#ffffff' : '#000000'}
        />
      </div>
      <div
        style={{
          marginTop: 8,
          fontWeight: 600,
          fontSize: 18,
          lineHeight: 1.1,
          color: color === 'white' ? '#ffffff' : '#000000',
          letterSpacing: 0.5,
          textAlign: 'left',
          pointerEvents: 'none',
          userSelect: 'none',
        }}
      >
        JOIN<br />DOOM<br />MEETING
      </div>
    </div>
  )
} 
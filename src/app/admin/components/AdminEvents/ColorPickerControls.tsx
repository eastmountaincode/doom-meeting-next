'use client'

import { useState, useRef } from 'react'
import { HexColorPicker } from 'react-colorful'
import { HiPaintBrush } from 'react-icons/hi2'

interface ColorPickerControlsProps {
    triggerEvent: (eventType: string, options?: Record<string, unknown>) => Promise<void>
    isTriggering: boolean
    backgroundType?: 'color' | 'youtube' | 'image'
}

/* ---------- helpers ---------- */
function hexToHSL(hex: string): { h: number; s: number; l: number } {
    hex = hex.replace(/^#/, '')
    let r = 0, g = 0, b = 0
    if (hex.length === 3) {
        r = parseInt(hex[0] + hex[0], 16)
        g = parseInt(hex[1] + hex[1], 16)
        b = parseInt(hex[2] + hex[2], 16)
    } else if (hex.length === 6) {
        r = parseInt(hex.slice(0, 2), 16)
        g = parseInt(hex.slice(2, 4), 16)
        b = parseInt(hex.slice(4, 6), 16)
    }
    r /= 255; g /= 255; b /= 255
    const max = Math.max(r, g, b), min = Math.min(r, g, b)
    let h = 0, s = 0
    const l = (max + min) / 2
    if (max !== min) {
        const d = max - min
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
        switch (max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break
            case g: h = (b - r) / d + 2; break
            case b: h = (r - g) / d + 4; break
        }
        h *= 60
    }
    return { h, s: s * 100, l: l * 100 }
}
/* -------------------------------- */

export default function ColorPickerControls({ triggerEvent, isTriggering, backgroundType = 'color' }: ColorPickerControlsProps) {
    const [backgroundColor, setBackgroundColor] = useState('#000000')
    const [colorCycleActive, setColorCycleActive] = useState(false)
    const [colorCycleSpeed, setColorCycleSpeed] = useState(30)      // ms per hue step
    const lastSpeedSentRef = useRef(0)

    /* ----- handlers ----- */
    const commitColor = () => {
        if (!colorCycleActive) {
            triggerEvent('SET_BACKGROUND_COLOR_TRANSITION', { backgroundColor })
        }
    }

    const resetToBlack = async () => {
        setBackgroundColor('#000000')
        setColorCycleActive(false)
        await triggerEvent('STOP_COLOR_CYCLE')
        await triggerEvent('SET_BACKGROUND_COLOR', { backgroundColor: '#000000' })
    }

    const handleToggleColorCycle = async () => {
        const newState = !colorCycleActive
        setColorCycleActive(newState)

        if (newState) {
            const { h, s, l } = hexToHSL(backgroundColor)
            await triggerEvent('START_COLOR_CYCLE', {
                saturation: s,
                lightness: l,
                speed: colorCycleSpeed,
                startHue: h,
            })
        } else {
            await triggerEvent('STOP_COLOR_CYCLE')
        }
    }

    const handleSpeedChange = async (speed: number) => {
        setColorCycleSpeed(speed)
        if (colorCycleActive) {
            const now = Date.now()
            if (now - lastSpeedSentRef.current > 150) {
                lastSpeedSentRef.current = now
                await triggerEvent('SET_COLOR_CYCLE_SPEED', { speed })
            }
        }
    }
    /* -------------------- */

    return (
        <div className="flex flex-row items-start p-4 bg-gray-700 rounded-lg gap-6" style={{ opacity: backgroundType === 'color' ? 1 : 0.5 }}>
            {/* Picker */}
            <div className="flex flex-col relative" style={{ minWidth: 300 }}>
                <div className="flex items-center space-x-3 mb-4">
                    <HiPaintBrush className="text-lg" />
                    <div>
                        <div className="text-white font-medium">Background Color</div>
                        <div className="text-gray-400 text-sm">Change the display background in real time</div>
                    </div>
                </div>

                <HexColorPicker
                    color={backgroundColor}
                    onChange={setBackgroundColor}
                    onMouseUp={commitColor}
                    onTouchEnd={commitColor}
                    style={{ width: 300, height: 300 }}
                />

                {/* Shade while inactive */}
                {colorCycleActive && (
                    <div className="absolute inset-0 rounded-[12px] bg-white/60 cursor-not-allowed" />
                )}
            </div>

            {/* Controls */}
            <div className="flex flex-col items-stretch justify-center gap-2" style={{ minWidth: 220, height: 340 }}>
                <button
                    onClick={resetToBlack}
                    disabled={isTriggering || backgroundType !== 'color'}
                    className="cursor-pointer px-4 py-2 rounded bg-white text-gray-800 font-semibold shadow border border-gray-300 w-full disabled:opacity-50"
                >
                    Reset to Black
                </button>

                <button
                    onClick={handleToggleColorCycle}
                    disabled={isTriggering || backgroundType !== 'color'}
                    className={`cursor-pointer px-4 py-2 rounded font-semibold shadow border w-full disabled:opacity-50 ${
                        colorCycleActive ? 'bg-blue-600 text-white' : 'bg-white text-gray-800'
                    }`}
                >
                    {colorCycleActive ? 'Stop Color Cycle' : 'Start Color Cycle'}
                </button>

                <div className="mt-4">
                    <label className="block text-sm font-medium text-white mb-2">
                        Cycle Speed: {colorCycleSpeed} ms
                    </label>
                    <input
                        type="range"
                        min="0.1"
                        max="75"
                        step="0.1"
                        value={colorCycleSpeed}
                        onChange={(e) => handleSpeedChange(parseFloat(e.target.value))}
                        disabled={backgroundType !== 'color'}
                        className="w-full h-2 bg-gray-600 rounded-lg cursor-pointer disabled:opacity-50"
                    />
                    <div className="flex justify-between text-xs text-gray-400 mt-1">
                        <span>Fast</span>
                        <span>Slow</span>
                    </div>
                </div>
            </div>
        </div>
    )
}

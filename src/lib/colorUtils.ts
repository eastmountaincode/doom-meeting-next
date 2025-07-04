// Convert HSL to Hex for color cycling
export const hslToHex = (h: number, s: number, l: number): string => {
  s /= 100
  l /= 100
  const a = s * Math.min(l, 1 - l)
  const f = (n: number) => {
    const k = (n + h / 30) % 12
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1)
    return Math.round(255 * color).toString(16).padStart(2, '0')
  }
  return `#${f(0)}${f(8)}${f(4)}`
}

// Function to interpolate between two hex colors
export const interpolateColors = (color1: string, color2: string, factor: number): string => {
  // Convert hex to RGB
  const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : { r: 0, g: 0, b: 0 }
  }
  
  // Convert RGB to hex
  const rgbToHex = (r: number, g: number, b: number) => {
    const toHex = (n: number) => {
      const hex = Math.round(n).toString(16)
      return hex.length === 1 ? '0' + hex : hex
    }
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`
  }
  
  const rgb1 = hexToRgb(color1)
  const rgb2 = hexToRgb(color2)
  
  const r = rgb1.r + (rgb2.r - rgb1.r) * factor
  const g = rgb1.g + (rgb2.g - rgb1.g) * factor
  const b = rgb1.b + (rgb2.b - rgb1.b) * factor
  
  return rgbToHex(r, g, b)
} 
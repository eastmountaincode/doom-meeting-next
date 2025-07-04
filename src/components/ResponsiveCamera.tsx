import { useEffect } from 'react'
import { useThree } from "@react-three/fiber"

// Responsive camera component
export default function ResponsiveCamera() {
  const { camera, size } = useThree()
  
  useEffect(() => {
    if (camera.type === 'OrthographicCamera') {
      const worldHeight = 16
      camera.zoom = size.height / worldHeight
      camera.updateProjectionMatrix()
    }
  }, [camera, size])
  
  return null
} 
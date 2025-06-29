import React from 'react'

export default function Square() {
    return (
        <mesh position={[0, 0, 0]}>
            <planeGeometry args={[1, 1]} />
            <meshBasicMaterial color="red" />
        </mesh>
    )
}
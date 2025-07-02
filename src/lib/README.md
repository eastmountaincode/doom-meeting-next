# VideoSquare Architecture

## Overview

This is a modular system for managing video squares in a real-time interactive display. It's designed to handle participant lifecycle, smart spatial placement, and event-driven updates.

## Core Components

### 1. VideoSquareManager (`VideoSquareManager.ts`)
The main orchestrator class that handles:
- ✅ Participant lifecycle (add/remove)
- ✅ Smart spatial placement algorithm
- ✅ Event emission for React integration
- ✅ Size threshold management
- 🔄 Physics updates (Phase 2)
- 🔄 Video track management (Phase 3)

### 2. EventBus (`EventBus.ts`)
Simple event system for loose coupling between components:
- `squares.updated` - When square array changes
- `square.added` - When new participant joins
- `square.removed` - When participant leaves
- `physics.updated` - When animation frame updates

### 3. React Hook (`useVideoSquares.ts`)
Clean React interface providing:
- `squares` - Current square array
- `addParticipant()` - Add new participant
- `removeParticipant()` - Remove participant
- `clearAllSquares()` - Reset display
- `onSquareEvent()` - Subscribe to events

## Usage

```tsx
import { useVideoSquares } from '../hooks/useVideoSquares'

function MyComponent() {
  const { 
    squares, 
    addParticipant, 
    removeParticipant,
    squareCount 
  } = useVideoSquares()

  // Add test participant
  const handleAdd = () => {
    addParticipant(`user-${Date.now()}`)
  }

  return (
    <div>
      <p>Active squares: {squareCount}</p>
      <button onClick={handleAdd}>Add Participant</button>
      
      {/* Render squares in Three.js */}
      {squares.map(square => (
        <mesh key={square.participantId} position={square.position}>
          <planeGeometry args={[square.size, square.size]} />
          <meshBasicMaterial color={square.color} />
        </mesh>
      ))}
    </div>
  )
}
```

## Configuration

```tsx
import { MEETING_CONFIG } from '../config/videoSquareConfig'

const { squares } = useVideoSquares(MEETING_CONFIG)
```

## Development Phases

- ✅ **Phase 1**: Core architecture with smart placement
- 🔄 **Phase 2**: Physics simulation (bouncing, collision)
- 🔄 **Phase 3**: LiveKit video integration
- 🔄 **Phase 4**: Admin event integration

## Testing

Visit `/admin/display-new` and click "Show Test Controls" to:
- Add mock participants
- Remove participants  
- Clear all squares
- See smart placement in action 
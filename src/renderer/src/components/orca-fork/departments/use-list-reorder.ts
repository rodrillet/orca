// orca-fork: drag one row onto another to move it there, for the departments and sections lists.
import type React from 'react'
import { useRef, useState } from 'react'

const MIME = 'application/x-orca-fork-reorder'

export function useListReorder(onMove: (id: string, toId: string) => void): {
  itemProps: (
    id: string
  ) => Pick<
    React.HTMLAttributes<HTMLElement>,
    'draggable' | 'onDragStart' | 'onDragOver' | 'onDragLeave' | 'onDrop' | 'onDragEnd'
  > & { draggable: true }
  isDropTarget: (id: string) => boolean
} {
  const dragging = useRef<string | null>(null)
  const [over, setOver] = useState<string | null>(null)
  return {
    itemProps: (id) => ({
      draggable: true,
      onDragStart: (event) => {
        dragging.current = id
        event.dataTransfer.effectAllowed = 'move'
        event.dataTransfer.setData(MIME, id)
      },
      onDragOver: (event) => {
        if (dragging.current && dragging.current !== id) {
          event.preventDefault()
          event.dataTransfer.dropEffect = 'move'
          setOver(id)
        }
      },
      onDragLeave: () => setOver((current) => (current === id ? null : current)),
      onDrop: (event) => {
        event.preventDefault()
        const from = dragging.current
        dragging.current = null
        setOver(null)
        if (from && from !== id) {
          onMove(from, id)
        }
      },
      onDragEnd: () => {
        dragging.current = null
        setOver(null)
      }
    }),
    isDropTarget: (id) => over === id
  }
}

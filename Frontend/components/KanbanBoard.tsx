"use client"

import { useState } from 'react'
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd'
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Plus } from "lucide-react"

const initialColumns = {
  todo: {
    id: 'todo',
    title: 'To Do',
    items: []
  },
  inProgress: {
    id: 'inProgress',
    title: 'In Progress',
    items: []
  },
  done: {
    id: 'done',
    title: 'Done',
    items: []
  }
}

export default function KanbanBoard() {
  const [columns, setColumns] = useState(initialColumns)

  const onDragEnd = (result: any) => {
    if (!result.destination) return

    const { source, destination } = result
    
    if (source.droppableId === destination.droppableId) {
      const column = columns[source.droppableId as keyof typeof columns]
      const items = Array.from(column.items)
      const [removed] = items.splice(source.index, 1)
      items.splice(destination.index, 0, removed)
      
      setColumns({
        ...columns,
        [source.droppableId]: {
          ...column,
          items
        }
      })
    } else {
      const sourceColumn = columns[source.droppableId as keyof typeof columns]
      const destColumn = columns[destination.droppableId as keyof typeof columns]
      const sourceItems = Array.from(sourceColumn.items)
      const destItems = Array.from(destColumn.items)
      const [removed] = sourceItems.splice(source.index, 1)
      destItems.splice(destination.index, 0, removed)
      
      setColumns({
        ...columns,
        [source.droppableId]: {
          ...sourceColumn,
          items: sourceItems
        },
        [destination.droppableId]: {
          ...destColumn,
          items: destItems
        }
      })
    }
  }

  return (
    <div className="bg-white rounded-lg p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-['Canela']">Trip Itinerary</h2>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Add Task
        </Button>
      </div>
      
      <DragDropContext onDragEnd={onDragEnd}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {Object.values(columns).map(column => (
            <div key={column.id} className="bg-secondary rounded-lg p-4">
              <h3 className="font-semibold mb-4">{column.title}</h3>
              <Droppable droppableId={column.id}>
                {(provided) => (
                  <div
                    {...provided.droppableProps}
                    ref={provided.innerRef}
                    className="space-y-2 min-h-[200px]"
                  >
                    {column.items.map((item: any, index: number) => (
                      <Draggable
                        key={item.id}
                        draggableId={item.id}
                        index={index}
                      >
                        {(provided) => (
                          <Card
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            className="p-4"
                          >
                            {item.content}
                          </Card>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>
          ))}
        </div>
      </DragDropContext>
    </div>
  )
}
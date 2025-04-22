"use client";

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PlusCircle, Edit, Trash2 } from 'lucide-react';
import { Itinerary, ItineraryDay, ItineraryItem } from '@/types/itinerary';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { useDroppable } from '@dnd-kit/core';

interface ItineraryBoardProps {
  itineraries: Itinerary[];
  activeItinerary: string | null;
  setActiveItinerary: (id: string | null) => void;
  setItineraries: (itineraries: Itinerary[]) => void;
  activeDay: string | null;
  setActiveDay: (id: string | null) => void;
}

export default function ItineraryBoard({ 
  itineraries, 
  activeItinerary, 
  setActiveItinerary, 
  setItineraries,
  activeDay,
  setActiveDay
}: ItineraryBoardProps) {
  const { toast } = useToast();
  const { setNodeRef } = useDroppable({
    id: 'itinerary-board',
  });
  
  const [editMode, setEditMode] = useState(false);

  const handleCreateItinerary = () => {
    const newItinerary: Itinerary = {
      id: `itinerary-${Date.now()}`,
      title: `New Itinerary ${itineraries.length + 1}`,
      days: [{
        id: `day-${Date.now()}`,
        title: 'Day 1',
        items: []
      }]
    };
    
    setItineraries([...itineraries, newItinerary]);
    setActiveItinerary(newItinerary.id);
    setActiveDay(newItinerary.days[0].id);
    
    toast({
      title: "New itinerary created",
      description: "Start adding items to your new itinerary.",
    });
  };

  const handleAddDay = (itineraryId: string) => {
    const updatedItineraries = itineraries.map(itinerary => {
      if (itinerary.id === itineraryId) {
        const dayNumber = itinerary.days.length + 1;
        const newDay = {
          id: `day-${Date.now()}`,
          title: `Day ${dayNumber}`,
          items: []
        };
        
        return {
          ...itinerary,
          days: [...itinerary.days, newDay]
        };
      }
      return itinerary;
    });
    
    setItineraries(updatedItineraries);
  };

  const handleDeleteItinerary = (itineraryId: string) => {
    const updatedItineraries = itineraries.filter(itinerary => itinerary.id !== itineraryId);
    setItineraries(updatedItineraries);
    
    if (activeItinerary === itineraryId) {
      setActiveItinerary(updatedItineraries.length > 0 ? updatedItineraries[0].id : null);
      setActiveDay(updatedItineraries.length > 0 && updatedItineraries[0].days.length > 0 ? updatedItineraries[0].days[0].id : null);
    }
    
    toast({
      title: "Itinerary deleted",
      description: "The itinerary has been removed.",
    });
  };

  const handleDeleteItem = (itineraryId: string, dayId: string, itemId: string) => {
    const updatedItineraries = itineraries.map(itinerary => {
      if (itinerary.id === itineraryId) {
        const updatedDays = itinerary.days.map(day => {
          if (day.id === dayId) {
            return {
              ...day,
              items: day.items.filter(item => item.id !== itemId)
            };
          }
          return day;
        });
        
        return {
          ...itinerary,
          days: updatedDays
        };
      }
      return itinerary;
    });
    
    setItineraries(updatedItineraries);
  };

  const getActiveItineraryData = () => {
    return itineraries.find(itinerary => itinerary.id === activeItinerary) || null;
  };

  const renderItineraryItem = (item: ItineraryItem, dayId: string, itineraryId: string) => {
    return (
      <div 
        key={item.id} 
        className="p-3 mb-2 bg-card border rounded-md shadow-sm"
      >
        <div className="flex justify-between items-start">
          <div>
            <h4 className="font-medium">{item.title}</h4>
            {item.time && <p className="text-sm text-muted-foreground">{item.time}</p>}
            {item.location && <p className="text-sm text-muted-foreground">{item.location}</p>}
            <p className="text-sm mt-1">{item.description}</p>
          </div>
          
          {editMode && (
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-6 w-6" 
              onClick={() => handleDeleteItem(itineraryId, dayId, item.id)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    );
  };

  const renderDay = (day: ItineraryDay, itineraryId: string) => {
    return (
      <TabsContent key={day.id} value={day.id} className="mt-0 p-4">
        <div className="space-y-2">
          {day.items.length > 0 ? (
            day.items.map(item => renderItineraryItem(item, day.id, itineraryId))
          ) : (
            <div className="p-8 text-center text-muted-foreground">
              <p>No items added to this day yet.</p>
              <p className="text-sm">Drag items from the chat to add them here.</p>
            </div>
          )}
        </div>
      </TabsContent>
    );
  };

  const activeItineraryData = getActiveItineraryData();

  return (
    <div ref={setNodeRef} className="p-4 h-full">
      {itineraries.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-full">
          <h3 className="text-xl font-medium mb-4">No Itineraries Yet</h3>
          <p className="text-muted-foreground mb-6 text-center max-w-md">
            Create your first itinerary or drag items from the chat to automatically create one.
          </p>
          <Button onClick={handleCreateItinerary}>
            <PlusCircle className="h-4 w-4 mr-2" />
            Create Itinerary
          </Button>
        </div>
      ) : (
        <div className="h-full flex flex-col">
          <div className="flex justify-between items-center mb-4">
            <div className="flex space-x-2">
              {itineraries.map(itinerary => (
                <Button
                  key={itinerary.id}
                  variant={activeItinerary === itinerary.id ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    setActiveItinerary(itinerary.id);
                    setActiveDay(itinerary.days[0]?.id || null);
                  }}
                  className="text-sm"
                >
                  {itinerary.title}
                </Button>
              ))}
              <Button variant="ghost" size="icon" onClick={handleCreateItinerary}>
                <PlusCircle className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="flex space-x-2">
              <Button 
                variant={editMode ? "default" : "outline"} 
                size="sm" 
                onClick={() => setEditMode(!editMode)}
              >
                <Edit className="h-4 w-4 mr-2" />
                {editMode ? "Done" : "Edit"}
              </Button>
              
              {editMode && activeItineraryData && (
                <Button 
                  variant="destructive" 
                  size="sm" 
                  onClick={() => handleDeleteItinerary(activeItineraryData.id)}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              )}
            </div>
          </div>
          
          {activeItineraryData && (
            <Card className="flex-1">
              <CardHeader className="pb-2">
                <CardTitle>{activeItineraryData.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs 
                  value={activeDay || activeItineraryData.days[0]?.id} 
                  onValueChange={setActiveDay}
                >
                  <div className="flex justify-between items-center mb-4">
                    <TabsList>
                      {activeItineraryData.days.map(day => (
                        <TabsTrigger key={day.id} value={day.id}>
                          {day.title}
                        </TabsTrigger>
                      ))}
                    </TabsList>
                    
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => handleAddDay(activeItineraryData.id)}
                    >
                      <PlusCircle className="h-4 w-4 mr-2" />
                      Add Day
                    </Button>
                  </div>
                  
                  {activeItineraryData.days.map(day => renderDay(day, activeItineraryData.id))}
                </Tabs>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
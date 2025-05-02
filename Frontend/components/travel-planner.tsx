"use client";

import { useState } from 'react';
import { DndContext, DragEndEvent, DragStartEvent, useSensor, useSensors, PointerSensor } from '@dnd-kit/core';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { MapIcon, ListTodo, CalendarDays, DollarSign, Save, LogOut, Plane } from 'lucide-react';
import ItineraryBoard from '@/components/itinerary-board';
import ChatInterface from '@/components/ChatInterface';
import MapView from '@/components/MapView';
import BookingsView from '@/components/BookingsView';
import { Itinerary, ItineraryItem } from '@/types/itinerary';

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

async function geocodeLocation(location: string): Promise<{ longitude: number; latitude: number } | null> {
  try {
    const response = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(location)}.json?access_token=${MAPBOX_TOKEN}&limit=1`
    );
    const data = await response.json();
    
    if (data.features && data.features.length > 0) {
      const [longitude, latitude] = data.features[0].center;
      return { longitude, latitude };
    }
  } catch (error) {
    console.error('Geocoding error:', error);
  }
  return null;
}

async function searchPlaces(query: string, center: [number, number], radius: number) {
  try {
    const response = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?` +
      `proximity=${center[0]},${center[1]}&` +
      `types=poi&` +
      `limit=10&` +
      `access_token=${MAPBOX_TOKEN}`
    );
    const data = await response.json();
    return data.features
      .filter((feature: any) => {
        const distance = calculateDistance(
          center,
          [feature.center[0], feature.center[1]]
        );
        return distance <= radius;
      })
      .map((feature: any) => ({
        name: feature.place_name,
        coordinates: feature.center as [number, number],
        description: feature.properties?.category || feature.place_type.join(', ')
      }));
  } catch (error) {
    console.error('Place search error:', error);
    return [];
  }
}

function calculateDistance(point1: [number, number], point2: [number, number]): number {
  const R = 6371; // Earth's radius in kilometers
  const lat1 = point1[1] * Math.PI / 180;
  const lat2 = point2[1] * Math.PI / 180;
  const dLat = (point2[1] - point1[1]) * Math.PI / 180;
  const dLon = (point2[0] - point1[0]) * Math.PI / 180;

  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
           Math.cos(lat1) * Math.cos(lat2) *
           Math.sin(dLon/2) * Math.sin(dLon/2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

export default function TravelPlanner() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('map');
  const [itineraries, setItineraries] = useState<Itinerary[]>([]);
  const [activeItinerary, setActiveItinerary] = useState<string | null>(null);
  const [activeDay, setActiveDay] = useState<string | null>(null);
  const [draggedItem, setDraggedItem] = useState<ItineraryItem | null>(null);
  const [searchArea, setSearchArea] = useState<{
    center: [number, number];
    radius: number;
  } | undefined>(undefined);
  const [suggestedPlaces, setSuggestedPlaces] = useState<Array<{
    name: string;
    coordinates: [number, number];
    description?: string;
  }>>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const createSession = async () => {
    try {
      const response = await fetch('http://localhost:5000/sessions', {
        method: 'POST'
      });
      const data = await response.json();
      setSessionId(data.session_id);
      toast({
        title: "Session created",
        description: "Connected to the travel planning service.",
      });
    } catch (error) {
      console.error('Error creating session:', error);
      toast({
        title: "Connection failed",
        description: "Failed to connect to the travel planning service.",
        variant: "destructive"
      });
    }
  };

  useState(() => {
    createSession();
  });

  const handleDragStart = (event: DragStartEvent) => {
    try {
      const { active } = event;
      const item = JSON.parse(active.id.toString()) as ItineraryItem;
      setDraggedItem(item);
    } catch (error) {
      console.error("Error parsing dragged item:", error);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { over } = event;
    
    if (over && over.id === 'itinerary-board' && draggedItem) {
      let coordinates = undefined;
      if (draggedItem.location) {
        coordinates = (await geocodeLocation(draggedItem.location)) || undefined;
        if (!coordinates) {
          toast({
            title: "Location not found",
            description: "Could not find coordinates for this location.",
            variant: "destructive"
          });
        }
      }
      
      const itemWithCoordinates = {
        ...draggedItem,
        id: `${draggedItem.id}-${Date.now()}`,
        coordinates
      };

      if (!activeItinerary) {
        const newDay = {
          id: `day-${Date.now()}`,
          title: 'Day 1',
          items: [itemWithCoordinates]
        };
        
        const newItinerary: Itinerary = {
          id: `itinerary-${Date.now()}`,
          title: 'New Itinerary',
          days: [newDay]
        };
        
        setItineraries([...itineraries, newItinerary]);
        setActiveItinerary(newItinerary.id);
        setActiveDay(newDay.id);
        
        toast({
          title: "Item added to new itinerary",
          description: `Added "${draggedItem.title}" to a new itinerary.`,
        });
      } else {
        const updatedItineraries = itineraries.map(itinerary => {
          if (itinerary.id === activeItinerary) {
            const updatedDays = itinerary.days.map(day => {
              if (day.id === activeDay) {
                return {
                  ...day,
                  items: [...day.items, itemWithCoordinates]
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
        
        toast({
          title: "Item added to itinerary",
          description: `Added "${draggedItem.title}" to your itinerary.`,
        });
      }

      if (coordinates) {
        setActiveTab('map');
      }
    }
    
    setDraggedItem(null);
  };

  const handleCircleDrawn = (center: [number, number], radius: number) => {
    setSearchArea({ center, radius });
    setSuggestedPlaces([]);
    toast({
      title: "Circle drawn",
      description: "Check the chat for place suggestions.",
    });
  };

  const handlePlaceSearch = async (query: string, center: [number, number], radius: number) => {
    try {
      const places = await searchPlaces(query, center, radius);
      setSuggestedPlaces(places);
    } catch (error) {
      console.error('Error searching places:', error);
      toast({
        title: "Search failed",
        description: "Failed to search for places. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleSave = async () => {
    const currentItinerary = itineraries.find(itinerary => itinerary.id === activeItinerary);
    
    if (!currentItinerary || !sessionId) {
      toast({
        title: "Cannot save",
        description: "No active itinerary or session to save.",
        variant: "destructive"
      });
      return;
    }
    
    try {
      const response = await fetch(`http://localhost:5000/sessions/${sessionId}/create-itinerary`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          destination: currentItinerary.title,
          duration: `${currentItinerary.days.length} days`,
          itinerary: JSON.stringify(currentItinerary)
        })
      });
      
      if (response.ok) {
        toast({
          title: "Itinerary saved",
          description: "Your travel plans have been saved successfully.",
        });
      } else {
        toast({
          title: "Save failed",
          description: "Failed to save the itinerary. Please try again.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error saving itinerary:', error);
      toast({
        title: "Save failed",
        description: "Failed to save the itinerary due to a connection error.",
        variant: "destructive"
      });
    }
  };

  const renderMainContent = () => {
    switch (activeTab) {
      case 'map':
        return (
          <MapView 
            itineraries={itineraries}
            activeItinerary={activeItinerary}
            activeDay={activeDay}
            onCircleDrawn={handleCircleDrawn}
            suggestedPlaces={suggestedPlaces}
          />
        );
      case 'itinerary':
        return (
          <Card className="h-[calc(100vh-220px)] overflow-auto">
            <ItineraryBoard 
              itineraries={itineraries}
              activeItinerary={activeItinerary}
              setActiveItinerary={setActiveItinerary}
              setItineraries={setItineraries}
              activeDay={activeDay}
              setActiveDay={setActiveDay}
            />
          </Card>
        );
      case 'bookings':
        return (
          <Card className="h-[calc(100vh-220px)] overflow-auto">
            <BookingsView 
              itineraries={itineraries}
              activeItinerary={activeItinerary}
              sessionId={sessionId}
            />
          </Card>
        );
      default:
        return (
          <Card className="h-[calc(100vh-220px)] overflow-auto">
            <div className="p-8 text-center text-muted-foreground">
              <p>This feature is coming soon!</p>
            </div>
          </Card>
        );
    }
  };

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-12">
          <Card className="p-4">
            <div className="flex justify-between items-center">
              <Tabs value={activeTab} className="w-[500px]" onValueChange={setActiveTab}>
                <TabsList>
                  <TabsTrigger value="map">
                    <MapIcon className="h-4 w-4 mr-2" />
                    Map
                  </TabsTrigger>
                  <TabsTrigger value="itinerary">
                    <CalendarDays className="h-4 w-4 mr-2" />
                    Itinerary Board
                  </TabsTrigger>
                  <TabsTrigger value="bookings">
                    <Plane className="h-4 w-4 mr-2" />
                    Bookings
                  </TabsTrigger>
                  <TabsTrigger value="list">
                    <ListTodo className="h-4 w-4 mr-2" />
                    List
                  </TabsTrigger>
                  <TabsTrigger value="expenses">
                    <DollarSign className="h-4 w-4 mr-2" />
                    Expenses
                  </TabsTrigger>
                </TabsList>
              </Tabs>
              
              <div className="flex space-x-2">
                <Button onClick={handleSave}>
                  <Save className="h-4 w-4 mr-2" />
                  Save
                </Button>
                <Button variant="outline">
                  <LogOut className="h-4 w-4 mr-2" />
                  Exit
                </Button>
              </div>
            </div>
          </Card>
        </div>
        
        <div className="lg:col-span-7">
          {renderMainContent()}
        </div>
        
        <div className="lg:col-span-5">
          <Card className="h-[calc(100vh-220px)] overflow-auto">
            <ChatInterface 
              onSearch={handlePlaceSearch}
              searchArea={searchArea}
              suggestedPlaces={suggestedPlaces}
            />
          </Card>
        </div>
      </div>
    </DndContext>
  );
}
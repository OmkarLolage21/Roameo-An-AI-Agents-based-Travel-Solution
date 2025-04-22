"use client"

import { useState } from 'react'
import { Card } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { CalendarDays, MapPin, Plus } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

const TRIP_DATA = {
  upcoming: [
    {
      id: 1,
      title: "Paris, France",
      image: "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=600&h=300&fit=crop",
      startDate: "May 15, 2024",
      endDate: "May 22, 2024",
      locations: 8,
      expenses: 250000,
      companions: ["John", "Sarah"]
    },
    {
      id: 2,
      title: "Tokyo, Japan",
      image: "https://images.unsplash.com/photo-1480796927426-f609979314bd?w=600&h=300&fit=crop",
      startDate: "June 10, 2024",
      endDate: "June 20, 2024",
      locations: 12,
      expenses: 350000,
      companions: ["Mike", "Emma"]
    }
  ],
  ongoing: [
    {
      id: 3,
      title: "Barcelona, Spain",
      image: "https://images.unsplash.com/photo-1583422409516-2895a77efded?w=600&h=300&fit=crop",
      startDate: "March 20, 2024",
      endDate: "March 27, 2024",
      locations: 6,
      expenses: 180000,
      companions: ["Alex"]
    }
  ],
  past: [
    {
      id: 4,
      title: "New York, USA",
      image: "https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=600&h=300&fit=crop",
      startDate: "January 5, 2024",
      endDate: "January 12, 2024",
      locations: 10,
      expenses: 280000,
      companions: ["Lisa", "Tom"]
    },
    {
      id: 5,
      title: "Rome, Italy",
      image: "https://images.unsplash.com/photo-1552832230-c0197dd311b5?w=600&h=300&fit=crop",
      startDate: "December 10, 2023",
      endDate: "December 17, 2023",
      locations: 7,
      expenses: 220000,
      companions: ["David"]
    }
  ]
}

export default function TripsView() {
  const { toast } = useToast();
  const [trips, setTrips] = useState(TRIP_DATA);

  const handleAddTrip = () => {
    const newTrip = {
      id: Date.now(),
      title: "New Adventure",
      image: "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=600&h=300&fit=crop",
      startDate: "April 1, 2024",
      endDate: "April 7, 2024",
      locations: 0,
      expenses: 0,
      companions: []
    };

    setTrips(prev => ({
      ...prev,
      upcoming: [newTrip, ...prev.upcoming]
    }));

    toast({
      title: "Trip Created",
      description: "Your new trip has been added to upcoming trips.",
    });
  };

  const handleDeleteTrip = (category: keyof typeof TRIP_DATA, tripId: number) => {
    setTrips(prev => ({
      ...prev,
      [category]: prev[category].filter(trip => trip.id !== tripId)
    }));

    toast({
      title: "Trip Deleted",
      description: "The trip has been removed from your list.",
    });
  };

  const renderTripCard = (trip: any, category: keyof typeof TRIP_DATA) => (
    <Card key={trip.id} className="p-4 hover:shadow-md transition-shadow">
      <div className="aspect-video bg-muted rounded-md mb-3 relative group">
        <img
          src={trip.image}
          alt={trip.title}
          className="w-full h-full object-cover rounded-md"
        />
        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <Button 
            variant="destructive"
            size="sm"
            onClick={() => handleDeleteTrip(category, trip.id)}
          >
            Delete Trip
          </Button>
        </div>
      </div>
      <h3 className="font-semibold mb-2">{trip.title}</h3>
      <div className="space-y-1 text-sm text-muted-foreground">
        <div className="flex items-center space-x-2">
          <CalendarDays className="h-4 w-4" />
          <span>{trip.startDate} - {trip.endDate}</span>
        </div>
        <div className="flex items-center space-x-2">
          <MapPin className="h-4 w-4" />
          <span>{trip.locations} locations planned</span>
        </div>
        <div className="mt-2">
          <p className="text-sm font-medium">Expenses: ₹{(trip.expenses / 100).toFixed(2)}</p>
          <p className="text-xs text-muted-foreground">
            Traveling with: {trip.companions.join(", ")}
          </p>
        </div>
      </div>
    </Card>
  );

  return (
    <Card className="p-6">
      <div className="flex justify-between items-center mb-6">
        <Tabs defaultValue="upcoming" className="w-full">
          <div className="flex justify-between items-center">
            <TabsList>
              <TabsTrigger value="upcoming">Upcoming Trips</TabsTrigger>
              <TabsTrigger value="ongoing">Ongoing Trips</TabsTrigger>
              <TabsTrigger value="past">Past Trips</TabsTrigger>
            </TabsList>
            <Button onClick={handleAddTrip}>
              <Plus className="h-4 w-4 mr-2" />
              New Trip
            </Button>
          </div>

          {Object.entries(trips).map(([status, tripList]) => (
            <TabsContent key={status} value={status}>
              <div className="grid grid-cols-2 gap-6">
                {tripList.map(trip => renderTripCard(trip, status as keyof typeof TRIP_DATA))}
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </Card>
  );
}
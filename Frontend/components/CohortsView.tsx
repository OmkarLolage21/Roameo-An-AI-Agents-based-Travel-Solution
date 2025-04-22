"use client"

import { useState } from 'react'
import { Card } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Users, MapPin, Calendar, Plus } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

const INITIAL_COHORT_DATA = {
  recommended: [
    {
      id: 1,
      title: "Europe Backpackers",
      members: 156,
      destination: "Multiple European Cities",
      dates: "May - September 2024",
      image: "https://images.unsplash.com/photo-1491557345352-5929e343eb89?w=600&h=300&fit=crop",
      joined: false
    },
    {
      id: 2,
      title: "Japan Culture Enthusiasts",
      members: 89,
      destination: "Tokyo, Kyoto, Osaka",
      dates: "April - June 2024",
      image: "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=600&h=300&fit=crop",
      joined: false
    }
  ],
  popular: [
    {
      id: 3,
      title: "Southeast Asia Explorers",
      members: 234,
      destination: "Thailand, Vietnam, Cambodia",
      dates: "October - December 2024",
      image: "https://images.unsplash.com/photo-1528181304800-259b08848526?w=600&h=300&fit=crop",
      joined: false
    }
  ],
  joined: []
};

export default function CohortsView() {
  const { toast } = useToast();
  const [cohortData, setCohortData] = useState(INITIAL_COHORT_DATA);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const handleJoinCohort = (category: string, cohortId: number) => {
    const cohort = cohortData[category].find(c => c.id === cohortId);
    if (cohort) {
      // Remove from original category
      setCohortData(prev => ({
        ...prev,
        [category]: prev[category].filter(c => c.id !== cohortId),
        joined: [...prev.joined, { ...cohort, joined: true }]
      }));

      toast({
        title: "Cohort Joined",
        description: `You have successfully joined ${cohort.title}!`,
      });
    }
  };

  const handleLeaveCohort = (cohortId: number) => {
    const cohort = cohortData.joined.find(c => c.id === cohortId);
    if (cohort) {
      setCohortData(prev => ({
        ...prev,
        joined: prev.joined.filter(c => c.id !== cohortId),
        recommended: [...prev.recommended, { ...cohort, joined: false }]
      }));

      toast({
        title: "Cohort Left",
        description: `You have left ${cohort.title}.`,
      });
    }
  };

  const handleCreateCohort = () => {
    const newCohort = {
      id: Date.now(),
      title: "New Travel Group",
      members: 1,
      destination: "Custom Destination",
      dates: "2024",
      image: "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=600&h=300&fit=crop",
      joined: true
    };

    setCohortData(prev => ({
      ...prev,
      joined: [...prev.joined, newCohort]
    }));

    toast({
      title: "Cohort Created",
      description: "Your new travel group has been created!",
    });
  };

  const renderCohortCard = (cohort: any, category: string) => (
    <Card key={cohort.id} className="p-4 hover:shadow-md transition-shadow">
      <div className="aspect-video bg-muted rounded-md mb-3">
        <img
          src={cohort.image}
          alt={cohort.title}
          className="w-full h-full object-cover rounded-md"
        />
      </div>
      <h3 className="font-semibold mb-2">{cohort.title}</h3>
      <div className="space-y-1 text-sm text-muted-foreground">
        <div className="flex items-center space-x-2">
          <Users className="h-4 w-4" />
          <span>{cohort.members} members</span>
        </div>
        <div className="flex items-center space-x-2">
          <MapPin className="h-4 w-4" />
          <span>{cohort.destination}</span>
        </div>
        <div className="flex items-center space-x-2">
          <Calendar className="h-4 w-4" />
          <span>{cohort.dates}</span>
        </div>
      </div>
      <Button 
        variant={cohort.joined ? "destructive" : "outline"} 
        className="w-full mt-4"
        onClick={() => cohort.joined ? handleLeaveCohort(cohort.id) : handleJoinCohort(category, cohort.id)}
      >
        {cohort.joined ? "Leave Group" : "Join Group"}
      </Button>
    </Card>
  );

  return (
    <Card className="p-6">
      <div className="flex justify-between items-center mb-6">
        <Tabs defaultValue="recommended" className="w-full">
          <div className="flex justify-between items-center">
            <TabsList>
              <TabsTrigger value="recommended">Recommended</TabsTrigger>
              <TabsTrigger value="popular">Popular</TabsTrigger>
              <TabsTrigger value="joined">Joined</TabsTrigger>
            </TabsList>
            <Button onClick={handleCreateCohort}>
              <Plus className="h-4 w-4 mr-2" />
              Create Cohort
            </Button>
          </div>

          {Object.entries(cohortData).map(([category, cohorts]) => (
            <TabsContent key={category} value={category}>
              <div className="grid grid-cols-2 gap-6">
                {cohorts.map(cohort => renderCohortCard(cohort, category))}
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </Card>
  );
}
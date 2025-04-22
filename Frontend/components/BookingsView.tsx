import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import Spinner from '@/components/ui/spinner';
import { useToast } from '@/hooks/use-toast';
import { Itinerary } from '@/types/itinerary';
import { Plane, Hotel, Bus, Globe, RefreshCw } from 'lucide-react';

interface BookingsViewProps {
  itineraries: Itinerary[];
  activeItinerary: string | null;
  sessionId: string | null;
}

export default function BookingsView({ itineraries, activeItinerary, sessionId }: BookingsViewProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState<boolean>(false);
  const [bookingTab, setBookingTab] = useState<string>('transportation');
  const [transportationOptions, setTransportationOptions] = useState<string>('');
  const [accommodationOptions, setAccommodationOptions] = useState<string>('');
  const [localTransportOptions, setLocalTransportOptions] = useState<string>('');
  const [comprehensivePlan, setComprehensivePlan] = useState<string>('');
  
  const currentItinerary = itineraries.find(i => i.id === activeItinerary);

  // Function to fetch transportation options
  const fetchTransportationOptions = async () => {
    if (!sessionId || !currentItinerary) {
      toast({
        title: "Cannot fetch options",
        description: "No active itinerary or session.",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`http://localhost:5000/sessions/${sessionId}/find-transportation-options`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          itinerary: JSON.stringify(currentItinerary)
        })
      });

      if (response.ok) {
        const data = await response.json();
        setTransportationOptions(data.transportation_options);
      } else {
        toast({
          title: "Failed to load transportation options",
          description: "Please try again or check your connection.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error fetching transportation options:', error);
      toast({
        title: "Connection error",
        description: "Failed to connect to the booking service.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Function to fetch accommodation options
  const fetchAccommodationOptions = async () => {
    if (!sessionId || !currentItinerary) {
      toast({
        title: "Cannot fetch options",
        description: "No active itinerary or session.",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`http://localhost:5000/sessions/${sessionId}/find-accommodation-options`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          itinerary: JSON.stringify(currentItinerary)
        })
      });

      if (response.ok) {
        const data = await response.json();
        setAccommodationOptions(data.accommodation_options);
      } else {
        toast({
          title: "Failed to load accommodation options",
          description: "Please try again or check your connection.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error fetching accommodation options:', error);
      toast({
        title: "Connection error",
        description: "Failed to connect to the booking service.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Function to fetch local transportation options
  const fetchLocalTransportOptions = async () => {
    if (!sessionId || !currentItinerary) {
      toast({
        title: "Cannot fetch options",
        description: "No active itinerary or session.",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`http://localhost:5000/sessions/${sessionId}/find-local-transportation`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          itinerary: JSON.stringify(currentItinerary)
        })
      });

      if (response.ok) {
        const data = await response.json();
        setLocalTransportOptions(data.local_transportation);
      } else {
        toast({
          title: "Failed to load local transportation options",
          description: "Please try again or check your connection.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error fetching local transportation options:', error);
      toast({
        title: "Connection error",
        description: "Failed to connect to the booking service.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Function to create comprehensive travel plan
  const createComprehensivePlan = async () => {
    if (!sessionId || !currentItinerary) {
      toast({
        title: "Cannot create plan",
        description: "No active itinerary or session.",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`http://localhost:5000/sessions/${sessionId}/create-comprehensive-plan`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          itinerary: JSON.stringify(currentItinerary)
        })
      });

      if (response.ok) {
        const data = await response.json();
        setComprehensivePlan(data.comprehensive_plan);
      } else {
        toast({
          title: "Failed to create comprehensive plan",
          description: "Please try again or check your connection.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error creating comprehensive plan:', error);
      toast({
        title: "Connection error",
        description: "Failed to connect to the booking service.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Only handle tab change, but don't fetch data automatically
  const handleTabChange = (value: string) => {
    setBookingTab(value);
  };

  // Helper function to render markdown content
  const renderMarkdown = (content: string) => {
    // This is a simple renderer - in a real app, you'd use a markdown library
    return (
      <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: content }} />
    );
  };

  if (!currentItinerary) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>No Active Itinerary</CardTitle>
            <CardDescription>
              Please select or create an itinerary to view booking options.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">Booking Options for {currentItinerary.title}</h2>
      
      <Tabs value={bookingTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="grid grid-cols-4 mb-4">
          <TabsTrigger value="transportation">
            <Plane className="h-4 w-4 mr-2" />
            Transportation
          </TabsTrigger>
          <TabsTrigger value="accommodation">
            <Hotel className="h-4 w-4 mr-2" />
            Accommodation
          </TabsTrigger>
          <TabsTrigger value="local-transport">
            <Bus className="h-4 w-4 mr-2" />
            Local Transport
          </TabsTrigger>
          <TabsTrigger value="comprehensive">
            <Globe className="h-4 w-4 mr-2" />
            Complete Plan
          </TabsTrigger>
        </TabsList>

        <TabsContent value="transportation">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Transportation Booking Options
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={fetchTransportationOptions}
                  disabled={loading}
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              </CardTitle>
              <CardDescription>
                Find the best options for flights, trains, and buses between destinations
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center p-12">
                  <Spinner size="lg" />
                </div>
              ) : transportationOptions ? (
                <div className="prose max-w-none">
                  {renderMarkdown(transportationOptions)}
                </div>
              ) : (
                <div className="text-center p-6">
                  <p className="text-muted-foreground">No transportation options loaded yet.</p>
                  <Button 
                    onClick={fetchTransportationOptions} 
                    className="mt-4"
                    disabled={loading}
                  >
                    Find Transportation Options
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="accommodation">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Accommodation Options
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={fetchAccommodationOptions}
                  disabled={loading}
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              </CardTitle>
              <CardDescription>
                Hotels, hostels, and other places to stay during your trip
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center p-12">
                  <Spinner size="lg" />
                </div>
              ) : accommodationOptions ? (
                <div className="prose max-w-none">
                  {renderMarkdown(accommodationOptions)}
                </div>
              ) : (
                <div className="text-center p-6">
                  <p className="text-muted-foreground">No accommodation options loaded yet.</p>
                  <Button 
                    onClick={fetchAccommodationOptions} 
                    className="mt-4"
                    disabled={loading}
                  >
                    Find Accommodation Options
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="local-transport">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Local Transportation
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={fetchLocalTransportOptions}
                  disabled={loading}
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              </CardTitle>
              <CardDescription>
                Public transit, taxis, and other ways to get around at your destination
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center p-12">
                  <Spinner size="lg" />
                </div>
              ) : localTransportOptions ? (
                <div className="prose max-w-none">
                  {renderMarkdown(localTransportOptions)}
                </div>
              ) : (
                <div className="text-center p-6">
                  <p className="text-muted-foreground">No local transportation options loaded yet.</p>
                  <Button 
                    onClick={fetchLocalTransportOptions} 
                    className="mt-4"
                    disabled={loading}
                  >
                    Find Local Transport Options
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="comprehensive">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Comprehensive Travel Plan
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={createComprehensivePlan}
                  disabled={loading}
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              </CardTitle>
              <CardDescription>
                Complete step-by-step booking guide with timeline and budget
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center p-12">
                  <Spinner size="lg" />
                </div>
              ) : comprehensivePlan ? (
                <div className="prose max-w-none">
                  {renderMarkdown(comprehensivePlan)}
                </div>
              ) : (
                <div className="text-center p-6">
                  <p className="text-muted-foreground">No comprehensive plan created yet.</p>
                  <Button 
                    onClick={createComprehensivePlan} 
                    className="mt-4"
                    disabled={loading}
                  >
                    Create Comprehensive Plan
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
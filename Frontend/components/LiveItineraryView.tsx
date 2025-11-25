"use client"

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Clock, 
  MapPin, 
  Smile, 
  Frown, 
  Meh, 
  Battery, 
  Utensils, 
  AlertTriangle,
  Check,
  X,
  Loader2,
  RefreshCw,
  TrendingUp,
  Coffee,
  Zap
} from 'lucide-react'
import axios from 'axios'

interface Activity {
  time: string
  name: string
  location: string
  description?: string
  status?: 'completed' | 'current' | 'upcoming' | 'cancelled'
  type?: string
}

interface ItineraryAdjustment {
  activities_to_cancel: string[]
  alternative_activities: Array<{
    name: string
    location: string
    reason: string
    estimated_time: string
  }>
  updated_schedule: Activity[]
  estimated_cost_impact: string
  reasoning: string
}

interface LiveItineraryViewProps {
  sessionId: string
  currentItinerary: Activity[]
  onItineraryUpdate?: (updatedItinerary: Activity[]) => void
}

const moodOptions = [
  { value: 'tired', label: 'Tired & Need Rest', icon: Battery, color: 'bg-orange-500' },
  { value: 'energetic', label: 'Energetic & Active', icon: Zap, color: 'bg-green-500' },
  { value: 'hungry', label: 'Hungry', icon: Utensils, color: 'bg-yellow-500' },
  { value: 'relaxed', label: 'Relaxed', icon: Coffee, color: 'bg-blue-500' },
  { value: 'adventurous', label: 'Adventurous', icon: TrendingUp, color: 'bg-purple-500' },
]

export default function LiveItineraryView({ 
  sessionId, 
  currentItinerary, 
  onItineraryUpdate 
}: LiveItineraryViewProps) {
  const [selectedMood, setSelectedMood] = useState<string>('')
  const [currentTime, setCurrentTime] = useState<string>(
    new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })
  )
  const [currentLocation, setCurrentLocation] = useState<string>('')
  const [isAdjusting, setIsAdjusting] = useState(false)
  const [adjustmentResult, setAdjustmentResult] = useState<ItineraryAdjustment | null>(null)
  const [error, setError] = useState<string>('')
  const [showResults, setShowResults] = useState(false)
  const [localItinerary, setLocalItinerary] = useState<Activity[]>(currentItinerary)

  // Update local itinerary when props change
  useEffect(() => {
    setLocalItinerary(currentItinerary)
  }, [currentItinerary])

  const handleMoodUpdate = async (mood: string) => {
    setSelectedMood(mood)
    setError('')
    
    try {
      await axios.post(
        `http://localhost:5000/sessions/${sessionId}/update-mood`,
        {
          mood_state: mood,
          current_time: currentTime,
          current_location: currentLocation || 'Current location'
        }
      )
    } catch (err: any) {
      console.error('Error updating mood:', err)
      setError(err.response?.data?.error || 'Failed to update mood')
    }
  }

  const handleAdjustItinerary = async () => {
    if (!selectedMood) {
      setError('Please select your current mood/state first')
      return
    }

    if (!sessionId) {
      setError('Session not found. Please refresh the page.')
      return
    }

    setIsAdjusting(true)
    setError('')
    setShowResults(false)

    try {
      const response = await axios.post(
        `http://localhost:5000/sessions/${sessionId}/adjust-itinerary`,
        {
          current_itinerary: localItinerary,
          mood_state: selectedMood,
          current_time: currentTime,
          current_location: currentLocation || 'Current location'
        }
      )

      const result = response.data.result
      setAdjustmentResult(result)
      setShowResults(true)

      // Notify parent component of the update
      if (onItineraryUpdate && result.updated_schedule) {
        onItineraryUpdate(result.updated_schedule)
      }
    } catch (err: any) {
      console.error('Error adjusting itinerary:', err)
      const errorMsg = err.response?.status === 404 
        ? 'Session expired. Please refresh the page to create a new session.'
        : err.response?.data?.error || 'Failed to adjust itinerary';
      setError(errorMsg)
    } finally {
      setIsAdjusting(false)
    }
  }

  const acceptAdjustments = () => {
    if (!adjustmentResult) return;

    // Build updated itinerary from the adjustment result
    const updatedActivities: Activity[] = [];
    
    // Add alternative activities first
    adjustmentResult.alternative_activities?.forEach((alt, index) => {
      updatedActivities.push({
        time: alt.estimated_time || currentTime,
        name: alt.name,
        location: alt.location,
        description: alt.reason,
        status: 'upcoming',
        type: 'alternative'
      });
    });
    
    // Add existing activities that weren't cancelled
    localItinerary.forEach(activity => {
      const isCancelled = adjustmentResult.activities_to_cancel?.some(
        cancelled => activity.name.toLowerCase().includes(cancelled.toLowerCase()) ||
                    cancelled.toLowerCase().includes(activity.name.toLowerCase())
      );
      
      if (!isCancelled) {
        updatedActivities.push({
          ...activity,
          status: 'upcoming'
        });
      }
    });

    // Update local state first
    setLocalItinerary(updatedActivities);
    
    // Notify parent component with the full updated itinerary
    if (onItineraryUpdate) {
      onItineraryUpdate(updatedActivities);
    }
    
    // Reset UI state
    setShowResults(false);
    setSelectedMood('');
    setAdjustmentResult(null);
  }

  const rejectAdjustments = () => {
    setShowResults(false)
    setAdjustmentResult(null)
  }

  const getCurrentActivity = () => {
    const now = new Date()
    const currentTimeStr = now.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit', 
      hour12: false 
    })
    
    return localItinerary.find(activity => {
      // Simple time comparison - in production, you'd want more robust logic
      return activity.status === 'current' || activity.time === currentTimeStr
    }) || localItinerary[0]
  }

  const getUpcomingActivities = () => {
    return localItinerary.filter(activity => 
      activity.status === 'upcoming' || !activity.status
    ).slice(0, 3)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="w-5 h-5" />
            Live Itinerary - Dynamic Re-routing
          </CardTitle>
          <CardDescription>
            Update your mood or energy level and let AI instantly adjust your day
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Current Status */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Current Status</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm">Current Time: {currentTime}</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Current location"
                value={currentLocation}
                onChange={(e) => setCurrentLocation(e.target.value)}
                className="text-sm border rounded px-2 py-1 flex-1"
              />
            </div>
          </div>

          {getCurrentActivity() && (
            <div className="mt-4 p-4 bg-blue-50 rounded-lg">
              <p className="text-sm font-medium text-blue-900">Current Activity:</p>
              <p className="text-lg font-semibold text-blue-950">
                {getCurrentActivity()?.name}
              </p>
              <p className="text-sm text-blue-700">
                {getCurrentActivity()?.location}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Mood Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">How are you feeling?</CardTitle>
          <CardDescription>
            Select your current mood or energy level to get personalized suggestions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {moodOptions.map((mood) => {
              const Icon = mood.icon
              return (
                <Button
                  key={mood.value}
                  variant={selectedMood === mood.value ? "default" : "outline"}
                  className={`h-auto py-4 flex flex-col items-center gap-2 ${
                    selectedMood === mood.value ? mood.color : ''
                  }`}
                  onClick={() => handleMoodUpdate(mood.value)}
                >
                  <Icon className="w-6 h-6" />
                  <span className="text-xs text-center">{mood.label}</span>
                </Button>
              )
            })}
          </div>

          {selectedMood && (
            <div className="mt-4 flex justify-center">
              <Button
                onClick={handleAdjustItinerary}
                disabled={isAdjusting}
                size="lg"
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
              >
                {isAdjusting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Analyzing & Adjusting...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Re-route My Day
                  </>
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Error Display */}
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {error}
            {error.includes('Session') && (
              <Button 
                variant="link" 
                size="sm" 
                onClick={() => window.location.reload()}
                className="ml-2 text-red-900 underline"
              >
                Refresh Page
              </Button>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* Adjustment Results */}
      {showResults && adjustmentResult && (
        <Card className="border-2 border-blue-500">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Check className="w-5 h-5 text-green-500" />
              AI-Powered Adjustments Ready
            </CardTitle>
            <CardDescription>
              Review the suggested changes to your itinerary
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* AI Reasoning */}
            {adjustmentResult.reasoning && (
              <div className="p-4 bg-blue-50 rounded-lg">
                <p className="text-sm font-medium text-blue-900 mb-2">AI Analysis:</p>
                <p className="text-sm text-blue-950">{adjustmentResult.reasoning}</p>
              </div>
            )}

            <Tabs defaultValue="cancelled" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="cancelled">
                  Cancelled ({adjustmentResult.activities_to_cancel?.length || 0})
                </TabsTrigger>
                <TabsTrigger value="alternatives">
                  Alternatives ({adjustmentResult.alternative_activities?.length || 0})
                </TabsTrigger>
                <TabsTrigger value="schedule">Updated Schedule</TabsTrigger>
              </TabsList>

              <TabsContent value="cancelled" className="space-y-2">
                {adjustmentResult.activities_to_cancel?.map((activity, index) => (
                  <div key={index} className="p-3 bg-red-50 rounded-lg flex items-center gap-2">
                    <X className="w-4 h-4 text-red-500 flex-shrink-0" />
                    <span className="text-sm text-red-900">{activity}</span>
                  </div>
                ))}
              </TabsContent>

              <TabsContent value="alternatives" className="space-y-3">
                {adjustmentResult.alternative_activities?.map((alt, index) => (
                  <Card key={index}>
                    <CardContent className="pt-4">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <p className="font-semibold">{alt.name}</p>
                          <p className="text-sm text-muted-foreground flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {alt.location}
                          </p>
                          <p className="text-sm text-muted-foreground flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {alt.estimated_time}
                          </p>
                          <p className="text-sm mt-2">{alt.reason}</p>
                        </div>
                        <Badge variant="secondary" className="bg-green-100 text-green-800">
                          New
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </TabsContent>

              <TabsContent value="schedule" className="space-y-2">
                {adjustmentResult.updated_schedule?.map((activity, index) => (
                  <div 
                    key={index} 
                    className={`p-3 rounded-lg ${
                      activity.status === 'cancelled' 
                        ? 'bg-red-50 opacity-50' 
                        : 'bg-green-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{activity.time} - {activity.name}</p>
                        <p className="text-sm text-muted-foreground">{activity.location}</p>
                      </div>
                      {activity.status === 'cancelled' && (
                        <Badge variant="destructive">Cancelled</Badge>
                      )}
                    </div>
                  </div>
                ))}
              </TabsContent>
            </Tabs>

            {/* Cost Impact */}
            {adjustmentResult.estimated_cost_impact && (
              <div className="p-4 bg-yellow-50 rounded-lg">
                <p className="text-sm font-medium text-yellow-900">Cost Impact:</p>
                <p className="text-sm text-yellow-950">{adjustmentResult.estimated_cost_impact}</p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3 justify-end">
              <Button
                variant="outline"
                onClick={rejectAdjustments}
              >
                <X className="w-4 h-4 mr-2" />
                Keep Original
              </Button>
              <Button
                onClick={acceptAdjustments}
                className="bg-green-600 hover:bg-green-700"
              >
                <Check className="w-4 h-4 mr-2" />
                Accept Changes
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Upcoming Activities */}
      {!showResults && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Upcoming Activities</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {getUpcomingActivities().map((activity, index) => (
              <div key={index} className="p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{activity.time} - {activity.name}</p>
                    <p className="text-sm text-muted-foreground">{activity.location}</p>
                  </div>
                  <Badge variant="secondary">Upcoming</Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

"use client";

import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, Bot, User, GripHorizontal, Clock, MapPin } from 'lucide-react';
import { ChatMessage, ItineraryItem } from '@/types/itinerary';
import { useDraggable } from '@dnd-kit/core';
import { cn } from '@/lib/utils';

function DraggableItineraryItem({ item }: { item: ItineraryItem }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: JSON.stringify(item),
  });
  
  return (
    <div 
      ref={setNodeRef} 
      {...listeners} 
      {...attributes}
      className={cn(
        "p-3 mb-2 bg-secondary border rounded-md shadow-sm cursor-grab relative group",
        isDragging && "opacity-50"
      )}
    >
      <div className="absolute -left-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
        <GripHorizontal className="h-4 w-4 text-muted-foreground" />
      </div>
      
      <h4 className="font-medium">{item.title}</h4>
      {item.time && (
        <div className="flex items-center text-sm text-muted-foreground gap-1 mt-1">
          <Clock className="h-3 w-3" />
          <p>{item.time}</p>
        </div>
      )}
      {item.location && (
        <div className="flex items-center text-sm text-muted-foreground gap-1 mt-1">
          <MapPin className="h-3 w-3" />
          <p>{item.location}</p>
        </div>
      )}
      <p className="text-sm mt-2">{item.description}</p>
      
      <div className="mt-2 text-xs text-right">
        <span className="bg-primary/10 text-primary px-2 py-1 rounded-full">
          Drag to add to itinerary
        </span>
      </div>
    </div>
  );
}

export default function ChatInterface({ onSearch, searchArea, suggestedPlaces }: any) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'msg-1',
      role: 'assistant',
      content: 'Hello! I can help you plan your trip. Tell me where you want to travel and for how long.'
    }
  ]);
  const [input, setInput] = useState('');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [attractions, setAttractions] = useState<ItineraryItem[]>([]);
  const [destination, setDestination] = useState('');
  const [duration, setDuration] = useState('3 days');
  const [awaitingCircleSearchQuery, setAwaitingCircleSearchQuery] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  
  // Create a new session when the component mounts
  useEffect(() => {
    const createSession = async () => {
      try {
        const response = await fetch('http://localhost:5000/sessions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          setSessionId(data.session_id);
          console.log('Session created:', data.session_id);
        } else {
          console.error('Failed to create session');
        }
      } catch (error) {
        console.error('Error creating session:', error);
      }
    };
    
    createSession();
  }, []);
  
  // Effect to handle when a circle has been drawn
  useEffect(() => {
    if (searchArea && searchArea.center && searchArea.radius) {
      // Add assistant message asking what to search for
      const circleDrawnMessage: ChatMessage = {
        id: `msg-${Date.now()}-assistant-circle`,
        role: 'assistant',
        content: `I see you've drawn a circle on the map! What places would you like to search for within this area? (e.g., restaurants, hotels, attractions, etc.)`
      };
      
      setMessages(prev => [...prev, circleDrawnMessage]);
      setAwaitingCircleSearchQuery(true);
    }
  }, [searchArea]);

  // Effect to handle suggested places from a circle search
  useEffect(() => {
    if (suggestedPlaces && suggestedPlaces.length > 0 && searchArea && awaitingCircleSearchQuery) {
      // Convert places to itinerary items
      const items: ItineraryItem[] = suggestedPlaces.map((place: any, index: number) => ({
        id: `place-${index}-${Date.now()}`,
        title: place.name,
        description: place.description || '',
        location: place.address || place.location_query || '',
        type: 'attraction',
        coordinates: {
          longitude: place.longitude,
          latitude: place.latitude
        }
      }));

      // Add a message with the results
      const resultsMessage: ChatMessage = {
        id: `msg-${Date.now()}-assistant-results`,
        role: 'assistant',
        content: `I found ${suggestedPlaces.length} places within your selected area.`
      };
      
      setMessages(prev => [...prev, resultsMessage]);
      setAttractions(items);
      setAwaitingCircleSearchQuery(false);
      setIsLoading(false);
    }
  }, [suggestedPlaces, searchArea, awaitingCircleSearchQuery]);
  
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [messages]);

  // Function to add a message to the chat context
  const addToChatContext = async (message: string, source: 'user' | 'system', response?: string) => {
    if (!sessionId) return;
    
    try {
      await fetch(`http://localhost:5000/sessions/${sessionId}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message,
          source,
          response
        })
      });
    } catch (error) {
      console.error('Error adding to chat context:', error);
    }
  };

  // Function to extract destination from user input
  const extractDestination = (input: string): string => {
    const patterns = [
      /(?:plan|visit|travel to|go to|trip to|explore)\s+(?:the\s+)?([^.!?,]+)/i,
      /(?:in|about)\s+([^.!?,]+)/i,
      /([^.!?,]+)\s+(?:trip|itinerary|vacation|holiday)/i
    ];
    
    for (const pattern of patterns) {
      const match = input.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }
    
    return input.trim();
  };

  // Function to extract duration from user input or default to "3 days"
  const extractDuration = (input: string): string => {
    const durationPattern = /(?:for\s+)?(\d+\s+(?:day|days|week|weeks|month|months))/i;
    const match = input.match(durationPattern);
    
    return match ? match[1] : '3 days';
  };

  // Function to call the suggest-places endpoint
  const suggestPlaces = async (destination: string, duration: string) => {
    if (!sessionId) return;
    
    try {
      setIsLoading(true);
      
      const response = await fetch(`http://localhost:5000/sessions/${sessionId}/suggest-places`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          destination,
          duration
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('Places suggested:', data);
        
        // Add the assistant's response to messages
        const assistantMessage: ChatMessage = {
          id: `msg-${Date.now()}-assistant`,
          role: 'assistant',
          content: `I found some great places to visit in ${destination} for your ${duration} trip. Here are my suggestions:`
        };
        
        setMessages(prev => [...prev, assistantMessage]);
        
        // Convert attractions to draggable items
        const items: ItineraryItem[] = data.attractions_with_coordinates.map((attraction: any, index: number) => ({
          id: `place-${index}-${Date.now()}`,
          title: attraction.name,
          description: attraction.description || '',
          location: attraction.location_query,
          type: 'attraction',
          coordinates: parseCoordinates(attraction.coordinates)
        }));

        setAttractions(items);
        
        // Add the response to chat context
        await addToChatContext(
          `Suggested places for ${destination} for ${duration}`,
          'system',
          data.suggestions
        );
      } else {
        console.error('Error suggesting places:', await response.text());
        
        const errorMessage: ChatMessage = {
          id: `msg-${Date.now()}-assistant`,
          role: 'assistant',
          content: `I'm sorry, I couldn't find any suggestions for ${destination} right now. Could you try a different destination?`
        };
        
        setMessages(prev => [...prev, errorMessage]);
      }
    } catch (error) {
      console.error('Error suggesting places:', error);
      
      const errorMessage: ChatMessage = {
        id: `msg-${Date.now()}-assistant`,
        role: 'assistant',
        content: 'I encountered an error while processing your request. Please try again.'
      };
      
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  // Parse coordinates from the backend response
  const parseCoordinates = (coordsStr: string) => {
    try {
      // Try to parse as JSON object first
      const jsonMatch = coordsStr.match(/\{.*\}/);
      if (jsonMatch) {
        const coords = JSON.parse(jsonMatch[0]);
        if (coords.latitude && coords.longitude) {
          return {
            longitude: parseFloat(coords.longitude),
            latitude: parseFloat(coords.latitude)
          };
        }
      }

      // Try to parse as array [lat, lng]
      const arrayMatch = coordsStr.match(/\[([^[\]]+)\]/);
      if (arrayMatch && arrayMatch[1]) {
        const parts = arrayMatch[1].split(',').map(part => parseFloat(part.trim()));
        if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
          return {
            longitude: parts[1],
            latitude: parts[0]
          };
        }
      }

      // Fallback to returning undefined
      return undefined;
    } catch (e) {
      console.error('Error parsing coordinates:', e);
      return undefined;
    }
  };

  const handleSendMessage = async () => {
    if (!input.trim() || !sessionId) return;
    
    const userMessage: ChatMessage = {
      id: `msg-${Date.now()}-user`,
      role: 'user',
      content: input
    };
    
    setMessages(prev => [...prev, userMessage]);
    await addToChatContext(input, 'user');
    
    // If we're waiting for a circle search query, this input is for the circle search
    if (awaitingCircleSearchQuery && searchArea && searchArea.center && searchArea.radius) {
      const processingMessage: ChatMessage = {
        id: `msg-${Date.now()}-assistant`,
        role: 'assistant',
        content: `Searching for ${input} within the selected area...`
      };
      
      setMessages(prev => [...prev, processingMessage]);
      setIsLoading(true);
      
      // Call the onSearch function passed from the parent component
      if (onSearch) {
        onSearch(input, searchArea.center, searchArea.radius);
      }
    } else {
      // Regular destination search flow
      const extractedDestination = extractDestination(input);
      const extractedDuration = extractDuration(input);
      
      if (extractedDestination !== destination) {
        setDestination(extractedDestination);
      }
      
      if (extractedDuration !== duration) {
        setDuration(extractedDuration);
      }
      
      const loadingMessage: ChatMessage = {
        id: `msg-${Date.now()}-assistant`,
        role: 'assistant',
        content: `Searching for places in ${extractedDestination} for a ${extractedDuration} trip...`
      };
      
      setMessages(prev => [...prev, loadingMessage]);
      
      await suggestPlaces(extractedDestination, extractedDuration);
    }
    
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="flex flex-col h-full">
      <CardHeader className="pb-2">
        <CardTitle>Travel Assistant</CardTitle>
      </CardHeader>
      
      <CardContent className="flex-1 p-0">
        <ScrollArea className="h-[calc(100vh-320px)]" ref={scrollAreaRef}>
          <div className="p-4 space-y-4">
            {messages.map(message => (
              <div key={message.id} className={cn(
                "flex",
                message.role === 'assistant' ? "justify-start" : "justify-end"
              )}>
                <div className={cn(
                  "max-w-[80%] rounded-lg p-3",
                  message.role === 'assistant' 
                    ? "bg-secondary text-secondary-foreground" 
                    : "bg-primary text-primary-foreground"
                )}>
                  <div className="flex items-center space-x-2 mb-1">
                    {message.role === 'assistant' ? (
                      <Bot className="h-4 w-4" />
                    ) : (
                      <User className="h-4 w-4" />
                    )}
                    <span className="font-medium">
                      {message.role === 'assistant' ? 'Travel Assistant' : 'You'}
                    </span>
                  </div>
                  
                  <p>{message.content}</p>
                </div>
              </div>
            ))}
            
            {/* Display attractions as draggable items */}
            {attractions.length > 0 && (
              <div className="mt-4">
                <h3 className="font-medium mb-2">Suggested Places{destination ? ` in ${destination}` : ''}:</h3>
                <div className="space-y-2">
                  {attractions.map((item) => (
                    <DraggableItineraryItem key={item.id} item={item} />
                  ))}
                </div>
              </div>
            )}
            
            {isLoading && (
              <div className="flex justify-center py-4">
                <div className="animate-pulse text-muted-foreground">Searching for places...</div>
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
      
      <CardFooter className="pt-0">
        <div className="flex w-full items-center space-x-2">
          <Input
            placeholder={awaitingCircleSearchQuery 
              ? "What places are you looking for in this area?" 
              : "Tell me where you want to travel..."}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1"
            disabled={isLoading || !sessionId}
          />
          <Button onClick={handleSendMessage} disabled={!input.trim() || isLoading || !sessionId}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </CardFooter>
    </div>
  );
}
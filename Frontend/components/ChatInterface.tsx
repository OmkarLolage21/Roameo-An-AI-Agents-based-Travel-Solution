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

function AttractionCard({ attraction }: { attraction: any }) {
  // Function to safely display coordinates
  const formatCoordinates = (coords: any) => {
    if (Array.isArray(coords)) {
      return coords.join(', ');
    } else if (typeof coords === 'string') {
      return coords;
    } else if (coords && typeof coords === 'object') {
      // If it's an object with lat/lng or latitude/longitude
      const lat = coords.lat || coords.latitude;
      const lng = coords.lng || coords.longitude;
      if (lat !== undefined && lng !== undefined) {
        return `${lat}, ${lng}`;
      }
    }
    return 'Coordinates not available';
  };

  return (
    <Card className="mb-3">
      <CardContent className="p-3">
        <h4 className="font-medium text-primary">{attraction.name}</h4>
        {attraction.location_query && (
          <div className="flex items-center text-sm text-muted-foreground gap-1 mt-1">
            <MapPin className="h-3 w-3" />
            <p>{attraction.location_query}</p>
          </div>
        )}
        {attraction.description && (
          <p className="text-sm mt-2">{attraction.description}</p>
        )}
        {attraction.coordinates && (
          <div className="mt-2 text-xs bg-secondary p-2 rounded">
            <span className="font-medium">Coordinates:</span> {formatCoordinates(attraction.coordinates)}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function ChatInterface({ onSearch, searchArea, suggestedPlaces }: any) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'msg-1',
      role: 'assistant',
      content: 'Hello! I can help you plan your trip to India. Tell me where you want to travel and for how long.'
    }
  ]);
  const [input, setInput] = useState('');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [attractions, setAttractions] = useState<any[]>([]);
  const [destination, setDestination] = useState('');
  const [duration, setDuration] = useState('3 days'); // Default duration
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
    // Try to extract destination from patterns like "I want to visit [destination]" or "Plan a trip to [destination]"
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
    
    // Default to the input itself if no pattern matches
    return input.trim();
  };

  // Function to extract duration from user input or default to "3 days"
  const extractDuration = (input: string): string => {
    const durationPattern = /(?:for\s+)?(\d+\s+(?:day|days|week|weeks|month|months))/i;
    const match = input.match(durationPattern);
    
    return match ? match[1] : '3 days';
  };

  // Parse coordinates from the backend response
  const parseCoordinates = (coordsStr: string) => {
    // Try to handle coordinates in the format [lat, lng] or similar
    try {
      // The response might be in the format "**Coordinates**: [lat, lng]"
      const matched = coordsStr.match(/\[([^[\]]+)\]/);
      if (matched && matched[1]) {
        const parts = matched[1].split(',').map(part => parseFloat(part.trim()));
        if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
          return parts;
        }
      }
      
      // Fallback to returning the string
      return coordsStr;
    } catch (e) {
      console.error('Error parsing coordinates:', e);
      return coordsStr;
    }
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
        
        // Update attractions state with the data
        if (data.attractions_with_coordinates && data.attractions_with_coordinates.length > 0) {
          // Process attractions to ensure coordinates are properly formatted
          const processedAttractions = data.attractions_with_coordinates.map((attraction: any) => ({
            ...attraction,
            coordinates: parseCoordinates(attraction.coordinates)
          }));
          
          setAttractions(processedAttractions);
          
          // Extract descriptions from the suggestions text if they don't exist in the attractions
          const descriptionPattern = new RegExp(`\\*\\*${destination}\\*\\*([^*]+)`, 'gi');
          let matches;
          const descriptions: Record<string, string> = {};
          
          while ((matches = descriptionPattern.exec(data.suggestions)) !== null) {
            const locationName = matches[1].trim();
            const nextSection = data.suggestions.indexOf('**', matches.index + matches[0].length);
            if (nextSection !== -1) {
              const description = data.suggestions.substring(
                matches.index + matches[0].length,
                nextSection
              ).trim();
              descriptions[locationName] = description;
            }
          }
          
          // Add descriptions to attractions
          const attractionsWithDescriptions = processedAttractions.map((attraction: any) => {
            if (!attraction.description && descriptions[attraction.name]) {
              return {
                ...attraction,
                description: descriptions[attraction.name]
              };
            }
            return attraction;
          });
          
          setAttractions(attractionsWithDescriptions);
        }
        
        // Add the response to chat context
        await addToChatContext(
          `Suggested places for ${destination} for ${duration}`,
          'system',
          data.suggestions
        );
      } else {
        console.error('Error suggesting places:', await response.text());
        
        // Add error message
        const errorMessage: ChatMessage = {
          id: `msg-${Date.now()}-assistant`,
          role: 'assistant',
          content: `I'm sorry, I couldn't find any suggestions for ${destination} right now. Could you try a different destination?`
        };
        
        setMessages(prev => [...prev, errorMessage]);
      }
    } catch (error) {
      console.error('Error suggesting places:', error);
      
      // Add error message
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

  const handleSendMessage = async () => {
    if (!input.trim() || !sessionId) return;
    
    const userMessage: ChatMessage = {
      id: `msg-${Date.now()}-user`,
      role: 'user',
      content: input
    };
    
    setMessages(prev => [...prev, userMessage]);
    
    await addToChatContext(input, 'user');
    
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
                  
                  {message.items && message.items.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {message.items.map(item => (
                        <DraggableItineraryItem key={item.id} item={item} />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
            
            {/* Display attractions as cards after messages */}
            {attractions.length > 0 && (
              <div className="mt-4">
                <h3 className="font-medium mb-2">Suggested Places in {destination}:</h3>
                <div className="space-y-2">
                  {attractions.map((attraction, index) => (
                    <AttractionCard key={`${attraction.name}-${index}`} attraction={attraction} />
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
            placeholder="Tell me where you want to travel..."
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
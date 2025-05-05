export interface ItineraryItem {
  id: string;
  title: string;
  description: string;
  time?: string;
  location?: string;
  type: 'attraction' | 'restaurant' | 'hotel' | 'transport' | 'activity' | 'other';
  coordinates?: {
    longitude: number;
    latitude: number;
  };
}
export interface ItineraryDay {
  id: string;
  title: string;
  items: ItineraryItem[];
}

export interface Itinerary {
  id: string;
  title: string;
  days: ItineraryDay[];
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  items?: ItineraryItem[];
}

// Make sure this file exists with these type definitions

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}



export interface ItineraryDay {
  id: string;
  title: string;
  items: ItineraryItem[];
}

export interface Itinerary {
  id: string;
  title: string;
  days: ItineraryDay[];
}
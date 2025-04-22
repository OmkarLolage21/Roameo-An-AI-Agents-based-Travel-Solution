import { useState, ChangeEvent, FormEvent } from 'react';
import axios from 'axios';

interface SearchParams {
  travel_type: 'flight' | 'train' | 'bus' | 'hotel';
  origin: string;
  destination: string;
  date: string;
  return_date?: string;
  num_travelers: number;
  max_price?: number;
  min_rating?: number;
  prefer_direct: boolean;
  limit: number;
  format: 'json' | 'markdown';
}

interface TravelResult {
  provider: string;
  price: number;
  currency: string;
  rating?: number;
  departure_time: string;
  arrival_time: string;
  duration: string;
  location?: string;
  amenities?: string[];
  availability: string;
  url?: string;
}

export default function TravelSearch() {
  const [searchParams, setSearchParams] = useState<SearchParams>({
    travel_type: 'flight',
    origin: '',
    destination: '',
    date: '',
    return_date: '',
    num_travelers: 1,
    max_price: undefined,
    min_rating: undefined,
    prefer_direct: false,
    limit: 10,
    format: 'json'
  });

  const [results, setResults] = useState<TravelResult[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setSearchParams(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setResults([]);

    try {
      const response = await axios.post(
        'https://api.groq.com/openai/v1/chat/completions',
        {
          model: 'llama-3.3-70b-versatile',
          messages: [
            {
              role: 'user',
              content: `Find flight options from ${searchParams.origin} to ${searchParams.destination} on ${searchParams.date} for ${searchParams.num_travelers} traveler(s).
              Please provide the results in this exact format for each flight:
              
              1. **Airline Name**: ₹Price
              * **Departure Time**: HH:MM AM/PM
              * **Arrival Time**: HH:MM AM/PM
              * **Duration**: Xh Ym
              * **Rating**: X.X (if available)
              * **Flight Number**: XYZ123 (if available)
              
              ${searchParams.prefer_direct ? 'Show only direct flights.' : ''}
              ${searchParams.max_price ? `Maximum price: ₹${searchParams.max_price}.` : ''}
              ${searchParams.min_rating ? `Minimum rating: ${searchParams.min_rating}.` : ''}
              List at least ${searchParams.limit} options.`
            }
          ],
          temperature: 0.7
        },
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${process.env.NEXT_PUBLIC_GROQ_API_KEY}`
          }
        }
      );
      
      const content = response.data.choices[0]?.message?.content;
      const parsedResults = parseFlightsFromText(content);
      
      if (parsedResults.length > 0) {
        setResults(parsedResults);
      } else {
        setError('No flight options found matching your criteria.');
      }

    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.error?.message || 'Failed to fetch travel options. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const parseFlightsFromText = (text: string): TravelResult[] => {
    const flightBlocks = text.split(/\n\s*\n/); // Split by empty lines
    const results: TravelResult[] = [];

    flightBlocks.forEach(block => {
      const lines = block.split('\n').filter(line => line.trim());
      if (lines.length === 0) return;

      const flight: Partial<TravelResult> = {
        currency: 'INR',
        availability: 'Available',
        departure_time: 'N/A',
        arrival_time: 'N/A',
        duration: 'N/A'
      };

      // First line should be the airline and price
      const firstLineMatch = lines[0].match(/^\d+\.\s+\*\*(.+?)\*\*:\s+₹?([\d,]+)/);
      if (firstLineMatch) {
        flight.provider = firstLineMatch[1].trim();
        flight.price = parseInt(firstLineMatch[2].replace(/,/g, ''), 10);
      } else {
        return; // Skip if the first line doesn't match expected format
      }

      // Process additional details
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        
        const departureMatch = line.match(/\*\*Departure Time\*\*:\s*(.+)/i);
        if (departureMatch) flight.departure_time = departureMatch[1].trim();
        
        const arrivalMatch = line.match(/\*\*Arrival Time\*\*:\s*(.+)/i);
        if (arrivalMatch) flight.arrival_time = arrivalMatch[1].trim();
        
        const durationMatch = line.match(/\*\*Duration\*\*:\s*(.+)/i);
        if (durationMatch) flight.duration = durationMatch[1].trim();
        
        const ratingMatch = line.match(/\*\*Rating\*\*:\s*([\d.]+)/i);
        if (ratingMatch) flight.rating = parseFloat(ratingMatch[1]);
      }

      if (flight.provider && flight.price) {
        results.push({
          provider: flight.provider,
          price: flight.price,
          currency: flight.currency || 'INR',
          departure_time: flight.departure_time || 'N/A',
          arrival_time: flight.arrival_time || 'N/A',
          duration: flight.duration || 'N/A',
          rating: flight.rating,
          availability: flight.availability || 'Available'
        });
      }
    });

    return results;
  };

  return (
    <div className="max-w-4xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Travel Search</h1>
      <form onSubmit={handleSubmit} className="mb-8 bg-gray-50 p-6 rounded-lg shadow">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block mb-1">Travel Type</label>
            <select 
              name="travel_type" 
              value={searchParams.travel_type} 
              onChange={handleChange} 
              className="w-full p-2 border rounded"
            >
              <option value="flight">Flight</option>
              <option value="train">Train</option>
              <option value="bus">Bus</option>
              <option value="hotel">Hotel</option>
            </select>
          </div>
          <div>
            <label className="block mb-1">Origin</label>
            <input 
              type="text" 
              name="origin" 
              value={searchParams.origin} 
              onChange={handleChange} 
              className="w-full p-2 border rounded" 
              placeholder="City or airport" 
              required 
            />
          </div>
          <div>
            <label className="block mb-1">Destination</label>
            <input 
              type="text" 
              name="destination" 
              value={searchParams.destination} 
              onChange={handleChange} 
              className="w-full p-2 border rounded" 
              placeholder="City or airport" 
              required 
            />
          </div>
          <div>
            <label className="block mb-1">Departure Date</label>
            <input 
              type="date" 
              name="date" 
              value={searchParams.date} 
              onChange={handleChange} 
              className="w-full p-2 border rounded" 
              required 
            />
          </div>
          <div>
            <label className="block mb-1">Return Date (Optional)</label>
            <input 
              type="date" 
              name="return_date" 
              value={searchParams.return_date || ''} 
              onChange={handleChange} 
              className="w-full p-2 border rounded" 
            />
          </div>
          <div>
            <label className="block mb-1">Travelers</label>
            <input 
              type="number" 
              name="num_travelers" 
              min="1" 
              value={searchParams.num_travelers} 
              onChange={handleChange} 
              className="w-full p-2 border rounded" 
              required 
            />
          </div>
          <div>
            <label className="block mb-1">Max Price (₹)</label>
            <input 
              type="number" 
              name="max_price" 
              min="0" 
              value={searchParams.max_price || ''} 
              onChange={handleChange} 
              className="w-full p-2 border rounded" 
              placeholder="Optional" 
            />
          </div>
          <div>
            <label className="block mb-1">Minimum Rating</label>
            <input 
              type="number" 
              name="min_rating" 
              min="0" 
              max="5" 
              step="0.1" 
              value={searchParams.min_rating || ''} 
              onChange={handleChange} 
              className="w-full p-2 border rounded" 
              placeholder="Optional (0-5)" 
            />
          </div>
        </div>
        <div className="mt-4 flex items-center">
          <input 
            type="checkbox" 
            id="prefer_direct" 
            name="prefer_direct" 
            checked={searchParams.prefer_direct} 
            onChange={handleChange} 
            className="mr-2" 
          />
          <label htmlFor="prefer_direct">Prefer direct flights only</label>
        </div>
        <button 
          type="submit" 
          className="mt-6 bg-blue-600 text-white py-2 px-6 rounded hover:bg-blue-700 disabled:bg-blue-300 transition-colors" 
          disabled={loading}
        >
          {loading ? (
            <span className="flex items-center justify-center">
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Searching...
            </span>
          ) : 'Search Flights'}
        </button>
      </form>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {results.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Flight Options</h2>
          <div className="grid gap-4">
            {results.map((result, index) => (
              <div key={index} className="bg-white p-4 rounded-lg shadow border hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-lg font-semibold">{result.provider}</h3>
                    <div className="mt-2 text-sm text-gray-600">
                      <p><span className="font-medium">Departure:</span> {result.departure_time}</p>
                      <p><span className="font-medium">Arrival:</span> {result.arrival_time}</p>
                      <p><span className="font-medium">Duration:</span> {result.duration}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-blue-600">₹{result.price.toLocaleString()}</p>
                    <p className="text-sm text-gray-500">{result.availability}</p>
                    {result.rating && (
                      <div className="mt-1">
                        <span className="text-yellow-500">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <span key={i}>{i < Math.floor(result.rating!) ? '★' : '☆'}</span>
                          ))}
                        </span>
                        <span className="ml-1 text-sm text-gray-600">({result.rating})</span>
                      </div>
                    )}
                  </div>
                </div>
                <button className="mt-4 w-full bg-green-600 text-white py-2 rounded hover:bg-green-700 transition-colors">
                  Book Now
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
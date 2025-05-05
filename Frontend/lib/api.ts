// Create or update this file if it doesn't exist

// Function to search for places within a radius
export const searchPlaces = async (
    query: string, 
    center: [number, number], 
    radius: number
  ) => {
    try {
      const response = await fetch('http://localhost:5000/circle_places_search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          query,
          center,
          radius,
          limit: 10
        })
      });
  
      if (!response.ok) {
        throw new Error(`Search failed: ${response.status}`);
      }
  
      const data = await response.json();
      return data.places || [];
    } catch (error) {
      console.error('Error in searchPlaces:', error);
      throw error;
    }
  };
  
  // Add any additional API functions here
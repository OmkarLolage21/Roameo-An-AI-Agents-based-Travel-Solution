import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    // Extract data from request
    const data = await req.json();
    
    // Get cookies for authentication
    const cookieHeader = req.headers.get('cookie') || '';
    
    // Forward the request to Python backend
    const response = await fetch(`${process.env.PYTHON_API_URL}/save_itinerary`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookieHeader // Forward the cookies for session authentication
      },
      body: JSON.stringify(data),
    });
    
    // Get response from Python backend
    const responseData = await response.json();
    
    return NextResponse.json(responseData);
  } catch (error) {
    console.error('Error saving itinerary:', error);
    return NextResponse.json(
      { error: 'Failed to save itinerary', details: (error instanceof Error ? error.message : 'Unknown error') },
      { status: 500 }
    );
  }
}
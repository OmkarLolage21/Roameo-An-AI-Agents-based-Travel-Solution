import { NextResponse } from "next/server";
import axios, { AxiosError, AxiosResponse } from "axios";

const PYTHON_API_URL: string = "http://localhost:8000";

interface SearchRequest {
  travel_type: "flight" | "train" | "bus" | "hotel";
  origin: string;
  destination: string;
  date: string;
  return_date?: string;
  num_travelers?: number;
  max_price?: number;
  min_rating?: number;
  prefer_direct?: boolean;
  preferred_providers?: string[];
  amenities?: string[];
  limit?: number;
  use_cache?: boolean;
}

interface SearchResponse {
  provider: string;
  price: number;
  currency: string;
  rating?: number;
  total_reviews?: number;
  availability?: number;
  departure_time?: string;
  arrival_time?: string;
  duration?: string;
  url: string;
  amenities?: string[];
  location?: string;
}

interface ErrorResponse {
  error: string;
}

export async function POST(request: Request) {
  try {
    const body: SearchRequest = await request.json();

    console.log("Sending request to Python backend:", body);

    const pythonResponse: AxiosResponse<SearchResponse[]> = await axios.post(
      `${PYTHON_API_URL}/search`,
      body,
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    console.log("Received response from Python backend:", pythonResponse.data);

    return NextResponse.json(pythonResponse.data, { status: 200 });
  } catch (error: unknown) {
    const axiosError = error as AxiosError<ErrorResponse>;

    console.error(
      "Error calling Python backend:",
      axiosError.response?.data?.error || axiosError.message
    );

    return NextResponse.json(
      {
        error:
          axiosError.response?.data?.error || "Failed to fetch travel options",
      },
      { status: axiosError.response?.status || 500 }
    );
  }
}

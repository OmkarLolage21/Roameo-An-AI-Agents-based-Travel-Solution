"use client"

import { Card } from "@/components/ui/card"

const SAMPLE_IMAGES = [
  "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=800&h=400&fit=crop",
  "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=800&h=400&fit=crop",
  "https://images.unsplash.com/photo-1506929562872-bb421503ef21?w=800&h=400&fit=crop",
  "https://images.unsplash.com/photo-1454391304352-2bf4678b1a7a?w=800&h=400&fit=crop",
  "https://images.unsplash.com/photo-1515859005217-8a1f08870f59?w=800&h=400&fit=crop",
  "https://images.unsplash.com/photo-1516483638261-f4dbaf036963?w=800&h=400&fit=crop",
]

export default function TripGallery() {
  return (
    <div className="grid grid-cols-6 gap-4">
      {SAMPLE_IMAGES.map((image, index) => (
        <Card key={index} className="aspect-square overflow-hidden">
          <img
            src={image}
            alt={`Trip ${index + 1}`}
            className="w-full h-full object-cover transition-transform hover:scale-105"
          />
        </Card>
      ))}
    </div>
  )
}
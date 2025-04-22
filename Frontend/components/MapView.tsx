"use client";

import { useEffect, useState, useCallback } from 'react';
import Map, { Marker, Popup, NavigationControl, Source, Layer, LayerProps } from 'react-map-gl';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MapPin, Circle, Crosshair } from 'lucide-react';
import { Itinerary, ItineraryItem } from '@/types/itinerary';
import * as turf from '@turf/turf';
import 'mapbox-gl/dist/mapbox-gl.css';

interface MapViewProps {
  itineraries: Itinerary[];
  activeItinerary: string | null;
  activeDay: string | null;
  onCircleDrawn?: (center: [number, number], radius: number) => void;
  suggestedPlaces?: Array<{
    name: string;
    coordinates: [number, number];
    description?: string;
  }>;
}

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

export default function MapView({ 
  itineraries, 
  activeItinerary, 
  activeDay, 
  onCircleDrawn,
  suggestedPlaces 
}: MapViewProps) {
  const [selectedLocation, setSelectedLocation] = useState<ItineraryItem | null>(null);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [isDrawingCircle, setIsDrawingCircle] = useState(false);
  const [circleCenter, setCircleCenter] = useState<[number, number] | null>(null);
  const [currentMousePos, setCurrentMousePos] = useState<[number, number] | null>(null);
  const [circleRadius, setCircleRadius] = useState<number>(0);
  const [viewState, setViewState] = useState({
    longitude: 78.9629,
    latitude: 20.5937,
    zoom: 4,
    bearing: 0,
    pitch: 0
  });

  const activeItems = activeItinerary
    ? itineraries
        .find(i => i.id === activeItinerary)
        ?.days.filter(day => !activeDay || day.id === activeDay)
        .flatMap(day => day.items)
        .filter(item => item.coordinates) || []
    : [];

  const getUserLocation = useCallback(() => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { longitude, latitude } = position.coords;
          setUserLocation([longitude, latitude]);
          setViewState(prev => ({
            ...prev,
            longitude,
            latitude,
            zoom: 13
          }));
        },
        (error) => {
          console.error('Error getting location:', error);
        }
      );
    }
  }, []);

  const calculateDistance = (point1: [number, number], point2: [number, number]): number => {
    const from = turf.point(point1);
    const to = turf.point(point2);
    return turf.distance(from, to);
  };

  const handleMapClick = useCallback((event: any) => {
    event.preventDefault();
    const [longitude, latitude] = event.lngLat.toArray();

    if (isDrawingCircle && !circleCenter) {
      setCircleCenter([longitude, latitude]);
      setCurrentMousePos([longitude, latitude]);
    } else if (isDrawingCircle && circleCenter) {
      const finalRadius = calculateDistance(circleCenter, [longitude, latitude]);
      if (onCircleDrawn) {
        onCircleDrawn(circleCenter, finalRadius);
      }
      setIsDrawingCircle(false);
      setCurrentMousePos(null);
    }
  }, [isDrawingCircle, circleCenter, onCircleDrawn]);

  const handleMouseMove = useCallback((event: any) => {
    if (isDrawingCircle && circleCenter) {
      const [longitude, latitude] = event.lngLat.toArray();
      setCurrentMousePos([longitude, latitude]);
      const radius = calculateDistance(circleCenter, [longitude, latitude]);
      setCircleRadius(radius);
    }
  }, [isDrawingCircle, circleCenter]);

  const startDrawingCircle = () => {
    setIsDrawingCircle(true);
    setCircleCenter(null);
    setCurrentMousePos(null);
    setCircleRadius(0);
  };

  const cancelDrawingCircle = () => {
    setIsDrawingCircle(false);
    setCircleCenter(null);
    setCurrentMousePos(null);
    setCircleRadius(0);
  };

  const circleLayer: LayerProps = {
    id: 'circle-fill',
    type: 'fill',
    paint: {
      'fill-color': '#4299e1',
      'fill-opacity': 0.2
    }
  };

  const circleOutlineLayer: LayerProps = {
    id: 'circle-outline',
    type: 'line',
    paint: {
      'line-color': '#4299e1',
      'line-width': 2
    }
  };

  const circleGeoJSON = circleCenter && (currentMousePos || circleRadius > 0)
    ? turf.circle(turf.point(circleCenter), circleRadius)
    : null;

  return (
    <Card className="h-[calc(100vh-220px)] overflow-hidden">
      <div className="absolute top-4 left-4 z-10 flex gap-2">
        <Button
          variant="secondary"
          size="sm"
          onClick={getUserLocation}
        >
          <Crosshair className="h-4 w-4 mr-2" />
          My Location
        </Button>
        
        {!isDrawingCircle ? (
          <Button
            variant="secondary"
            size="sm"
            onClick={startDrawingCircle}
          >
            <Circle className="h-4 w-4 mr-2" />
            Circle It
          </Button>
        ) : (
          <Button
            variant="destructive"
            size="sm"
            onClick={cancelDrawingCircle}
          >
            Cancel Drawing
          </Button>
        )}
      </div>

      {isDrawingCircle && (
        <div className="absolute top-20 left-4 z-10 bg-white/90 p-3 rounded-lg shadow-lg">
          <p className="text-sm font-medium text-gray-700">
            {!circleCenter 
              ? "Click to set circle center" 
              : "Click again to set radius"}
          </p>
          {circleRadius > 0 && (
            <p className="text-sm text-muted-foreground mt-1">
              Radius: {circleRadius.toFixed(2)} km
            </p>
          )}
        </div>
      )}

      <Map
        {...viewState}
        onMove={evt => !isDrawingCircle && setViewState(evt.viewState)}
        onClick={handleMapClick}
        onMouseMove={handleMouseMove}
        style={{ width: '100%', height: '100%' }}
        mapStyle="mapbox://styles/mapbox/streets-v12"
        mapboxAccessToken={MAPBOX_TOKEN}
        dragRotate={false}
        dragPan={!isDrawingCircle}
        scrollZoom={!isDrawingCircle}
        doubleClickZoom={!isDrawingCircle}
        minZoom={1}
        maxZoom={20}
        cursor={isDrawingCircle ? 'crosshair' : 'grab'}
      >
        <NavigationControl position="top-right" />
        
        {userLocation && (
          <Marker
            longitude={userLocation[0]}
            latitude={userLocation[1]}
            anchor="center"
          >
            <div className="w-4 h-4 bg-blue-500 rounded-full border-2 border-white shadow-lg pulse-animation" />
          </Marker>
        )}

        {circleGeoJSON && (
          <Source type="geojson" data={circleGeoJSON}>
            <Layer {...circleLayer} />
            <Layer {...circleOutlineLayer} />
          </Source>
        )}
        
        {activeItems.map((item, index) => (
          item.coordinates && (
            <Marker
              key={`${item.id}-${index}`}
              longitude={item.coordinates.longitude}
              latitude={item.coordinates.latitude}
              anchor="bottom"
              onClick={e => {
                e.originalEvent.stopPropagation();
                setSelectedLocation(item);
              }}
            >
              <div className="relative cursor-pointer transform transition-transform hover:scale-110">
                <MapPin className="h-8 w-8 text-red-600 stroke-2" />
                <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-red-600 rounded-full" />
              </div>
            </Marker>
          )
        ))}

        {suggestedPlaces?.map((place, index) => (
          <Marker
            key={`suggested-${index}`}
            longitude={place.coordinates[0]}
            latitude={place.coordinates[1]}
            anchor="bottom"
          >
            <div className="relative cursor-pointer transform transition-transform hover:scale-110">
              <MapPin className="h-8 w-8 text-blue-600 stroke-2" />
              <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-blue-600 rounded-full" />
            </div>
          </Marker>
        ))}
        
        {selectedLocation && selectedLocation.coordinates && (
          <Popup
            longitude={selectedLocation.coordinates.longitude}
            latitude={selectedLocation.coordinates.latitude}
            anchor="bottom"
            onClose={() => setSelectedLocation(null)}
            closeButton={true}
            closeOnClick={false}
            offset={[0, -15]}
          >
            <div className="p-2 min-w-[200px]">
              <h3 className="font-medium text-base">{selectedLocation.title}</h3>
              {selectedLocation.time && (
                <p className="text-sm text-muted-foreground mt-1">{selectedLocation.time}</p>
              )}
              {selectedLocation.location && (
                <p className="text-sm text-muted-foreground">{selectedLocation.location}</p>
              )}
              <p className="text-sm mt-2">{selectedLocation.description}</p>
            </div>
          </Popup>
        )}
      </Map>
    </Card>
  );
}
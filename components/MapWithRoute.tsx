import { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, useMap, Popup, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import axios from 'axios';

const DEFAULT_POSITION = [28.6139, 77.2090];

const GoogleSatLayer = () => {
  const map = useMap();
  useEffect(() => {
    const googleSat = L.tileLayer('http://{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}', {
      maxZoom: 20,
      subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
    });
    googleSat.addTo(map);
    return () => {
      map.removeLayer(googleSat);
    };
  }, [map]); return null;
};

// Component to handle map click events
const MapClickHandler = ({ onMapClick, allowSelectDestination }) => {
  useMapEvents({
    click: (e) => {
      if (allowSelectDestination && onMapClick) {
        onMapClick(e);
      }
    },
  });
  return null;
};

var greenIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

export default function MapWithRoute({
  userLocation,
  setUserLocation,
  destination,
  setDestination,
  routeCoords,
  setRouteCoords,
  allowSelectDestination = true,
  customHeight = '350px',
}) {
  const mapRef = useRef(null);

  useEffect(() => {
    if (!userLocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserLocation([pos.coords.latitude, pos.coords.longitude]);
        },
        () => {
          setUserLocation(DEFAULT_POSITION);
        }
      );
    }
  }, [userLocation, setUserLocation]);

  const getRoute = async (destCoords) => {
    try {
      const response = await axios.post(
        `https://api.openrouteservice.org/v2/directions/driving-car/geojson`,
        {
          coordinates: [
            [userLocation[1], userLocation[0]],
            [destCoords[1], destCoords[0]],
          ],
        },
        {
          headers: {
            Authorization: process.env.NEXT_PUBLIC_OPENROUTESERVICE_API_KEY,
            'Content-Type': 'application/json',
          },
        }
      );
      const coords = response.data.features[0].geometry.coordinates.map(
        ([lng, lat]) => [lat, lng]
      );
      setRouteCoords(coords);
    } catch (err) {
      console.error('Error fetching route:', err);
    }
  };

  const handleMapClick = (e) => {
    if (!allowSelectDestination) return;
    const destCoords = [e.latlng.lat, e.latlng.lng];
    setDestination(destCoords);
    getRoute(destCoords);
  }; return (
    <div style={{ height: customHeight, width: '100%' }}>
      {userLocation && (
        <MapContainer
          center={userLocation}
          zoom={13}
          scrollWheelZoom={true}
          style={{ height: '100%', width: '100%' }}
        >
          <GoogleSatLayer />
          <MapClickHandler onMapClick={handleMapClick} allowSelectDestination={allowSelectDestination} />
          <Marker position={userLocation} icon={greenIcon}>
            <Popup>
              <span style={{ color: '#222', background: '#fff', padding: 2 }}>Your Location</span>
            </Popup>
          </Marker>
          {destination && (
            <Marker position={destination} icon={greenIcon}>
              <Popup>
                <span style={{ color: '#222', background: '#fff', padding: 2 }}>Destination</span>
              </Popup>
            </Marker>
          )}
          {routeCoords.length > 0 && (
            <Polyline positions={routeCoords} color="blue" />
          )}
        </MapContainer>
      )}
    </div>
  );
}

import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Polygon, Marker, Popup, useMapEvents, LayersControl, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { generateHexagonCoordinates } from '../utils/hexagonUtils';

// Fix des icônes Leaflet (bug commun)
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
import iconRetina from 'leaflet/dist/images/marker-icon-2x.png';

let DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconRetinaUrl: iconRetina,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  tooltipAnchor: [16, -28],
  shadowSize: [41, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

// Composant pour gérer les clics sur la carte
const MapClickHandler = ({ onCoordinateChange }) => {
  useMapEvents({
    click: (e) => {
      onCoordinateChange({
        lat: e.latlng.lat,
        lon: e.latlng.lng
      });
    }
  });
  return null;
};

// Composant pour ajuster automatiquement le zoom
const MapBoundsAdjuster = ({ hexagonCoords }) => {
  const map = useMap();
  
  useEffect(() => {
    if (hexagonCoords.length > 0) {
      const bounds = L.latLngBounds(hexagonCoords);
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [hexagonCoords, map]);
  
  return null;
};

// Icône de pulsation pour le marqueur central
const createPulseIcon = () => {
  return L.divIcon({
    className: 'pulse-marker',
    html: `
      <div style="
        width: 20px;
        height: 20px;
        background: #3b82f6;
        border: 3px solid white;
        border-radius: 50%;
        box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.7);
        animation: pulse 2s infinite;
      "></div>
    `,
    iconSize: [20, 20],
    iconAnchor: [10, 10]
  });
};

// Fonction pour obtenir la couleur selon l'élévation
const getElevationColor = (elevation) => {
  if (!elevation || elevation === 0) return '#3b82f6';
  
  const colors = [
    { threshold: 0, color: '#10b981' },    // Vert (bas)
    { threshold: 50, color: '#fbbf24' },    // Jaune
    { threshold: 100, color: '#f59e0b' },   // Orange
    { threshold: 200, color: '#ef4444' }     // Rouge (haut)
  ];
  
  for (let i = colors.length - 1; i >= 0; i--) {
    if (elevation >= colors[i].threshold) {
      return colors[i].color;
    }
  }
  return colors[0].color;
};

const InteractiveMap = ({ coordinates, radius, onCoordinateChange, results }) => {
  const [hexagonCoords, setHexagonCoords] = useState([]);
  const [mapInstance, setMapInstance] = useState(null);
  
  // Calcul des coordonnées de l'hexagone
  useEffect(() => {
    const coords = generateHexagonCoordinates(
      coordinates.lat,
      coordinates.lon,
      radius
    );
    setHexagonCoords(coords);
  }, [coordinates, radius]);
  
  // Style de l'hexagone avec couleur dynamique selon l'élévation
  const elevationColor = results?.elevation_mean ? getElevationColor(results.elevation_mean) : '#3b82f6';
  
  const hexagonStyle = {
    color: elevationColor,
    weight: 3,
    fillColor: elevationColor,
    fillOpacity: 0.15
  };
  
  // Style au survol
  const hexagonHoverStyle = {
    fillOpacity: 0.3,
    weight: 4
  };
  
  const formatNumber = (num) => {
    if (num === null || num === undefined) return 'N/A';
    return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 }).format(num);
  };
  
  return (
    <>
      <style>{`
        @keyframes pulse {
          0% {
            box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.7);
          }
          70% {
            box-shadow: 0 0 0 20px rgba(59, 130, 246, 0);
          }
          100% {
            box-shadow: 0 0 0 0 rgba(59, 130, 246, 0);
          }
        }
        .pulse-marker {
          background: transparent !important;
          border: none !important;
        }
        .leaflet-container {
          font-family: inherit;
        }
      `}</style>
      
      <MapContainer
        center={[coordinates.lat, coordinates.lon]}
        zoom={13}
        style={{ height: '600px', width: '100%', borderRadius: '12px', zIndex: 0 }}
        whenCreated={setMapInstance}
      >
        <LayersControl position="topright">
          {/* Fonds de carte */}
          <LayersControl.BaseLayer checked name="OpenStreetMap">
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
          </LayersControl.BaseLayer>
          
          <LayersControl.BaseLayer name="Satellite">
            <TileLayer
              attribution='&copy; <a href="https://www.esri.com/">Esri</a>'
              url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            />
          </LayersControl.BaseLayer>
          
          <LayersControl.BaseLayer name="Topographique">
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, &copy; <a href="https://opentopomap.org">OpenTopoMap</a>'
              url="https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png"
            />
          </LayersControl.BaseLayer>
          
          {/* Overlays */}
          <LayersControl.Overlay checked name="Hexagone d'analyse">
            {hexagonCoords.length > 0 && (
              <Polygon
                positions={hexagonCoords}
                pathOptions={hexagonStyle}
                eventHandlers={{
                  mouseover: (e) => {
                    e.target.setStyle(hexagonHoverStyle);
                  },
                  mouseout: (e) => {
                    e.target.setStyle(hexagonStyle);
                  },
                  dblclick: (e) => {
                    const map = e.target._map;
                    const bounds = L.latLngBounds(hexagonCoords);
                    map.fitBounds(bounds, { padding: [50, 50] });
                  }
                }}
              >
                <Popup>
                  <div className="p-2 text-gray-800">
                    <h3 className="font-bold mb-2 text-lg">Zone d'Analyse</h3>
                    <div className="space-y-1 text-sm">
                      <p><strong>Rayon:</strong> {radius} km</p>
                      <p><strong>Surface:</strong> {(2.598 * radius * radius).toFixed(2)} km²</p>
                      {results && (
                        <>
                          <hr className="my-2" />
                          <p><strong>Élévation moyenne:</strong> {formatNumber(results.elevation_mean)} m</p>
                          <p><strong>Élévation min:</strong> {formatNumber(results.elevation_min)} m</p>
                          <p><strong>Élévation max:</strong> {formatNumber(results.elevation_max)} m</p>
                          <p><strong>Eau:</strong> {formatNumber(results.water_percentage)}%</p>
                          <p><strong>Densité bâtie:</strong> {formatNumber((results.building_density * 100))}%</p>
                          <p><strong>Routes:</strong> {formatNumber(results.total_road_length_m / 1000)} km</p>
                          <p><strong>Usage dominant:</strong> {results.dominant_landuse || 'N/A'}</p>
                        </>
                      )}
                    </div>
                  </div>
                </Popup>
              </Polygon>
            )}
          </LayersControl.Overlay>
        </LayersControl>
        
        {/* Gestionnaire de clics */}
        <MapClickHandler onCoordinateChange={onCoordinateChange} />
        
        {/* Ajustement automatique du zoom */}
        <MapBoundsAdjuster hexagonCoords={hexagonCoords} />
        
        {/* Marqueur central avec pulsation */}
        <Marker 
          position={[coordinates.lat, coordinates.lon]}
          icon={createPulseIcon()}
        >
          <Popup>
            <div className="text-sm text-gray-800">
              <strong>Centre de l'hexagone</strong><br />
              Lat: {coordinates.lat.toFixed(6)}°<br />
              Lon: {coordinates.lon.toFixed(6)}°
            </div>
          </Popup>
        </Marker>
      </MapContainer>
    </>
  );
};

export default InteractiveMap;


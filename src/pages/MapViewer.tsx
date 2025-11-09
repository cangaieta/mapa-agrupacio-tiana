import { useState } from 'react';
import { MapContainer, TileLayer, Polygon, useMap } from 'react-leaflet';
import { DivIcon, LatLngExpression } from 'leaflet';
import { Marker } from 'react-leaflet';
import { X, ExternalLink, Mail, Phone, User } from 'lucide-react';
import { useAssociacions } from '../hooks/useAssociacions';
import type { Associacio } from '../types';
import 'leaflet/dist/leaflet.css';

// Component per centrar etiquetes al polígon
function PolygonLabel({ position, text }: { position: LatLngExpression, text: string }) {
  const icon = new DivIcon({
    className: 'polygon-label-wrapper',
    html: `<div class="polygon-label-content">${text}</div>`,
    iconSize: [100, 40],
    iconAnchor: [50, 20],
  });

  return <Marker position={position} icon={icon} />;
}

// Component per centrar el mapa
function CenterMap({ center }: { center: LatLngExpression }) {
  const map = useMap();
  map.setView(center, map.getZoom());
  return null;
}

export default function MapViewer() {
  const { associacions, loading } = useAssociacions();
  const [selectedAssociacio, setSelectedAssociacio] = useState<Associacio | null>(null);

  // Centre de Tiana
  const tianaCenter: LatLngExpression = [41.4917, 2.2647];

  // Calcular el centre d'un polígon (centroide real)
  const getPolygonCenter = (coords: [number, number][]): LatLngExpression => {
    // Algoritme del centroide per polígons
    let area = 0;
    let cx = 0;
    let cy = 0;

    for (let i = 0; i < coords.length; i++) {
      const j = (i + 1) % coords.length;
      const xi = coords[i][1]; // lng
      const yi = coords[i][0]; // lat
      const xj = coords[j][1]; // lng
      const yj = coords[j][0]; // lat
      const cross = xi * yj - xj * yi;
      area += cross;
      cx += (xi + xj) * cross;
      cy += (yi + yj) * cross;
    }

    area /= 2;
    const factor = 1 / (6 * area);
    cx *= factor;
    cy *= factor;

    return [cy, cx]; // [lat, lng]
  };

  if (loading) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-warm-50">
        <div className="text-warm-700 text-xl">Carregant mapa...</div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-screen">
      <MapContainer
        center={tianaCenter}
        zoom={15}
        className="w-full h-full"
        zoomControl={true}
      >
        <CenterMap center={tianaCenter} />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {associacions.map((assoc) => (
          <div key={assoc.id}>
            <Polygon
              positions={assoc.poligon as LatLngExpression[]}
              pathOptions={{
                color: assoc.color,
                fillColor: assoc.color,
                fillOpacity: 0.4,
                weight: 3,
              }}
              eventHandlers={{
                click: () => setSelectedAssociacio(assoc),
              }}
            />
            <PolygonLabel
              position={getPolygonCenter(assoc.poligon)}
              text={assoc.abreviacio}
            />
          </div>
        ))}
      </MapContainer>

      {/* Panel lateral/inferior amb informació */}
      {selectedAssociacio && (
        <>
          {/* Overlay per tancar el panel */}
          <div
            className="fixed inset-0 bg-black bg-opacity-30 z-[1000] md:hidden"
            onClick={() => setSelectedAssociacio(null)}
          />

          {/* Panel */}
          <div className="fixed bottom-0 left-0 right-0 md:top-0 md:right-0 md:bottom-auto md:left-auto md:w-96 bg-white shadow-2xl z-[1001] rounded-t-2xl md:rounded-none md:rounded-l-2xl overflow-hidden animate-slide-up">
            {/* Header */}
            <div
              className="p-4 text-white font-semibold text-lg flex justify-between items-center"
              style={{ backgroundColor: selectedAssociacio.color }}
            >
              <span>{selectedAssociacio.nom}</span>
              <button
                onClick={() => setSelectedAssociacio(null)}
                className="p-1 hover:bg-white hover:bg-opacity-20 rounded-full transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            {/* Contingut */}
            <div className="p-6 space-y-4 max-h-[70vh] md:max-h-screen overflow-y-auto">
              {selectedAssociacio.descripcio && (
                <div>
                  <h3 className="text-sm font-semibold text-warm-900 mb-1">Descripció</h3>
                  <p className="text-warm-700">{selectedAssociacio.descripcio}</p>
                </div>
              )}

              {selectedAssociacio.contacte && (
                <div className="flex items-start gap-3">
                  <User size={20} className="text-warm-600 mt-0.5" />
                  <div>
                    <h3 className="text-sm font-semibold text-warm-900">Contacte</h3>
                    <p className="text-warm-700">{selectedAssociacio.contacte}</p>
                  </div>
                </div>
              )}

              {selectedAssociacio.email && (
                <div className="flex items-start gap-3">
                  <Mail size={20} className="text-warm-600 mt-0.5" />
                  <div>
                    <h3 className="text-sm font-semibold text-warm-900">Email</h3>
                    <a
                      href={`mailto:${selectedAssociacio.email}`}
                      className="text-warm-600 hover:text-warm-700 hover:underline"
                    >
                      {selectedAssociacio.email}
                    </a>
                  </div>
                </div>
              )}

              {selectedAssociacio.telefon && (
                <div className="flex items-start gap-3">
                  <Phone size={20} className="text-warm-600 mt-0.5" />
                  <div>
                    <h3 className="text-sm font-semibold text-warm-900">Telèfon</h3>
                    <a
                      href={`tel:${selectedAssociacio.telefon}`}
                      className="text-warm-600 hover:text-warm-700 hover:underline"
                    >
                      {selectedAssociacio.telefon}
                    </a>
                  </div>
                </div>
              )}

              {selectedAssociacio.url && (
                <div>
                  <a
                    href={selectedAssociacio.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-warm-500 text-white rounded-lg hover:bg-warm-600 transition-colors"
                  >
                    <ExternalLink size={18} />
                    Visitar web
                  </a>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

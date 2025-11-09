import { useState, useEffect, useRef, useImperativeHandle, forwardRef, useCallback } from 'react';
import { MapContainer, TileLayer, Polygon, useMap } from 'react-leaflet';
import L, { LatLngExpression } from 'leaflet';
import { Edit, Trash2, Plus, Download, RotateCcw, AlertCircle, X } from 'lucide-react';
import { useAssociacions } from '../hooks/useAssociacions';
import type { Associacio } from '../types';
import 'leaflet/dist/leaflet.css';
import 'leaflet-draw/dist/leaflet.draw.css';
import 'leaflet-draw';

interface EditorState {
  mode: 'view' | 'edit' | 'create';
  selectedId: string | null;
  editingAssociacio: Partial<Associacio> | null;
}

// Component per gestionar la capa de dibuix
const DrawControl = forwardRef<
  { getCurrentPolygonCoords: () => [number, number][] | null },
  {
    onPolygonCreated: (coords: [number, number][]) => void;
    onPolygonEdited?: (coords: [number, number][]) => void;
    editMode: boolean;
    editingPolygon?: [number, number][];
    polygonColor?: string;
  }
>(function DrawControl(
  {
    onPolygonCreated,
    onPolygonEdited,
    editMode,
    editingPolygon,
    polygonColor,
  },
  ref
) {
  const map = useMap();
  const drawnItemsRef = useRef<L.FeatureGroup | null>(null);
  const editLayerRef = useRef<L.Polygon | null>(null);
  const drawControlRef = useRef<L.Control.Draw | null>(null);
  const editHandlerRef = useRef<any>(null);

  // Exposar mètode per obtenir les coordenades actuals del polígon
  useImperativeHandle(ref, () => ({
    getCurrentPolygonCoords: () => {
      if (!editLayerRef.current) return null;

      try {
        const latLngs = editLayerRef.current.getLatLngs()[0] as L.LatLng[];
        const coords = latLngs.map((ll: L.LatLng) =>
          [ll.lat, ll.lng] as [number, number]
        );
        console.log('getCurrentPolygonCoords returning:', coords);
        return coords;
      } catch (e) {
        console.error('Error getting current polygon coords:', e);
        return null;
      }
    },
  }));

  // Efecte 1: Crear el DrawControl (només quan canvia editMode)
  useEffect(() => {
    if (!editMode) return;

    // Crear capa per elements dibuixats
    const drawnItems = new L.FeatureGroup();
    map.addLayer(drawnItems);
    drawnItemsRef.current = drawnItems;

    // Configurar controls de dibuix
    const drawControl = new L.Control.Draw({
      edit: {
        featureGroup: drawnItems,
        remove: false,
      },
      draw: {
        polygon: {
          allowIntersection: false,
          shapeOptions: {
            color: '#f97316',
            fillColor: '#f97316',
            fillOpacity: 0.5,
            weight: 3,
          },
        },
        polyline: false,
        circle: false,
        circlemarker: false,
        marker: false,
        rectangle: false,
      },
    });

    map.addControl(drawControl);
    drawControlRef.current = drawControl;

    // Event quan es crea un polígon
    const onCreate = (e: any) => {
      const layer = e.layer;
      drawnItems.addLayer(layer);

      const coords = layer.getLatLngs()[0].map((ll: L.LatLng) => [ll.lat, ll.lng] as [number, number]);
      onPolygonCreated(coords);

      // Guardar referència per poder editar
      editLayerRef.current = layer;

      // Activar edició automàticament després de crear
      setTimeout(() => {
        if (drawnItemsRef.current && drawnItemsRef.current.getLayers().length > 0) {
          const editHandler = new (L.EditToolbar as any).Edit(map, {
            featureGroup: drawnItemsRef.current,
          });
          editHandler.enable();
          editHandlerRef.current = editHandler;
        }
      }, 100);
    };

    // Event quan s'edita un polígon
    const onEdit = (e: any) => {
      console.log('onEdit event triggered');
      const layers = e.layers;
      layers.eachLayer((layer: any) => {
        const coords = layer.getLatLngs()[0].map((ll: L.LatLng) =>
          [ll.lat, ll.lng] as [number, number]
        );
        console.log('onEdit extracted coords:', coords);
        console.log('onEdit coords length:', coords.length);
        if (onPolygonEdited) {
          onPolygonEdited(coords);
        }
      });
    };

    map.on(L.Draw.Event.CREATED, onCreate);
    map.on(L.Draw.Event.EDITED, onEdit);

    return () => {
      if (editHandlerRef.current) {
        try {
          editHandlerRef.current.disable();
        } catch (e) {
          // Ignore errors on cleanup
        }
        editHandlerRef.current = null;
      }
      map.off(L.Draw.Event.CREATED, onCreate);
      map.off(L.Draw.Event.EDITED, onEdit);
      if (drawControlRef.current) {
        map.removeControl(drawControlRef.current);
      }
      if (drawnItemsRef.current) {
        map.removeLayer(drawnItemsRef.current);
      }
      editLayerRef.current = null;
      drawControlRef.current = null;
      drawnItemsRef.current = null;
    };
  }, [editMode, map, onPolygonCreated, onPolygonEdited]);

  // Efecte 2: Gestionar el polígon i activar edició automàtica
  useEffect(() => {
    console.log('DrawControl useEffect 2 triggered');
    console.log('editMode:', editMode);
    console.log('drawnItemsRef.current:', drawnItemsRef.current);
    console.log('editingPolygon:', editingPolygon);

    if (!editMode || !drawnItemsRef.current) {
      console.log('useEffect 2 returning early - no editMode or drawnItemsRef');
      return;
    }

    // Si ja hi ha una capa editant-se amb el handler actiu, NO fer res
    // Això evita que es netegi el polígon quan es fa Save al mapa
    console.log('editLayerRef.current:', editLayerRef.current);
    console.log('editHandlerRef.current:', editHandlerRef.current);

    if (editLayerRef.current && editHandlerRef.current) {
      console.log('useEffect 2 - keeping existing layer and handler');
      // Només actualitzar el color del layer existent si cal
      if (polygonColor && editLayerRef.current) {
        editLayerRef.current.setStyle({
          color: polygonColor,
          fillColor: polygonColor,
          fillOpacity: 0.5,
          weight: 3,
        });
      }
      return;
    }

    console.log('useEffect 2 - recreating polygon');

    // Deshabilitar edició anterior si n'hi ha
    if (editHandlerRef.current) {
      try {
        editHandlerRef.current.disable();
        editHandlerRef.current = null;
      } catch (e) {
        // Ignore errors
      }
    }

    // Netejar capes anteriors
    drawnItemsRef.current.clearLayers();
    editLayerRef.current = null;

    // Si hi ha un polígon en edició, afegir-lo
    if (editingPolygon && editingPolygon.length > 0) {
      const layer = L.polygon(editingPolygon as L.LatLngExpression[], {
        color: polygonColor || '#f97316',
        fillColor: polygonColor || '#f97316',
        fillOpacity: 0.5,
        weight: 3,
      });
      drawnItemsRef.current.addLayer(layer);
      editLayerRef.current = layer;

      // Activar edició automàticament
      setTimeout(() => {
        if (drawnItemsRef.current && drawnItemsRef.current.getLayers().length > 0) {
          try {
            const editHandler = new (L.EditToolbar as any).Edit(map, {
              featureGroup: drawnItemsRef.current,
            });
            editHandler.enable();
            editHandlerRef.current = editHandler;
          } catch (e) {
            console.error('Error activant edició:', e);
          }
        }
      }, 100);
    }
  }, [editingPolygon, polygonColor, editMode, map]);

  return null;
});

export default function MapEditor() {
  const {
    associacions,
    loading,
    isDirty,
    updateAssociacio,
    addAssociacio,
    deleteAssociacio,
    clearDirtyData,
  } = useAssociacions();

  const [editorState, setEditorState] = useState<EditorState>({
    mode: 'view',
    selectedId: null,
    editingAssociacio: null,
  });

  const drawControlRef = useRef<{ getCurrentPolygonCoords: () => [number, number][] | null }>(null);

  const tianaCenter: LatLngExpression = [41.4917, 2.2647];

  // Generar nou ID
  const generateId = () => {
    return 'assoc-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
  };

  // Generar color aleatori amb bona saturació i luminositat
  const generateRandomColor = () => {
    // Generar hue aleatori (0-360)
    const hue = Math.floor(Math.random() * 360);
    // Saturació alta per colors vius (60-90%)
    const saturation = 60 + Math.floor(Math.random() * 30);
    // Luminositat mitjana per visibilitat (40-60%)
    const lightness = 40 + Math.floor(Math.random() * 20);

    // Convertir HSL a RGB
    const h = hue / 360;
    const s = saturation / 100;
    const l = lightness / 100;

    const c = (1 - Math.abs(2 * l - 1)) * s;
    const x = c * (1 - Math.abs(((h * 6) % 2) - 1));
    const m = l - c / 2;

    let r = 0, g = 0, b = 0;
    if (h < 1/6) { r = c; g = x; b = 0; }
    else if (h < 2/6) { r = x; g = c; b = 0; }
    else if (h < 3/6) { r = 0; g = c; b = x; }
    else if (h < 4/6) { r = 0; g = x; b = c; }
    else if (h < 5/6) { r = x; g = 0; b = c; }
    else { r = c; g = 0; b = x; }

    const toHex = (n: number) => {
      const hex = Math.round((n + m) * 255).toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    };

    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  };

  // Iniciar edició d'una associació
  const startEdit = (assoc: Associacio) => {
    setEditorState({
      mode: 'edit',
      selectedId: assoc.id,
      editingAssociacio: { ...assoc },
    });
  };

  // Iniciar creació d'una nova associació
  const startCreate = () => {
    const novaAssociacio: Associacio = {
      id: generateId(),
      nom: 'Nova Associació',
      abreviacio: 'NOVA',
      color: generateRandomColor(),
      poligon: [],
      descripcio: '',
      contacte: '',
      email: '',
      telefon: '',
      url: '',
    };

    // Crear immediatament amb valors per defecte
    addAssociacio(novaAssociacio);

    // Editar la nova associació
    setEditorState({
      mode: 'edit',
      selectedId: novaAssociacio.id,
      editingAssociacio: { ...novaAssociacio },
    });
  };

  // Tancar el panell d'edició
  const closePanel = () => {
    // Capturar les coordenades actuals del polígon abans de tancar
    // i guardar tots els canvis del formulari
    if (editorState.editingAssociacio) {
      const currentCoords = drawControlRef.current?.getCurrentPolygonCoords();

      updateAssociacio(editorState.editingAssociacio.id!, {
        ...editorState.editingAssociacio,
        poligon: currentCoords && currentCoords.length > 0 ? currentCoords : editorState.editingAssociacio.poligon,
      });
    }

    // Tancar el panell
    setEditorState({
      mode: 'view',
      selectedId: null,
      editingAssociacio: null,
    });
  };

  // Actualitzar camp del formulari (només estat local)
  const updateField = (field: keyof Associacio, value: any) => {
    setEditorState((prevState) => {
      if (!prevState.editingAssociacio) return prevState;

      const updated = {
        ...prevState.editingAssociacio,
        [field]: value,
      };

      return {
        ...prevState,
        editingAssociacio: updated,
      };
    });
  };

  // Quan es crea/edita un polígon
  const handlePolygonCreated = useCallback((coords: [number, number][]) => {
    console.log('handlePolygonCreated called with coords:', coords);
    console.log('Number of points:', coords.length);
    // Crear una còpia nova de l'array per assegurar que React detecta el canvi
    const newCoords = [...coords];

    setEditorState((prevState) => {
      if (!prevState.editingAssociacio) return prevState;

      return {
        ...prevState,
        editingAssociacio: {
          ...prevState.editingAssociacio,
          poligon: newCoords,
        },
      };
    });
  }, []);

  // Descarregar JSON de l'associació en edició actual
  const handleDownloadCurrentJSON = () => {
    if (!editorState.editingAssociacio) return;

    // Capturar les coordenades actuals del polígon
    const currentCoords = drawControlRef.current?.getCurrentPolygonCoords();

    // Crear l'objecte amb les dades més actuals
    const currentData = {
      ...editorState.editingAssociacio,
      poligon: currentCoords && currentCoords.length > 0 ? currentCoords : editorState.editingAssociacio.poligon,
    };

    // Descarregar el JSON
    const dataStr = JSON.stringify(currentData, null, 2);
    const filename = `${currentData.id}.json`;
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Eliminar associació
  const handleDelete = (id: string) => {
    if (confirm('Estàs segur que vols eliminar aquesta associació?')) {
      deleteAssociacio(id);
      // Tancar el panell sense guardar (l'associació ja s'ha eliminat)
      setEditorState({
        mode: 'view',
        selectedId: null,
        editingAssociacio: null,
      });
    }
  };

  if (loading) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-warm-50">
        <div className="text-warm-700 text-xl">Carregant editor...</div>
      </div>
    );
  }

  return (
    <div className="flex h-screen">
      {/* Mapa */}
      <div className="flex-1 relative">
        {/* Warning en mòbil */}
        <div className="md:hidden absolute top-0 left-0 right-0 bg-warm-600 text-white p-3 z-[1000] text-sm flex items-start gap-2">
          <AlertCircle size={20} className="flex-shrink-0 mt-0.5" />
          <span>L'editor està optimitzat per ordinador. Algunes funcions poden no funcionar correctament en mòbil.</span>
        </div>

        <MapContainer
          center={tianaCenter}
          zoom={15}
          className="w-full h-full"
          zoomControl={true}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {/* Mostrar polígons existents */}
          {associacions
            .filter(a => a.id !== editorState.selectedId)
            .map((assoc) => (
              <Polygon
                key={assoc.id}
                positions={assoc.poligon as LatLngExpression[]}
                pathOptions={{
                  color: assoc.color,
                  fillColor: assoc.color,
                  fillOpacity: 0.3,
                  weight: 2,
                }}
              />
            ))}

          {/* Controls de dibuix */}
          {(editorState.mode === 'create' || editorState.mode === 'edit') && (
            <DrawControl
              ref={drawControlRef}
              onPolygonCreated={handlePolygonCreated}
              onPolygonEdited={handlePolygonCreated}
              editMode={true}
              editingPolygon={editorState.editingAssociacio?.poligon}
              polygonColor={editorState.editingAssociacio?.color}
            />
          )}
        </MapContainer>

        {/* Badge dirty */}
        {isDirty && (
          <div className="absolute top-4 left-4 z-[1000] bg-warm-600 text-white px-3 py-1.5 rounded-lg shadow-lg text-sm font-semibold flex items-center gap-2">
            <Edit size={16} />
            Canvis no guardats
          </div>
        )}
      </div>

      {/* Panel lateral */}
      <div className="w-full md:w-96 bg-white shadow-xl overflow-y-auto flex flex-col">
        {/* Header */}
        <div className="bg-warm-500 text-white p-4">
          <h1 className="text-xl font-bold">Editor de Mapa</h1>
          <p className="text-warm-100 text-sm mt-1">Gestiona les associacions veïnals</p>
        </div>

        {/* Contingut */}
        <div className="flex-1 p-4 space-y-4">
          {/* Mode vista: Llista d'associacions */}
          {editorState.mode === 'view' && (
            <>
              <button
                onClick={startCreate}
                className="w-full flex items-center justify-center gap-2 bg-warm-500 text-white px-4 py-3 rounded-lg hover:bg-warm-600 transition-colors font-semibold"
              >
                <Plus size={20} />
                Afegir Nova Associació
              </button>

              <div className="space-y-2">
                <h2 className="font-semibold text-warm-900">Associacions existents</h2>
                {associacions.map((assoc) => (
                  <div
                    key={assoc.id}
                    className="border border-warm-200 rounded-lg p-3 flex items-center justify-between hover:border-warm-400 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-4 h-4 rounded"
                        style={{ backgroundColor: assoc.color }}
                      />
                      <div>
                        <div className="font-semibold text-warm-900">{assoc.nom}</div>
                        <div className="text-sm text-warm-600">{assoc.abreviacio}</div>
                      </div>
                    </div>
                    <button
                      onClick={() => startEdit(assoc)}
                      className="px-3 py-1.5 bg-warm-100 text-warm-700 rounded hover:bg-warm-200 transition-colors text-sm font-medium"
                    >
                      Editar
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Mode edició/creació: Formulari */}
          {(editorState.mode === 'edit' || editorState.mode === 'create') && editorState.editingAssociacio && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-warm-900 text-lg">
                  Propietats de l'associació
                </h2>
                <button
                  onClick={closePanel}
                  className="px-3 py-1.5 bg-warm-100 text-warm-700 rounded-lg hover:bg-warm-200 transition-colors text-sm font-medium flex items-center gap-1"
                >
                  <X size={16} />
                  Tancar
                </button>
              </div>

              {/* Nom */}
              <div>
                <label className="block text-sm font-semibold text-warm-900 mb-1">
                  Nom <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={editorState.editingAssociacio.nom || ''}
                  onChange={(e) => updateField('nom', e.target.value)}
                  className="w-full px-3 py-2 border border-warm-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-warm-500"
                  placeholder="Associació de Veïns..."
                />
              </div>

              {/* Abreviació */}
              <div>
                <label className="block text-sm font-semibold text-warm-900 mb-1">
                  Abreviació <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={editorState.editingAssociacio.abreviacio || ''}
                  onChange={(e) => updateField('abreviacio', e.target.value)}
                  className="w-full px-3 py-2 border border-warm-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-warm-500"
                  placeholder="AV Centre"
                />
              </div>

              {/* Color */}
              <div>
                <label className="block text-sm font-semibold text-warm-900 mb-1">
                  Color <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={editorState.editingAssociacio.color || '#f97316'}
                    onChange={(e) => updateField('color', e.target.value)}
                    className="w-16 h-10 border border-warm-300 rounded cursor-pointer"
                  />
                  <input
                    type="text"
                    value={editorState.editingAssociacio.color || '#f97316'}
                    onChange={(e) => updateField('color', e.target.value)}
                    className="flex-1 px-3 py-2 border border-warm-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-warm-500"
                    placeholder="#f97316"
                  />
                </div>
              </div>

              {/* Polígon */}
              <div>
                <label className="block text-sm font-semibold text-warm-900 mb-1">
                  Polígon <span className="text-red-500">*</span>
                </label>
                <div className="text-sm text-warm-600 bg-warm-50 p-3 rounded-lg">
                  {editorState.editingAssociacio.poligon && editorState.editingAssociacio.poligon.length > 0 ? (
                    <span className="text-green-600 font-semibold">
                      ✓ Polígon definit ({editorState.editingAssociacio.poligon.length} punts)
                    </span>
                  ) : (
                    <>
                      <AlertCircle size={16} className="inline mr-1" />
                      Utilitza les eines del mapa per dibuixar el polígon
                    </>
                  )}
                </div>
              </div>

              {/* Descripció */}
              <div>
                <label className="block text-sm font-semibold text-warm-900 mb-1">
                  Descripció
                </label>
                <textarea
                  value={editorState.editingAssociacio.descripcio || ''}
                  onChange={(e) => updateField('descripcio', e.target.value)}
                  className="w-full px-3 py-2 border border-warm-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-warm-500 resize-none"
                  rows={3}
                  placeholder="Descripció breu de l'associació..."
                />
              </div>

              {/* Detalls expandibles */}
              <details className="group">
                <summary className="cursor-pointer text-sm font-semibold text-warm-700 hover:text-warm-900 select-none">
                  Més informació (opcional)
                </summary>
                <div className="mt-3 space-y-3">
                  {/* Contacte */}
                  <div>
                    <label className="block text-sm font-semibold text-warm-900 mb-1">
                      Contacte
                    </label>
                    <input
                      type="text"
                      value={editorState.editingAssociacio.contacte || ''}
                      onChange={(e) => updateField('contacte', e.target.value)}
                      className="w-full px-3 py-2 border border-warm-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-warm-500"
                      placeholder="Nom del president/a"
                    />
                  </div>

                  {/* Email */}
                  <div>
                    <label className="block text-sm font-semibold text-warm-900 mb-1">
                      Email
                    </label>
                    <input
                      type="email"
                      value={editorState.editingAssociacio.email || ''}
                      onChange={(e) => updateField('email', e.target.value)}
                      className="w-full px-3 py-2 border border-warm-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-warm-500"
                      placeholder="contacte@exemple.cat"
                    />
                  </div>

                  {/* Telèfon */}
                  <div>
                    <label className="block text-sm font-semibold text-warm-900 mb-1">
                      Telèfon
                    </label>
                    <input
                      type="tel"
                      value={editorState.editingAssociacio.telefon || ''}
                      onChange={(e) => updateField('telefon', e.target.value)}
                      className="w-full px-3 py-2 border border-warm-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-warm-500"
                      placeholder="93 123 45 67"
                    />
                  </div>

                  {/* URL */}
                  <div>
                    <label className="block text-sm font-semibold text-warm-900 mb-1">
                      Pàgina web
                    </label>
                    <input
                      type="url"
                      value={editorState.editingAssociacio.url || ''}
                      onChange={(e) => updateField('url', e.target.value)}
                      className="w-full px-3 py-2 border border-warm-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-warm-500"
                      placeholder="https://exemple.cat"
                    />
                  </div>
                </div>
              </details>

              {/* Botons d'acció */}
              <div className="space-y-2 pt-4 border-t border-warm-200 mt-4">
                <button
                  onClick={handleDownloadCurrentJSON}
                  className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-lg hover:bg-blue-700 transition-colors font-semibold"
                >
                  <Download size={18} />
                  Descarregar JSON
                </button>

                <button
                  onClick={() => editorState.selectedId && handleDelete(editorState.selectedId)}
                  className="w-full flex items-center justify-center gap-2 bg-white text-red-700 border-2 border-red-200 px-4 py-2.5 rounded-lg hover:bg-red-50 transition-colors font-semibold"
                >
                  <Trash2 size={18} />
                  Eliminar Associació
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer amb accions globals */}
        <div className="border-t border-warm-200 p-4 bg-warm-50">
          <button
            onClick={clearDirtyData}
            disabled={!isDirty}
            className="w-full flex items-center justify-center gap-2 bg-warm-200 text-warm-800 px-4 py-2.5 rounded-lg hover:bg-warm-300 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RotateCcw size={18} />
            Desfer Canvis
          </button>
        </div>
      </div>
    </div>
  );
}

import { useState, useEffect } from 'react';
import type { Associacio } from '../types';

const STORAGE_KEY = 'mapa-tiana-dirty-data';

interface UseAssociacionsOptions {
  ignoreLocalStorage?: boolean;
}

export function useAssociacions(options: UseAssociacionsOptions = {}) {
  const { ignoreLocalStorage = false } = options;
  const [associacions, setAssociacions] = useState<Associacio[]>([]);
  const [publishedAssociacions, setPublishedAssociacions] = useState<Associacio[]>([]);
  const [isDirty, setIsDirty] = useState(false);
  const [loading, setLoading] = useState(true);

  // Carregar dades inicials
  useEffect(() => {
    loadData();
    // Carregar dades publicades per comparació
    if (!ignoreLocalStorage) {
      loadPublishedData();
    }
  }, [ignoreLocalStorage]);

  const loadData = async () => {
    try {
      setLoading(true);

      // Comprovar si hi ha dades "dirty" al localStorage (només si no s'ignora)
      if (!ignoreLocalStorage) {
        const dirtyData = localStorage.getItem(STORAGE_KEY);

        if (dirtyData) {
          const parsed = JSON.parse(dirtyData);
          setAssociacions(parsed);
          setIsDirty(true);
          return;
        }
      }

      // Intentar carregar des de fitxers individuals
      try {
        const indexResponse = await fetch('/mapa-agrupacio-tiana/data/index.json');
        const index = await indexResponse.json();

        // Carregar tots els fitxers en paral·lel
        const promises = index.files.map((filename: string) =>
          fetch(`/mapa-agrupacio-tiana/data/${filename}`).then(r => r.json())
        );

        const associacionsData = await Promise.all(promises);
        setAssociacions(associacionsData);
      } catch (indexError) {
        // Si falla, intentar carregar el fitxer únic antic (compatibilitat)
        console.log('Carregant des del fitxer únic (fallback)...');
        const response = await fetch('/mapa-agrupacio-tiana/data/associacions.json');
        const data = await response.json();
        setAssociacions(data.associacions || []);
      }

      setIsDirty(false);
    } catch (error) {
      console.error('Error carregant dades:', error);
      setAssociacions([]);
    } finally {
      setLoading(false);
    }
  };

  const saveToLocalStorage = (data: Associacio[]) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    setAssociacions(data);
    setIsDirty(true);
  };

  const clearDirtyData = () => {
    localStorage.removeItem(STORAGE_KEY);
    setIsDirty(false);
    loadData();
  };

  const loadPublishedData = async () => {
    try {
      // Intentar carregar des de fitxers individuals
      try {
        const indexResponse = await fetch('/mapa-agrupacio-tiana/data/index.json');
        const index = await indexResponse.json();

        // Carregar tots els fitxers en paral·lel
        const promises = index.files.map((filename: string) =>
          fetch(`/mapa-agrupacio-tiana/data/${filename}`).then(r => r.json())
        );

        const associacionsData = await Promise.all(promises);
        setPublishedAssociacions(associacionsData);
      } catch (indexError) {
        // Si falla, intentar carregar el fitxer únic antic (compatibilitat)
        const response = await fetch('/mapa-agrupacio-tiana/data/associacions.json');
        const data = await response.json();
        setPublishedAssociacions(data.associacions || []);
      }
    } catch (error) {
      console.error('Error carregant dades publicades:', error);
      setPublishedAssociacions([]);
    }
  };

  const getDirtyIds = (): string[] => {
    const dirtyIds: string[] = [];

    // Comparar cada associació actual amb la publicada
    associacions.forEach(assoc => {
      const published = publishedAssociacions.find(p => p.id === assoc.id);

      if (!published) {
        // Nova associació (no existeix al servidor)
        dirtyIds.push(assoc.id);
      } else {
        // Comparar contingut per detectar modificacions
        const currentJSON = JSON.stringify(assoc);
        const publishedJSON = JSON.stringify(published);

        if (currentJSON !== publishedJSON) {
          dirtyIds.push(assoc.id);
        }
      }
    });

    return dirtyIds;
  };

  const updateAssociacio = (id: string, updates: Partial<Associacio>) => {
    const updated = associacions.map(a =>
      a.id === id ? { ...a, ...updates } : a
    );
    saveToLocalStorage(updated);
  };

  const addAssociacio = (nova: Associacio) => {
    saveToLocalStorage([...associacions, nova]);
  };

  const deleteAssociacio = (id: string) => {
    const filtered = associacions.filter(a => a.id !== id);
    saveToLocalStorage(filtered);
  };

  const downloadJSON = (id?: string) => {
    let dataStr: string;
    let filename: string;

    if (id) {
      // Descarregar només una associació
      const associacio = associacions.find(a => a.id === id);
      if (!associacio) {
        console.error('Associació no trobada:', id);
        return;
      }
      dataStr = JSON.stringify(associacio, null, 2);
      filename = `${id}.json`;
    } else {
      // Descarregar totes les associacions
      dataStr = JSON.stringify({ associacions }, null, 2);
      filename = 'associacions.json';
    }

    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  return {
    associacions,
    loading,
    isDirty,
    updateAssociacio,
    addAssociacio,
    deleteAssociacio,
    clearDirtyData,
    downloadJSON,
    getDirtyIds,
  };
}

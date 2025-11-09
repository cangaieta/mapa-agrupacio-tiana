export interface Associacio {
  id: string;
  nom: string;
  abreviacio: string;
  color: string;
  poligon: [number, number][]; // Array de coordenades [lat, lng]
  url?: string;
  descripcio?: string;
  contacte?: string;
  email?: string;
  telefon?: string;
}

export interface AssociacioData {
  associacions: Associacio[];
}

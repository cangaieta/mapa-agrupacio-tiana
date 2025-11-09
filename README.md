# Mapa Agrupació Veïnal de Tiana

Aplicació web interactiva per visualitzar i gestionar el mapa de les associacions i plataformes veïnals de l'Agrupació Veïnal de Tiana.

## Característiques

- **Visualitzador de mapa** (`/`): Mapa interactiu amb polígons de colors que mostren l'àrea d'influència de cada associació
- **Editor de mapa** (`/edit`): Eina per als presidents d'associacions per editar i crear noves associacions
- **Gestió d'edicions**: Les edicions es guarden al localStorage del navegador fins que es descarreguen
- **Sense servidor**: Tota l'aplicació funciona al client, ideal per GitHub Pages

## Tecnologies

- React 19 amb TypeScript
- Vite per al build
- React Leaflet per al mapa (OpenStreetMap)
- Leaflet.draw per l'edició de polígons
- Tailwind CSS per l'estil
- React Router per la navegació
- Lucide React per les icones

## Desenvolupament

### Instal·lació

```bash
npm install
```

### Executar en mode desenvolupament

```bash
npm run dev
```

### Build per producció

```bash
npm run build
```

### Preview del build

```bash
npm run preview
```

## Estructura de dades

Les dades de les associacions es guarden a `public/data/associacions.json` amb el següent format:

```json
{
  "associacions": [
    {
      "id": "aavv-centre",
      "nom": "Associació de Veïns del Centre",
      "abreviacio": "AV Centre",
      "color": "#f97316",
      "poligon": [
        [41.4930, 2.2630],
        [41.4930, 2.2670],
        [41.4910, 2.2670],
        [41.4910, 2.2630]
      ],
      "url": "https://example.com",
      "descripcio": "Descripció de l'associació",
      "contacte": "Nom del contacte",
      "email": "email@exemple.cat",
      "telefon": "93 123 45 67"
    }
  ]
}
```

## Com utilitzar l'editor

1. Ves a `/edit`
2. Fes clic a "Afegir Nova Associació" o "Editar" en una existent
3. Omple el formulari amb les dades
4. Utilitza les eines del mapa per dibuixar el polígon d'influència
5. Fes clic a "Guardar"
6. Quan acabis totes les edicions, fes clic a "Descarregar JSON"
7. Envia el fitxer JSON descarregat per actualitzar les dades oficials

## Deployment a GitHub Pages

L'aplicació està configurada per desplegar-se automàticament a GitHub Pages quan es fa push a la branca `main`.

### Configuració necessària

1. Al teu repositori de GitHub, ves a Settings > Pages
2. A "Build and deployment", selecciona:
   - Source: GitHub Actions
3. Fes push del codi a la branca `main`

L'aplicació estarà disponible a: `https://[el-teu-usuari].github.io/mapa-agrupacio-tiana/`

## Llicència

ISC

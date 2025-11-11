# Système d'Analyse Géospatiale par Hexagones

Application complète pour l'analyse géospatiale utilisant des hexagones comme unités d'analyse territoriale.

## Structure du Projet

```
lak/
├── frontend/          # Application React
│   ├── src/
│   │   ├── components/
│   │   │   └── GeospatialAnalysisUI.jsx
│   │   ├── App.jsx
│   │   └── index.js
│   ├── package.json
│   └── tailwind.config.js
├── backend/          # API Flask
│   ├── app.py
│   ├── geospatial_analyzer.py
│   └── requirements.txt
└── data/             # Données géospatiales
    ├── DEM/
    │   └── DEM_Projected.tif
    └── Vector/
        ├── buildings.shp
        ├── roads.shp
        ├── landuse.shp
        ├── water_zones.shp
        └── water_ways.shp
```

## Installation

### Backend (Python)

1. Créer un environnement virtuel :
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Sur Windows: venv\Scripts\activate
```

2. Installer les dépendances :
```bash
pip install -r requirements.txt
```

3. Lancer le serveur :
```bash
python app.py
```

Le serveur sera accessible sur `http://localhost:5000`

### Frontend (React)

1. Installer les dépendances :
```bash
cd frontend
npm install
```

**Note** : La carte interactive nécessite les dépendances Leaflet qui sont déjà dans `package.json`. Si vous avez des problèmes, exécutez :
```bash
npm install react-leaflet leaflet
```

2. Lancer l'application :
```bash
npm start
```

L'application sera accessible sur `http://localhost:3000`

## Utilisation

1. Démarrez le backend Flask
2. Démarrez le frontend React
3. Accédez à l'interface dans votre navigateur
4. Configurez les coordonnées et le rayon de l'hexagone
5. Lancez l'analyse

## Fonctionnalités

- **Analyse d'élévation** : Statistiques min/moyenne/max depuis le DEM
- **Analyse des bâtiments** : Surface bâtie et densité
- **Analyse des routes** : Longueur totale du réseau routier
- **Analyse hydrographique** : Zones d'eau et cours d'eau
- **Analyse d'occupation du sol** : Répartition par type d'usage
- **Carte interactive** : Visualisation Leaflet avec hexagone interactif
  - Clic sur la carte pour repositionner le centre
  - Double-clic pour zoomer sur l'hexagone
  - Couleur dynamique selon l'élévation
  - Popup avec métriques détaillées
  - Support de plusieurs fonds de carte (OSM, Satellite, Topographique)
- **Export** : CSV et GeoJSON

## API Endpoints

- `POST /api/analyze` : Lance une analyse géospatiale
- `GET /api/hexagon-geojson` : Retourne la géométrie de l'hexagone
- `GET /api/health` : Vérifie l'état de l'API

## Technologies

- **Frontend** : React, Tailwind CSS, Lucide Icons, React Leaflet
- **Backend** : Flask, GeoPandas, Rasterio, Shapely
- **Données** : Shapefiles, GeoTIFF (DEM)
- **Cartographie** : Leaflet, OpenStreetMap

## Documentation Complémentaire

Pour plus de détails sur la carte interactive, consultez :
- `frontend/INSTALLATION_MAP.md` : Guide d'installation et d'utilisation de la carte

# hexagones

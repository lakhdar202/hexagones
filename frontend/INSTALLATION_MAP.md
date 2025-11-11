# 🗺️ Installation de la Carte Interactive

## 📦 Installation des Dépendances

Pour utiliser la carte interactive Leaflet, vous devez installer les dépendances suivantes :

```bash
cd frontend
npm install react-leaflet leaflet
```

## ✅ Fonctionnalités Implémentées

### 1. Carte Interactive
- ✅ Affichage avec fond de carte OpenStreetMap
- ✅ Support de plusieurs fonds de carte (Standard, Satellite, Topographique)
- ✅ Contrôleur de couches (Layers Control)
- ✅ Zoom automatique sur l'hexagone
- ✅ Contrôles de zoom standard

### 2. Visualisation de l'Hexagone
- ✅ Calcul automatique des 6 sommets
- ✅ Polygone avec style personnalisé
- ✅ Couleur dynamique selon l'élévation moyenne
- ✅ Animation au survol
- ✅ Popup avec métriques détaillées

### 3. Interactivité
- ✅ Clic sur la carte → mise à jour des coordonnées
- ✅ Double-clic sur l'hexagone → zoom automatique
- ✅ Survol de l'hexagone → highlight visuel
- ✅ Marqueur central avec animation de pulsation

### 4. Intégration
- ✅ Synchronisation avec les coordonnées du formulaire
- ✅ Mise à jour en temps réel lors du changement de rayon
- ✅ Affichage des résultats d'analyse dans le popup
- ✅ Panneau d'informations complémentaires

## 🎨 Styles et Couleurs

### Couleur de l'Hexagone selon l'Élévation
- **Vert** (#10b981) : < 50m
- **Jaune** (#fbbf24) : 50-100m
- **Orange** (#f59e0b) : 100-200m
- **Rouge** (#ef4444) : > 200m

## 🚀 Utilisation

1. **Démarrer l'application** :
   ```bash
   npm start
   ```

2. **Accéder à l'onglet "Carte"** dans l'interface

3. **Interactions disponibles** :
   - Cliquez sur la carte pour déplacer le centre de l'hexagone
   - Double-cliquez sur l'hexagone pour zoomer automatiquement
   - Survolez l'hexagone pour voir les détails
   - Utilisez le contrôleur de couches (en haut à droite) pour changer le fond de carte

## 🔧 Configuration

### Ajuster le Zoom Initial
Modifiez la valeur `zoom` dans `InteractiveMap.jsx` :
```javascript
<MapContainer
  zoom={13}  // Changez cette valeur (1-18)
  ...
/>
```

### Modifier les Couleurs d'Élévation
Modifiez la fonction `getElevationColor` dans `InteractiveMap.jsx` :
```javascript
const colors = [
  { threshold: 0, color: '#10b981' },
  { threshold: 50, color: '#fbbf24' },
  // Ajoutez vos seuils ici
];
```

## 📝 Notes Techniques

- Les calculs géométriques utilisent une approximation pour les petites distances (< 10km)
- Le marqueur central utilise une animation CSS de pulsation
- Les icônes Leaflet sont corrigées automatiquement (bug connu)
- La carte s'adapte automatiquement aux dimensions de l'hexagone

## 🐛 Résolution de Problèmes

### Les icônes ne s'affichent pas
Le code inclut déjà le fix pour les icônes Leaflet. Si le problème persiste, vérifiez que les fichiers d'icônes sont bien dans `node_modules/leaflet/dist/images/`.

### La carte ne s'affiche pas
1. Vérifiez que Leaflet CSS est importé : `import 'leaflet/dist/leaflet.css';`
2. Vérifiez la console du navigateur pour les erreurs
3. Assurez-vous que les dépendances sont bien installées

### L'hexagone ne se met pas à jour
Vérifiez que les props `coordinates` et `radius` sont bien passées au composant `InteractiveMap`.

## 📚 Ressources

- [Documentation React Leaflet](https://react-leaflet.js.org/)
- [Documentation Leaflet](https://leafletjs.com/)
- [OpenStreetMap](https://www.openstreetmap.org/)


# 🔧 Guide de Dépannage

## Erreur NetworkError lors de l'analyse

Si vous rencontrez l'erreur "NetworkError when attempting to fetch resource", suivez ces étapes :

### 1. Vérifier que le backend est démarré

Le backend Flask doit être en cours d'exécution avant de lancer l'analyse.

**Windows :**
```bash
cd backend
python app.py
```

**Linux/Mac :**
```bash
cd backend
python3 app.py
```

Vous devriez voir :
```
✅ Analyseur initialisé avec succès
   DEM: C:\Users\...\data\DEM\DEM_Projected.tif
   Vector: C:\Users\...\data\Vector
 * Running on http://0.0.0.0:5000
```

### 2. Vérifier les fichiers de données

Assurez-vous que les fichiers suivants existent :

```
data/
├── DEM/
│   └── DEM_Projected.tif
└── Vector/
    ├── buildings.shp
    ├── roads.shp
    ├── landuse.shp
    ├── water_zones.shp
    └── water_ways.shp
```

### 3. Vérifier le port 5000

Le backend doit écouter sur le port 5000. Si ce port est déjà utilisé :

**Option A :** Libérer le port 5000
```bash
# Windows
netstat -ano | findstr :5000
taskkill /PID <PID> /F

# Linux/Mac
lsof -ti:5000 | xargs kill -9
```

**Option B :** Changer le port dans `backend/app.py` :
```python
app.run(debug=True, host='0.0.0.0', port=5001)  # Changez 5000 en 5001
```

Et mettre à jour l'URL dans `frontend/src/components/GeospatialAnalysisUI.jsx` :
```javascript
const response = await fetch('http://localhost:5001/api/analyze', {
```

### 4. Vérifier CORS

Le backend doit avoir CORS activé. Vérifiez que `flask-cors` est installé :

```bash
pip install flask-cors
```

### 5. Tester la connexion manuellement

Ouvrez votre navigateur et allez sur :
```
http://localhost:5000/api/health
```

Vous devriez voir :
```json
{
  "status": "ok",
  "message": "API fonctionnelle",
  "analyzer_initialized": true
}
```

### 6. Vérifier la console du navigateur

Ouvrez les outils de développement (F12) et regardez l'onglet Console pour voir les erreurs détaillées.

### 7. Vérifier le proxy dans package.json

Le fichier `frontend/package.json` doit contenir :
```json
"proxy": "http://localhost:5000"
```

## Erreurs courantes

### "Analyseur non initialisé"

**Cause :** Les fichiers de données sont manquants ou introuvables.

**Solution :**
1. Vérifiez que les fichiers existent dans le dossier `data/`
2. Vérifiez les chemins dans `backend/app.py`
3. Vérifiez les permissions d'accès aux fichiers

### "Module not found: geopandas"

**Cause :** Les dépendances Python ne sont pas installées.

**Solution :**
```bash
cd backend
pip install -r requirements.txt
```

### "Port 5000 already in use"

**Cause :** Un autre processus utilise le port 5000.

**Solution :** Voir l'étape 3 ci-dessus.

## Commandes utiles

### Vérifier que le backend répond
```bash
curl http://localhost:5000/api/health
```

### Vérifier les processus Python
```bash
# Windows
tasklist | findstr python

# Linux/Mac
ps aux | grep python
```

### Réinstaller les dépendances
```bash
# Backend
cd backend
pip install --upgrade -r requirements.txt

# Frontend
cd frontend
npm install
```

## Support

Si le problème persiste :
1. Vérifiez les logs du backend dans le terminal
2. Vérifiez la console du navigateur (F12)
3. Vérifiez que tous les fichiers sont bien présents
4. Essayez de redémarrer les deux serveurs


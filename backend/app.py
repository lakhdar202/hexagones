from flask import Flask, request, jsonify
from flask_cors import CORS
import os
from geospatial_analyzer import GeospatialAnalyzer

app = Flask(__name__)
CORS(app)

# Configuration des chemins de données
DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'data')
DEM_PATH = os.path.join(DATA_DIR, 'DEM', 'DEM_Projected.tif')
VECTOR_DIR = os.path.join(DATA_DIR, 'Vector')

# Initialisation de l'analyseur avec gestion d'erreur
try:
    analyzer = GeospatialAnalyzer(DEM_PATH, VECTOR_DIR)
    print(f"✅ Analyseur initialisé avec succès")
    print(f"   DEM: {DEM_PATH}")
    print(f"   Vector: {VECTOR_DIR}")
except Exception as e:
    print(f"❌ Erreur lors de l'initialisation de l'analyseur: {e}")
    analyzer = None

@app.route('/api/analyze', methods=['POST'])
def analyze():
    """
    Endpoint pour lancer une analyse géospatiale
    """
    try:
        if analyzer is None:
            return jsonify({'error': 'Analyseur non initialisé. Vérifiez les fichiers de données.'}), 500
        
        data = request.get_json()
        if not data:
            return jsonify({'error': 'Données JSON manquantes'}), 400
            
        latitude = float(data.get('latitude'))
        longitude = float(data.get('longitude'))
        radius_km = float(data.get('radius_km', 2.0))

        # Validation des paramètres
        if not (-90 <= latitude <= 90):
            return jsonify({'error': 'Latitude invalide'}), 400
        if not (-180 <= longitude <= 180):
            return jsonify({'error': 'Longitude invalide'}), 400
        if not (0.5 <= radius_km <= 10):
            return jsonify({'error': 'Rayon doit être entre 0.5 et 10 km'}), 400

        # Exécution de l'analyse
        results = analyzer.analyze_hexagon(latitude, longitude, radius_km)

        return jsonify(results), 200

    except Exception as e:
        print(f"Erreur dans /api/analyze: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

@app.route('/api/hexagon-geojson', methods=['GET'])
def get_hexagon_geojson():
    """
    Endpoint pour obtenir la géométrie de l'hexagone en GeoJSON
    """
    try:
        latitude = float(request.args.get('lat'))
        longitude = float(request.args.get('lon'))
        radius_km = float(request.args.get('radius', 2.0))

        geojson = analyzer.get_hexagon_geojson(latitude, longitude, radius_km)

        return jsonify(geojson), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/health', methods=['GET'])
def health():
    """
    Endpoint de santé pour vérifier que l'API fonctionne
    """
    status = {
        'status': 'ok',
        'message': 'API fonctionnelle',
        'analyzer_initialized': analyzer is not None
    }
    return jsonify(status), 200

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)


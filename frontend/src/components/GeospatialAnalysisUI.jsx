import React, { useState, useEffect } from 'react';
import { MapPin, Layers, TrendingUp, Droplet, Building, Navigation, Mountain, Settings, Play, Download, Info } from 'lucide-react';
import InteractiveMap from './InteractiveMap';

const GeospatialAnalysisUI = () => {
  const [activeTab, setActiveTab] = useState('config');
  const [coordinates, setCoordinates] = useState({ lat: 36.447451, lon: 4.228459 });
  const [radius, setRadius] = useState(2);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState(null);

  // Fonction pour vérifier la connexion au backend
  const checkBackendConnection = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/health');
      return response.ok;
    } catch (error) {
      return false;
    }
  };

  // Fonction pour lancer l'analyse via l'API
  const runAnalysis = async () => {
    setIsAnalyzing(true);
    setProgress(0);
    setActiveTab('results');

    try {
      // Vérifier d'abord si le backend est accessible
      const isBackendAvailable = await checkBackendConnection();
      if (!isBackendAvailable) {
        throw new Error('Le serveur backend n\'est pas accessible. Assurez-vous que le serveur Flask est démarré sur http://localhost:5000');
      }

      const response = await fetch('http://localhost:5000/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          latitude: coordinates.lat,
          longitude: coordinates.lon,
          radius_km: radius
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Erreur inconnue' }));
        throw new Error(errorData.error || `Erreur HTTP ${response.status}`);
      }

      const data = await response.json();
      setResults(data);
      setIsAnalyzing(false);
      setProgress(100);
    } catch (error) {
      console.error('Erreur:', error);
      setIsAnalyzing(false);
      setProgress(0);
      
      // Message d'erreur plus détaillé
      let errorMessage = error.message;
      if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
        errorMessage = 'Impossible de se connecter au serveur backend.\n\n' +
                      'Vérifiez que :\n' +
                      '1. Le serveur Flask est démarré (python app.py)\n' +
                      '2. Le serveur écoute sur http://localhost:5000\n' +
                      '3. Aucun pare-feu ne bloque la connexion';
      }
      
      alert('Erreur lors de l\'analyse:\n\n' + errorMessage);
    }
  };

  const formatNumber = (num) => {
    return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 }).format(num);
  };

  const getLandUseColor = (type) => {
    const colors = {
      forest: '#22c55e',
      residential: '#f59e0b',
      farmland: '#fbbf24',
      commercial: '#ef4444',
      industrial: '#6366f1'
    };
    return colors[type] || '#94a3b8';
  };

  const exportCSV = () => {
    if (!results) return;
    
    const csvContent = [
      ['Métrique', 'Valeur', 'Unité'],
      ['Élévation Minimum', results.elevation_min, 'm'],
      ['Élévation Moyenne', results.elevation_mean, 'm'],
      ['Élévation Maximum', results.elevation_max, 'm'],
      ['Longueur Routes', results.total_road_length_m, 'm'],
      ['Densité Bâtie', results.building_density, ''],
      ['Surface Bâtie', results.total_building_area_sq_m, 'm²'],
      ['Pourcentage Eau', results.water_percentage, '%'],
      ['Surface Eau', results.water_area_sq_m, 'm²'],
      ['Usage Dominant', results.dominant_landuse, ''],
      ['Surface Hexagone', results.hexagon_area_sq_km, 'km²']
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `analyse_geospatiale_${Date.now()}.csv`;
    link.click();
  };

  const exportGeoJSON = async () => {
    try {
      const response = await fetch(`http://localhost:5000/api/hexagon-geojson?lat=${coordinates.lat}&lon=${coordinates.lon}&radius=${radius}`);
      const geojson = await response.json();
      
      const blob = new Blob([JSON.stringify(geojson, null, 2)], { type: 'application/json' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `hexagone_${Date.now()}.geojson`;
      link.click();
    } catch (error) {
      console.error('Erreur export GeoJSON:', error);
      alert('Erreur lors de l\'export GeoJSON');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 text-white">
      {/* Header */}
      <header className="bg-black/30 backdrop-blur-md border-b border-white/10">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/20 rounded-lg">
                <Layers className="w-6 h-6 text-blue-400" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">Analyse Géospatiale</h1>
                <p className="text-sm text-slate-400">Système d'analyse territoriale par hexagones</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg transition flex items-center gap-2">
                <Info className="w-4 h-4" />
                Documentation
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div className="container mx-auto px-6 py-4">
        <div className="flex gap-2 bg-black/20 p-1 rounded-lg w-fit">
          <button
            onClick={() => setActiveTab('config')}
            className={`px-6 py-2 rounded-lg transition ${
              activeTab === 'config'
                ? 'bg-blue-500 text-white'
                : 'text-slate-300 hover:bg-white/5'
            }`}
          >
            <Settings className="w-4 h-4 inline mr-2" />
            Configuration
          </button>
          <button
            onClick={() => setActiveTab('results')}
            className={`px-6 py-2 rounded-lg transition ${
              activeTab === 'results'
                ? 'bg-blue-500 text-white'
                : 'text-slate-300 hover:bg-white/5'
            }`}
          >
            <TrendingUp className="w-4 h-4 inline mr-2" />
            Résultats
          </button>
          <button
            onClick={() => setActiveTab('map')}
            className={`px-6 py-2 rounded-lg transition ${
              activeTab === 'map'
                ? 'bg-blue-500 text-white'
                : 'text-slate-300 hover:bg-white/5'
            }`}
          >
            <MapPin className="w-4 h-4 inline mr-2" />
            Carte
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-6 pb-8">
        {/* Configuration Tab */}
        {activeTab === 'config' && (
          <div className="grid md:grid-cols-2 gap-6">
            {/* Left Column - Parameters */}
            <div className="space-y-6">
              {/* Coordinates Card */}
              <div className="bg-white/5 backdrop-blur-md rounded-xl p-6 border border-white/10">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-blue-400" />
                  Coordonnées du Centre
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm text-slate-400 mb-2">Latitude</label>
                    <input
                      type="number"
                      value={coordinates.lat}
                      onChange={(e) => setCoordinates({...coordinates, lat: parseFloat(e.target.value)})}
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-blue-500 transition"
                      step="0.000001"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-slate-400 mb-2">Longitude</label>
                    <input
                      type="number"
                      value={coordinates.lon}
                      onChange={(e) => setCoordinates({...coordinates, lon: parseFloat(e.target.value)})}
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-blue-500 transition"
                      step="0.000001"
                    />
                  </div>
                </div>
              </div>

              {/* Radius Card */}
              <div className="bg-white/5 backdrop-blur-md rounded-xl p-6 border border-white/10">
                <h3 className="text-lg font-semibold mb-4">Rayon de l'Hexagone</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Rayon:</span>
                    <span className="text-2xl font-bold text-blue-400">{radius} km</span>
                  </div>
                  <input
                    type="range"
                    min="0.5"
                    max="10"
                    step="0.5"
                    value={radius}
                    onChange={(e) => setRadius(parseFloat(e.target.value))}
                    className="w-full accent-blue-500"
                  />
                  <div className="flex justify-between text-xs text-slate-500">
                    <span>0.5 km</span>
                    <span>10 km</span>
                  </div>
                  <div className="mt-4 p-3 bg-blue-500/10 rounded-lg border border-blue-500/20">
                    <p className="text-sm text-blue-300">
                      Surface estimée: <span className="font-semibold">{formatNumber(2.598 * radius * radius)} km²</span>
                    </p>
                  </div>
                </div>
              </div>

              {/* Data Sources Card */}
              <div className="bg-white/5 backdrop-blur-md rounded-xl p-6 border border-white/10">
                <h3 className="text-lg font-semibold mb-4">Sources de Données</h3>
                <div className="space-y-3">
                  {[
                    { name: 'DEM (Modèle Numérique d\'Élévation)', enabled: true },
                    { name: 'Occupation du Sol', enabled: true },
                    { name: 'Zones d\'Eau', enabled: true },
                    { name: 'Cours d\'Eau', enabled: true },
                    { name: 'Routes', enabled: true },
                    { name: 'Bâtiments', enabled: true }
                  ].map((source, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                      <span className="text-sm">{source.name}</span>
                      <div className={`px-3 py-1 rounded-full text-xs ${
                        source.enabled 
                          ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                          : 'bg-red-500/20 text-red-400 border border-red-500/30'
                      }`}>
                        {source.enabled ? 'Activé' : 'Désactivé'}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Column - Preview & Action */}
            <div className="space-y-6">
              {/* Hexagon Preview */}
              <div className="bg-white/5 backdrop-blur-md rounded-xl p-6 border border-white/10">
                <h3 className="text-lg font-semibold mb-4">Aperçu de l'Hexagone</h3>
                <div className="aspect-square bg-gradient-to-br from-blue-900/30 to-purple-900/30 rounded-lg flex items-center justify-center relative overflow-hidden">
                  {/* Simplified hexagon visualization */}
                  <svg width="200" height="200" viewBox="0 0 200 200" className="animate-pulse">
                    <polygon
                      points="100,20 170,60 170,140 100,180 30,140 30,60"
                      fill="rgba(59, 130, 246, 0.2)"
                      stroke="rgba(59, 130, 246, 0.8)"
                      strokeWidth="2"
                    />
                    <circle cx="100" cy="100" r="3" fill="#60a5fa" />
                    <text x="100" y="105" textAnchor="middle" fill="#60a5fa" fontSize="10">
                      Centre
                    </text>
                  </svg>
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <div className="p-3 bg-white/5 rounded-lg">
                    <p className="text-slate-400 text-xs">Latitude</p>
                    <p className="font-semibold">{coordinates.lat.toFixed(6)}°</p>
                  </div>
                  <div className="p-3 bg-white/5 rounded-lg">
                    <p className="text-slate-400 text-xs">Longitude</p>
                    <p className="font-semibold">{coordinates.lon.toFixed(6)}°</p>
                  </div>
                </div>
              </div>

              {/* Analysis Button */}
              <div className="bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl p-6 border border-white/20">
                <h3 className="text-lg font-semibold mb-2">Lancer l'Analyse</h3>
                <p className="text-sm text-blue-100 mb-4">
                  L'analyse calculera les métriques d'élévation, d'infrastructure, d'hydrographie et d'occupation du sol.
                </p>
                <button
                  onClick={runAnalysis}
                  disabled={isAnalyzing}
                  className="w-full py-4 bg-white text-blue-600 font-semibold rounded-lg hover:bg-blue-50 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <Play className="w-5 h-5" />
                  {isAnalyzing ? 'Analyse en cours...' : 'Démarrer l\'Analyse'}
                </button>
              </div>

              {/* Info Card */}
              <div className="bg-white/5 backdrop-blur-md rounded-xl p-6 border border-white/10">
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <Info className="w-5 h-5 text-yellow-400" />
                  Informations
                </h3>
                <ul className="space-y-2 text-sm text-slate-300">
                  <li className="flex gap-2">
                    <span className="text-blue-400">•</span>
                    <span>L'hexagone utilise un CRS projeté pour des calculs précis</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-blue-400">•</span>
                    <span>Toutes les mesures sont en mètres (longueur, surface)</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-blue-400">•</span>
                    <span>Les cours d'eau utilisent des buffers intelligents</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-blue-400">•</span>
                    <span>Temps d'analyse typique: 5-15 secondes</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Results Tab */}
        {activeTab === 'results' && (
          <div className="space-y-6">
            {isAnalyzing && (
              <div className="bg-white/5 backdrop-blur-md rounded-xl p-8 border border-white/10 text-center">
                <div className="w-16 h-16 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-lg font-semibold mb-2">Analyse en cours...</p>
                <p className="text-slate-400 mb-4">Traitement des données géospatiales</p>
                <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  ></div>
                </div>
                <p className="text-sm text-slate-400 mt-2">{progress}%</p>
              </div>
            )}

            {results && !isAnalyzing && (
              <>
                {/* Summary Cards */}
                <div className="grid md:grid-cols-4 gap-4">
                  <div className="bg-gradient-to-br from-blue-500/20 to-blue-600/20 rounded-xl p-6 border border-blue-500/30">
                    <Mountain className="w-8 h-8 text-blue-400 mb-3" />
                    <p className="text-sm text-slate-400">Élévation Moyenne</p>
                    <p className="text-3xl font-bold">{formatNumber(results.elevation_mean)}</p>
                    <p className="text-sm text-slate-400">mètres</p>
                  </div>
                  <div className="bg-gradient-to-br from-green-500/20 to-green-600/20 rounded-xl p-6 border border-green-500/30">
                    <Droplet className="w-8 h-8 text-green-400 mb-3" />
                    <p className="text-sm text-slate-400">Couverture en Eau</p>
                    <p className="text-3xl font-bold">{formatNumber(results.water_percentage)}%</p>
                    <p className="text-sm text-slate-400">de la surface</p>
                  </div>
                  <div className="bg-gradient-to-br from-orange-500/20 to-orange-600/20 rounded-xl p-6 border border-orange-500/30">
                    <Building className="w-8 h-8 text-orange-400 mb-3" />
                    <p className="text-sm text-slate-400">Densité Bâtie</p>
                    <p className="text-3xl font-bold">{(results.building_density * 100).toFixed(2)}%</p>
                    <p className="text-sm text-slate-400">d'imperméabilisation</p>
                  </div>
                  <div className="bg-gradient-to-br from-purple-500/20 to-purple-600/20 rounded-xl p-6 border border-purple-500/30">
                    <Navigation className="w-8 h-8 text-purple-400 mb-3" />
                    <p className="text-sm text-slate-400">Longueur Routes</p>
                    <p className="text-3xl font-bold">{formatNumber(results.total_road_length_m / 1000)}</p>
                    <p className="text-sm text-slate-400">kilomètres</p>
                  </div>
                </div>

                {/* Detailed Results */}
                <div className="grid md:grid-cols-2 gap-6">
                  {/* Elevation Details */}
                  <div className="bg-white/5 backdrop-blur-md rounded-xl p-6 border border-white/10">
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <Mountain className="w-5 h-5 text-blue-400" />
                      Statistiques d'Élévation
                    </h3>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center p-3 bg-white/5 rounded-lg">
                        <span className="text-slate-400">Minimum</span>
                        <span className="font-semibold">{formatNumber(results.elevation_min)} m</span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-blue-500/10 rounded-lg border border-blue-500/30">
                        <span className="text-slate-400">Moyenne</span>
                        <span className="font-semibold text-blue-400">{formatNumber(results.elevation_mean)} m</span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-white/5 rounded-lg">
                        <span className="text-slate-400">Maximum</span>
                        <span className="font-semibold">{formatNumber(results.elevation_max)} m</span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-white/5 rounded-lg">
                        <span className="text-slate-400">Dénivelé</span>
                        <span className="font-semibold">{formatNumber(results.elevation_max - results.elevation_min)} m</span>
                      </div>
                    </div>
                  </div>

                  {/* Land Use */}
                  <div className="bg-white/5 backdrop-blur-md rounded-xl p-6 border border-white/10">
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <Layers className="w-5 h-5 text-green-400" />
                      Occupation du Sol
                    </h3>
                    <div className="mb-4 p-4 bg-green-500/10 rounded-lg border border-green-500/30">
                      <p className="text-sm text-slate-400 mb-1">Usage Dominant</p>
                      <p className="text-xl font-semibold text-green-400 capitalize">{results.dominant_landuse}</p>
                      <p className="text-sm text-slate-400 mt-1">{formatNumber(results.dominant_landuse_percentage)}% de couverture</p>
                    </div>
                    <div className="space-y-2">
                      {Object.entries(results.landuse_breakdown).map(([type, area]) => {
                        const total = Object.values(results.landuse_breakdown).reduce((a, b) => a + b, 0);
                        const percentage = (area / total) * 100;
                        return (
                          <div key={type} className="space-y-1">
                            <div className="flex justify-between text-sm">
                              <span className="capitalize">{type}</span>
                              <span className="text-slate-400">{formatNumber(percentage)}%</span>
                            </div>
                            <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
                              <div
                                className="h-full transition-all duration-300"
                                style={{
                                  width: `${percentage}%`,
                                  backgroundColor: getLandUseColor(type)
                                }}
                              ></div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Infrastructure */}
                  <div className="bg-white/5 backdrop-blur-md rounded-xl p-6 border border-white/10">
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <Building className="w-5 h-5 text-orange-400" />
                      Infrastructure
                    </h3>
                    <div className="space-y-3">
                      <div className="p-4 bg-orange-500/10 rounded-lg border border-orange-500/30">
                        <p className="text-sm text-slate-400 mb-1">Surface Bâtie Totale</p>
                        <p className="text-2xl font-semibold text-orange-400">
                          {formatNumber(results.total_building_area_sq_m / 10000)} ha
                        </p>
                      </div>
                      <div className="p-4 bg-white/5 rounded-lg">
                        <p className="text-sm text-slate-400 mb-1">Densité de Construction</p>
                        <p className="text-2xl font-semibold">{(results.building_density * 100).toFixed(3)}%</p>
                        <p className="text-xs text-slate-500 mt-1">
                          {results.building_density < 0.05 ? 'Zone rurale/agricole' :
                           results.building_density < 0.15 ? 'Zone périurbaine' :
                           results.building_density < 0.30 ? 'Zone résidentielle' :
                           'Zone urbaine dense'}
                        </p>
                      </div>
                      <div className="p-4 bg-purple-500/10 rounded-lg border border-purple-500/30">
                        <p className="text-sm text-slate-400 mb-1">Réseau Routier</p>
                        <p className="text-2xl font-semibold text-purple-400">
                          {formatNumber(results.total_road_length_m / 1000)} km
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Hydrology */}
                  <div className="bg-white/5 backdrop-blur-md rounded-xl p-6 border border-white/10">
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <Droplet className="w-5 h-5 text-blue-400" />
                      Hydrographie
                    </h3>
                    <div className="space-y-3">
                      <div className="p-4 bg-blue-500/10 rounded-lg border border-blue-500/30">
                        <p className="text-sm text-slate-400 mb-1">Pourcentage d'Eau</p>
                        <p className="text-2xl font-semibold text-blue-400">{formatNumber(results.water_percentage)}%</p>
                      </div>
                      <div className="p-4 bg-white/5 rounded-lg">
                        <p className="text-sm text-slate-400 mb-1">Surface en Eau</p>
                        <p className="text-2xl font-semibold">
                          {formatNumber(results.water_area_sq_m / 10000)} ha
                        </p>
                      </div>
                      <div className="p-4 bg-white/5 rounded-lg">
                        <p className="text-sm text-slate-400 mb-1">Classification</p>
                        <p className="text-lg font-semibold">
                          {results.water_percentage < 1 ? '🏜️ Zone sèche' :
                           results.water_percentage < 5 ? '💧 Présence ponctuelle' :
                           results.water_percentage < 10 ? '🌊 Zone humide' :
                           '🏞️ Zone très humide'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Area Info */}
                <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-xl p-6 border border-white/10">
                  <div className="grid md:grid-cols-3 gap-6">
                    <div>
                      <p className="text-sm text-slate-400 mb-1">Surface Analysée</p>
                      <p className="text-2xl font-bold">{formatNumber(results.hexagon_area_sq_km)} km²</p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-400 mb-1">Coordonnées Centre</p>
                      <p className="text-lg font-semibold">{coordinates.lat.toFixed(6)}°, {coordinates.lon.toFixed(6)}°</p>
                    </div>
                    <div className="flex items-center justify-end gap-3">
                      <button 
                        onClick={exportCSV}
                        className="px-4 py-2 bg-blue-500 hover:bg-blue-600 rounded-lg transition flex items-center gap-2"
                      >
                        <Download className="w-4 h-4" />
                        Exporter CSV
                      </button>
                      <button 
                        onClick={exportGeoJSON}
                        className="px-4 py-2 bg-purple-500 hover:bg-purple-600 rounded-lg transition flex items-center gap-2"
                      >
                        <Download className="w-4 h-4" />
                        Exporter GeoJSON
                      </button>
                    </div>
                  </div>
                </div>
              </>
            )}

            {!results && !isAnalyzing && (
              <div className="bg-white/5 backdrop-blur-md rounded-xl p-12 border border-white/10 text-center">
                <TrendingUp className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                <p className="text-lg text-slate-400">Aucune analyse disponible</p>
                <p className="text-sm text-slate-500 mt-2">Configurez les paramètres et lancez une analyse</p>
              </div>
            )}
          </div>
        )}

        {/* Map Tab */}
        {activeTab === 'map' && (
          <div className="space-y-6">
            {/* Instructions */}
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
              <p className="text-sm text-blue-300 flex items-center gap-2">
                <Info className="w-4 h-4" />
                💡 Cliquez sur la carte pour déplacer le centre de l'hexagone. Double-cliquez sur l'hexagone pour zoomer.
              </p>
            </div>

            {/* Carte Interactive */}
            <div className="bg-white/5 backdrop-blur-md rounded-xl p-6 border border-white/10">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-blue-400" />
                Carte Interactive
              </h3>
              <InteractiveMap
                coordinates={coordinates}
                radius={radius}
                onCoordinateChange={(newCoords) => {
                  setCoordinates(newCoords);
                }}
                results={results}
              />
            </div>

            {/* Informations complémentaires */}
            <div className="grid md:grid-cols-3 gap-4">
              <div className="bg-white/5 backdrop-blur-md rounded-xl p-4 border border-white/10">
                <p className="text-sm text-slate-400 mb-1">Position Actuelle</p>
                <p className="font-mono text-sm text-blue-400">{coordinates.lat.toFixed(6)}°</p>
                <p className="font-mono text-sm text-blue-400">{coordinates.lon.toFixed(6)}°</p>
              </div>
              <div className="bg-white/5 backdrop-blur-md rounded-xl p-4 border border-white/10">
                <p className="text-sm text-slate-400 mb-1">Rayon Hexagone</p>
                <p className="text-2xl font-bold text-blue-400">{radius} km</p>
                <p className="text-xs text-slate-500 mt-1">Surface: {formatNumber(2.598 * radius * radius)} km²</p>
              </div>
              {results && (
                <div className="bg-white/5 backdrop-blur-md rounded-xl p-4 border border-white/10">
                  <p className="text-sm text-slate-400 mb-1">Surface Analysée</p>
                  <p className="text-2xl font-bold text-green-400">{formatNumber(results.hexagon_area_sq_km)} km²</p>
                  <p className="text-xs text-slate-500 mt-1">Dernière analyse disponible</p>
                </div>
              )}
            </div>

            {/* Résultats rapides si disponibles */}
            {results && (
              <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-xl p-6 border border-white/10">
                <h3 className="text-lg font-semibold mb-4">Résultats de l'Analyse</h3>
                <div className="grid md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-sm text-slate-400 mb-1">Élévation Moyenne</p>
                    <p className="text-xl font-bold text-blue-400">{formatNumber(results.elevation_mean)} m</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-400 mb-1">Couverture en Eau</p>
                    <p className="text-xl font-bold text-green-400">{formatNumber(results.water_percentage)}%</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-400 mb-1">Densité Bâtie</p>
                    <p className="text-xl font-bold text-orange-400">{formatNumber((results.building_density * 100))}%</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-400 mb-1">Longueur Routes</p>
                    <p className="text-xl font-bold text-purple-400">{formatNumber(results.total_road_length_m / 1000)} km</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="container mx-auto px-6 py-6 border-t border-white/10 mt-8">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-slate-400">
          <div>
            <p>© 2024 Système d'Analyse Géospatiale - Technologie Hexagonale</p>
          </div>
          <div className="flex gap-6">
            <a href="#" className="hover:text-blue-400 transition">Documentation</a>
            <a href="#" className="hover:text-blue-400 transition">API Reference</a>
            <a href="#" className="hover:text-blue-400 transition">Support</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default GeospatialAnalysisUI;


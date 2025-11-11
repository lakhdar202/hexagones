/**
 * Utilitaires pour les calculs géométriques d'hexagones
 */

/**
 * Génère les coordonnées géographiques des sommets de l'hexagone
 * @param {number} centerLat - Latitude du centre (degrés)
 * @param {number} centerLon - Longitude du centre (degrés)
 * @param {number} radiusKm - Rayon en kilomètres
 * @returns {Array<[lat, lon]>} - Tableau de 7 coordonnées (fermé)
 */
export function generateHexagonCoordinates(centerLat, centerLon, radiusKm) {
  const radiusMeters = radiusKm * 1000;
  const earthRadius = 6371000; // mètres
  
  const vertices = [];
  
  for (let i = 0; i < 6; i++) {
    const angleDeg = 60 * i - 30; // Flat-top hexagon
    const angleRad = (angleDeg * Math.PI) / 180;
    
    // Calcul offset en degrés (approximation pour petites distances)
    const latOffset = (radiusMeters * Math.sin(angleRad)) / earthRadius * (180 / Math.PI);
    const lonOffset = (radiusMeters * Math.cos(angleRad)) / 
                      (earthRadius * Math.cos(centerLat * Math.PI / 180)) * (180 / Math.PI);
    
    vertices.push([
      centerLat + latOffset,
      centerLon + lonOffset
    ]);
  }
  
  // Fermer le polygone
  vertices.push(vertices[0]);
  
  return vertices;
}

/**
 * Calcule la surface d'un hexagone en km²
 * @param {number} radiusKm - Rayon en kilomètres
 * @returns {number} - Surface en km²
 */
export function calculateHexagonArea(radiusKm) {
  // Formule: (3 * sqrt(3) / 2) * r²
  return 2.598 * radiusKm * radiusKm;
}


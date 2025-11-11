import os
import geopandas as gpd
import rasterio
from rasterio.mask import mask
from shapely.geometry import Point, Polygon
import numpy as np
from pyproj import Transformer
import math
import pandas as pd


def create_hexagon_projected(center_x, center_y, radius_m=2000, crs="EPSG:32631"):
    """
    Create a hexagon around a center point with given radius in meters in projected CRS
    """
    # Create hexagon vertices
    vertices = []
    for i in range(6):
        angle_deg = 60 * i - 30  # Start at -30 degrees to have flat top/bottom
        angle_rad = math.radians(angle_deg)
        
        x = center_x + radius_m * math.cos(angle_rad)
        y = center_y + radius_m * math.sin(angle_rad)
        vertices.append((x, y))
    
    # Close the polygon
    vertices.append(vertices[0])
    
    return Polygon(vertices)


class GeospatialAnalyzer:
    """
    Classe pour effectuer des analyses géospatiales sur des hexagones
    """
    
    def __init__(self, dem_path, vector_dir):
        """
        Initialise l'analyseur avec les chemins des données
        
        Args:
            dem_path: Chemin vers le fichier DEM (raster)
            vector_dir: Répertoire contenant les fichiers shapefile
        """
        self.dem_path = dem_path
        self.vector_dir = vector_dir
        
        # Chemins des fichiers vectoriels
        self.water_zones_path = os.path.join(vector_dir, 'water_zones.shp')
        self.water_ways_path = os.path.join(vector_dir, 'water_ways.shp')
        
        # Chargement des données vectorielles
        try:
            self.buildings = gpd.read_file(os.path.join(vector_dir, 'buildings.shp'))
        except:
            self.buildings = None
            print("Could not load buildings shapefile")
        
        try:
            self.roads = gpd.read_file(os.path.join(vector_dir, 'roads.shp'))
        except:
            self.roads = None
            print("Could not load roads shapefile")
        
        try:
            self.landuse = gpd.read_file(os.path.join(vector_dir, 'landuse.shp'))
        except:
            self.landuse = None
            print("Could not load landuse shapefile")
    
    def analyze_hexagon(self, center_lat, center_lon, radius_km):
        """
        Effectue une analyse complète de l'hexagone
        
        Args:
            center_lat: Latitude du centre
            center_lon: Longitude du centre
            radius_km: Rayon en kilomètres
        
        Returns:
            dict: Résultats complets de l'analyse
        """
        results = {}
        
        try:
            with rasterio.open(self.dem_path) as dem_dataset:
                print(f"DEM CRS: {dem_dataset.crs}")
                print(f"DEM Bounds: {dem_dataset.bounds}")
                
                # Transform geographic coordinates to projected coordinates
                transformer = Transformer.from_crs("EPSG:4326", dem_dataset.crs)
                center_x, center_y = transformer.transform(center_lat, center_lon)
                print(f"Center in projected CRS: ({center_x:.2f}, {center_y:.2f})")
                
                # Create hexagon directly in projected CRS
                hexagon = create_hexagon_projected(center_x, center_y, radius_m=radius_km*1000, crs=dem_dataset.crs)
                hexagon_gdf_projected = gpd.GeoDataFrame([1], geometry=[hexagon], crs=dem_dataset.crs)
                
                print(f"Hexagon Bounds (projected): {hexagon_gdf_projected.total_bounds}")
                
                # Check if hexagon overlaps with DEM
                dem_bounds = dem_dataset.bounds
                hex_bounds_projected = hexagon_gdf_projected.total_bounds
                
                # Simple bounds check
                if (hex_bounds_projected[0] > dem_bounds[2] or hex_bounds_projected[2] < dem_bounds[0] or 
                    hex_bounds_projected[1] > dem_bounds[3] or hex_bounds_projected[3] < dem_bounds[1]):
                    print("ERROR: Hexagon does not overlap with DEM bounds!")
                    print(f"DEM bounds: {dem_bounds}")
                    print(f"Hexagon bounds: {hex_bounds_projected}")
                    
                    # Let's try using the DEM center instead
                    dem_center_x = (dem_bounds.left + dem_bounds.right) / 2
                    dem_center_y = (dem_bounds.bottom + dem_bounds.top) / 2
                    print(f"Trying DEM center instead: ({dem_center_x:.2f}, {dem_center_y:.2f})")
                    
                    hexagon = create_hexagon_projected(dem_center_x, dem_center_y, radius_m=radius_km*1000, crs=dem_dataset.crs)
                    hexagon_gdf_projected = gpd.GeoDataFrame([1], geometry=[hexagon], crs=dem_dataset.crs)
                    print(f"New hexagon bounds: {hexagon_gdf_projected.total_bounds}")
                
                # 1. ELEVATION ANALYSIS
                try:
                    # Mask DEM with hexagon
                    out_image, out_transform = mask(
                        dem_dataset, 
                        hexagon_gdf_projected.geometry, 
                        crop=True, 
                        filled=False,
                        all_touched=True
                    )
                    
                    # Remove no-data values
                    elevation_data = out_image[0]
                    valid_elevations = elevation_data[elevation_data != dem_dataset.nodata]
                    
                    if len(valid_elevations) > 0:
                        results['elevation_min'] = float(np.min(valid_elevations))
                        results['elevation_mean'] = float(np.mean(valid_elevations))
                        results['elevation_max'] = float(np.max(valid_elevations))
                        print(f"Elevation stats: min={results['elevation_min']:.2f}, mean={results['elevation_mean']:.2f}, max={results['elevation_max']:.2f}")
                    else:
                        results['elevation_min'] = 0.0
                        results['elevation_mean'] = 0.0
                        results['elevation_max'] = 0.0
                        print("No valid elevation data found in hexagon")
                    
                except Exception as e:
                    print(f"Error processing DEM elevation: {e}")
                    results['elevation_min'] = 0.0
                    results['elevation_mean'] = 0.0
                    results['elevation_max'] = 0.0
                
                projected_crs = dem_dataset.crs
                
        except Exception as e:
            print(f"Error opening DEM: {e}")
            return results
        
        # 2. ROADS LENGTH ANALYSIS (using projected CRS)
        if self.roads is not None:
            try:
                # Ensure roads are in projected CRS
                if self.roads.crs != projected_crs:
                    roads_gdf_proj = self.roads.to_crs(projected_crs)
                else:
                    roads_gdf_proj = self.roads
                
                # Intersect roads with hexagon
                roads_in_hexagon = gpd.overlay(roads_gdf_proj, hexagon_gdf_projected, how='intersection')
                
                if len(roads_in_hexagon) > 0:
                    # Calculate total length in meters (accurate in projected CRS)
                    total_road_length = roads_in_hexagon.geometry.length.sum()
                    results['total_road_length_m'] = float(total_road_length)
                    print(f"Total road length: {results['total_road_length_m']:.2f} m")
                else:
                    results['total_road_length_m'] = 0
                    print("No roads found in hexagon")
                
            except Exception as e:
                print(f"Error processing roads: {e}")
                results['total_road_length_m'] = 0
        else:
            results['total_road_length_m'] = 0
            print("No roads data provided")
        
        # 3. BUILDINGS DENSITY ANALYSIS (using projected CRS)
        if self.buildings is not None:
            try:
                # Ensure buildings are in projected CRS
                if self.buildings.crs != projected_crs:
                    buildings_gdf_proj = self.buildings.to_crs(projected_crs)
                else:
                    buildings_gdf_proj = self.buildings
                
                # Intersect buildings with hexagon
                buildings_in_hexagon = gpd.overlay(buildings_gdf_proj, hexagon_gdf_projected, how='intersection')
                
                if len(buildings_in_hexagon) > 0:
                    # Calculate building area and density (accurate in projected CRS)
                    total_building_area = buildings_in_hexagon.geometry.area.sum()
                    hexagon_area = hexagon_gdf_projected.geometry.area.iloc[0]
                    building_density = total_building_area / hexagon_area if hexagon_area > 0 else 0
                    
                    results['building_density'] = float(building_density)
                    results['total_building_area_sq_m'] = float(total_building_area)
                    print(f"Building density: {results['building_density']:.4f}, total area: {results['total_building_area_sq_m']:.2f} sq m")
                else:
                    results['building_density'] = 0
                    results['total_building_area_sq_m'] = 0
                    print("No buildings found in hexagon")
                
            except Exception as e:
                print(f"Error processing buildings: {e}")
                results['building_density'] = 0
                results['total_building_area_sq_m'] = 0
        else:
            results['building_density'] = 0
            results['total_building_area_sq_m'] = 0
            print("No buildings data provided")
        
        # 4. WATER PERCENTAGE ANALYSIS (using projected CRS)
        try:
            # Load water data from both files
            water_zones_gdf = gpd.read_file(self.water_zones_path)
            water_ways_gdf = gpd.read_file(self.water_ways_path)
            
            # Ensure water data has same projected CRS
            if water_zones_gdf.crs != projected_crs:
                water_zones_gdf = water_zones_gdf.to_crs(projected_crs)
            if water_ways_gdf.crs != projected_crs:
                water_ways_gdf = water_ways_gdf.to_crs(projected_crs)
            
            total_water_area = 0
            
            # Process water zones (typically polygons - lakes, reservoirs, etc.)
            if len(water_zones_gdf) > 0:
                water_zones_in_hexagon = gpd.overlay(water_zones_gdf, hexagon_gdf_projected, how='intersection')
                if len(water_zones_in_hexagon) > 0:
                    total_water_area += water_zones_in_hexagon.geometry.area.sum()
                    print(f"Found {len(water_zones_in_hexagon)} water zones in hexagon")
            
            # Process water ways (typically lines - rivers, streams, canals)
            if len(water_ways_gdf) > 0:
                water_ways_in_hexagon = gpd.overlay(water_ways_gdf, hexagon_gdf_projected, how='intersection')
                
                if len(water_ways_in_hexagon) > 0:
                    # Define buffer widths for different types of water ways (in meters)
                    buffer_widths = {
                        'river': 20,      # 20 meters for rivers
                        'stream': 5,      # 5 meters for streams
                        'canal': 10,      # 10 meters for canals
                        'drain': 2,       # 2 meters for drains
                        'default': 5      # default buffer width
                    }
                    
                    for idx, water_way in water_ways_in_hexagon.iterrows():
                        geom = water_way.geometry
                        
                        # Determine buffer width based on feature type
                        buffer_width = buffer_widths['default']
                        
                        # Check if we can determine the water way type from attributes
                        if 'fclass' in water_way:
                            water_type = water_way['fclass'].lower()
                            for key in buffer_widths:
                                if key in water_type:
                                    buffer_width = buffer_widths[key]
                                    break
                        elif 'type' in water_way:
                            water_type = water_way['type'].lower()
                            for key in buffer_widths:
                                if key in water_type:
                                    buffer_width = buffer_widths[key]
                                    break
                        
                        # Create buffer and calculate area
                        if geom.geom_type in ['LineString', 'MultiLineString']:
                            buffered_area = geom.buffer(buffer_width).area
                            total_water_area += buffered_area
                    
                    print(f"Found {len(water_ways_in_hexagon)} water ways in hexagon")
            
            # Calculate percentage
            hexagon_area = hexagon_gdf_projected.geometry.area.iloc[0]
            water_percentage = (total_water_area / hexagon_area) * 100 if hexagon_area > 0 else 0
            
            results['water_percentage'] = float(water_percentage)
            results['water_area_sq_m'] = float(total_water_area)  # Additional metric
            print(f"Water percentage: {results['water_percentage']:.2f}%, area: {results['water_area_sq_m']:.2f} sq m")
            
        except Exception as e:
            print(f"Error processing water areas: {e}")
            results['water_percentage'] = 0
            results['water_area_sq_m'] = 0
        
        # 5. DOMINANT LAND USE ANALYSIS (using projected CRS)
        if self.landuse is not None:
            try:
                # Ensure landuse has same projected CRS
                if self.landuse.crs != projected_crs:
                    landuse_gdf_proj = self.landuse.to_crs(projected_crs)
                else:
                    landuse_gdf_proj = self.landuse
                
                # Intersect land use with hexagon
                landuse_in_hexagon = gpd.overlay(landuse_gdf_proj, hexagon_gdf_projected, how='intersection')
                
                if len(landuse_in_hexagon) > 0:
                    # Calculate area for each land use type (accurate in projected CRS)
                    landuse_in_hexagon['area'] = landuse_in_hexagon.geometry.area
                    
                    # Group by land use type and sum areas
                    # Try to find the column name for land use type
                    type_column = None
                    for col in ['fclass', 'type', 'landuse', 'TYPE', 'LANDUSE', 'class', 'CLASS']:
                        if col in landuse_in_hexagon.columns:
                            type_column = col
                            break
                    
                    if type_column:
                        landuse_areas = landuse_in_hexagon.groupby(type_column)['area'].sum()
                        
                        # Find dominant land use
                        if len(landuse_areas) > 0:
                            dominant_landuse = landuse_areas.idxmax()
                            dominant_area = landuse_areas.max()
                            total_area = landuse_areas.sum()
                            dominant_percentage = (dominant_area / total_area) * 100
                            
                            results['dominant_landuse'] = str(dominant_landuse)
                            results['dominant_landuse_percentage'] = float(dominant_percentage)
                            
                            # Convert to dict with lowercase keys for consistency
                            landuse_breakdown = {}
                            for key, value in landuse_areas.items():
                                landuse_breakdown[str(key).lower()] = float(value)
                            results['landuse_breakdown'] = landuse_breakdown
                            
                            print(f"Dominant land use: {dominant_landuse} ({dominant_percentage:.2f}%)")
                            print(f"Total land use features in hexagon: {len(landuse_in_hexagon)}")
                        else:
                            results['dominant_landuse'] = 'No data'
                            results['dominant_landuse_percentage'] = 0
                            results['landuse_breakdown'] = {}
                            print("No land use data in hexagon")
                    else:
                        results['dominant_landuse'] = 'No data'
                        results['dominant_landuse_percentage'] = 0
                        results['landuse_breakdown'] = {}
                        print("Could not find land use type column")
                else:
                    results['dominant_landuse'] = 'No data'
                    results['dominant_landuse_percentage'] = 0
                    results['landuse_breakdown'] = {}
                    print("No land use features intersect with hexagon")
                    
            except Exception as e:
                print(f"Error processing land use: {e}")
                results['dominant_landuse'] = 'Error'
                results['dominant_landuse_percentage'] = 0
                results['landuse_breakdown'] = {}
        else:
            results['dominant_landuse'] = 'No data'
            results['dominant_landuse_percentage'] = 0
            results['landuse_breakdown'] = {}
            print("No landuse data provided")
        
        # Add hexagon area to results
        results['hexagon_area_sq_km'] = float(hexagon_gdf_projected.geometry.area.iloc[0] / 1e6)  # Convert to sq km
        print(f"Hexagon area: {results['hexagon_area_sq_km']:.2f} sq km")
        
        return results
    
    def get_hexagon_geojson(self, center_lat, center_lon, radius_km):
        """
        Retourne la géométrie de l'hexagone en format GeoJSON
        
        Args:
            center_lat: Latitude du centre
            center_lon: Longitude du centre
            radius_km: Rayon en kilomètres
        
        Returns:
            dict: GeoJSON de l'hexagone
        """
        try:
            with rasterio.open(self.dem_path) as dem_dataset:
                # Transform geographic coordinates to projected coordinates
                transformer = Transformer.from_crs("EPSG:4326", dem_dataset.crs)
                center_x, center_y = transformer.transform(center_lat, center_lon)
                
                # Create hexagon directly in projected CRS
                hexagon = create_hexagon_projected(center_x, center_y, radius_m=radius_km*1000, crs=dem_dataset.crs)
                hexagon_gdf_projected = gpd.GeoDataFrame([1], geometry=[hexagon], crs=dem_dataset.crs)
                
                # Conversion en WGS84 pour le GeoJSON
                hexagon_wgs84 = hexagon_gdf_projected.to_crs("EPSG:4326")
                
                # Conversion en GeoJSON
                geojson = hexagon_wgs84.__geo_interface__
                
                return geojson
        except Exception as e:
            print(f"Error creating hexagon GeoJSON: {e}")
            return None

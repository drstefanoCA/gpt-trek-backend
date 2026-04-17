# Richieste Di Test

## 1. Health

```text
GET /health
```

## 2. Search Tiscali

```json
POST /search_verified_routes
{
  "area": "Dorgali",
  "distance_km_max": 10,
  "keywords": ["tiscali", "lanaitto"]
}
```

## 3. Validate Source

```json
POST /validate_route_source
{
  "route_id": "route_tiscali_lanaitto_standard"
}
```

## 4. Validate Geometry

```json
POST /validate_gpx_geometry
{
  "route_id": "route_tiscali_lanaitto_standard"
}
```

## 5. Validate Waypoints

```json
POST /validate_waypoints
{
  "route_id": "route_tiscali_lanaitto_standard",
  "waypoint_set_version": "wp_tiscali_v1"
}
```

## 6. Build GPX

```json
POST /build_gpx_from_verified_route
{
  "route_id": "route_tiscali_lanaitto_standard",
  "include_waypoints": true,
  "include_metadata": true
}
```

## 7. Final Certification

```json
POST /final_certification
{
  "route_id": "route_tiscali_lanaitto_standard",
  "source_validation_status": "passed",
  "geometry_validation_status": "passed",
  "waypoint_validation_status": "passed"
}
```

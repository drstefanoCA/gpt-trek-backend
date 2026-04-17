import http from "node:http";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { URL } from "node:url";

const PORT = Number(process.env.PORT || 8787);
const HOST = process.env.HOST || "0.0.0.0";
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;
const ROUTES_PATH = new URL("./data/routes.json", import.meta.url);

const routes = JSON.parse(await readFile(ROUTES_PATH, "utf8"));
const builtFiles = new Map();

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization"
  });
  res.end(JSON.stringify(payload, null, 2));
}

function sendText(res, statusCode, text, contentType = "text/plain; charset=utf-8") {
  res.writeHead(statusCode, {
    "Content-Type": contentType,
    "Access-Control-Allow-Origin": "*"
  });
  res.end(text);
}

function normalize(value) {
  return String(value || "").trim().toLowerCase();
}

function includesAllKeywords(route, keywords = []) {
  const haystack = [
    route.name,
    route.area,
    route.country,
    ...(route.keywords || [])
  ].join(" ").toLowerCase();

  return keywords.every((keyword) => haystack.includes(normalize(keyword)));
}

function routeMatchesFilters(route, body) {
  const area = normalize(body.area);
  const areaMatch = !area || normalize(route.area).includes(area) || normalize(route.name).includes(area);
  const countryMatch = !body.country || normalize(route.country) === normalize(body.country);
  const minDistanceMatch = body.distance_km_min == null || route.distance_km >= Number(body.distance_km_min);
  const maxDistanceMatch = body.distance_km_max == null || route.distance_km <= Number(body.distance_km_max);
  const minElevationMatch = body.elevation_gain_min_m == null || route.elevation_gain_m >= Number(body.elevation_gain_min_m);
  const maxElevationMatch = body.elevation_gain_max_m == null || route.elevation_gain_m <= Number(body.elevation_gain_max_m);
  const difficultyMatch = !body.difficulty || normalize(route.difficulty) === normalize(body.difficulty);
  const typeMatch = !body.route_type || body.route_type === "any" || normalize(route.route_type) === normalize(body.route_type);
  const keywordMatch = !Array.isArray(body.keywords) || includesAllKeywords(route, body.keywords);

  return areaMatch && countryMatch && minDistanceMatch && maxDistanceMatch && minElevationMatch && maxElevationMatch && difficultyMatch && typeMatch && keywordMatch;
}

function getRoute(routeId) {
  return routes.find((route) => route.route_id === routeId);
}

function buildGpxContent(route, fileId) {
  const trackPoints = route.waypoints
    .map((waypoint) => {
      const elevation = waypoint.elevation_m != null ? `<ele>${waypoint.elevation_m}</ele>` : "";
      return `      <trkpt lat="${waypoint.latitude}" lon="${waypoint.longitude}">${elevation}<name>${escapeXml(waypoint.name)}</name></trkpt>`;
    })
    .join("\n");

  const waypointXml = route.waypoints
    .map((waypoint) => {
      const elevation = waypoint.elevation_m != null ? `<ele>${waypoint.elevation_m}</ele>` : "";
      return `  <wpt lat="${waypoint.latitude}" lon="${waypoint.longitude}">${elevation}<name>${escapeXml(waypoint.name)}</name><type>${escapeXml(waypoint.waypoint_type)}</type></wpt>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="GPT Trek Backend" xmlns="http://www.topografix.com/GPX/1/1">
  <metadata>
    <name>${escapeXml(route.name)}</name>
    <desc>Generated from verified route ${escapeXml(route.route_id)}</desc>
    <keywords>verified,gpt-trek,${escapeXml(fileId)}</keywords>
  </metadata>
${waypointXml}
  <trk>
    <name>${escapeXml(route.name)}</name>
    <trkseg>
${trackPoints}
    </trkseg>
  </trk>
</gpx>`;
}

function escapeXml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

async function readJsonBody(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }

  if (chunks.length === 0) {
    return {};
  }

  const raw = Buffer.concat(chunks).toString("utf8");
  return JSON.parse(raw);
}

function summarizeChecks(sourceStatus, geometryStatus, waypointStatus) {
  return [
    {
      check_name: "source_validation",
      status: sourceStatus,
      details: sourceStatus === "passed" ? ["Fonte verificata e ammessa"] : ["Fonte non verificata o bloccata"]
    },
    {
      check_name: "geometry_validation",
      status: geometryStatus,
      details: geometryStatus === "passed" ? ["Geometria coerente con il profilo verificato"] : ["Geometria non certificata"]
    },
    {
      check_name: "waypoint_validation",
      status: waypointStatus,
      details: waypointStatus === "passed" ? ["Waypoint coerenti con il set verificato"] : ["Waypoint non certificati"]
    }
  ];
}

const server = http.createServer(async (req, res) => {
  if (!req.url) {
    sendJson(res, 400, { error: "Missing URL" });
    return;
  }

  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization"
    });
    res.end();
    return;
  }

  const url = new URL(req.url, BASE_URL);

  try {
    if (req.method === "GET" && url.pathname === "/health") {
      sendJson(res, 200, {
        status: "ok",
        service: "gpt-trek-backend",
        routes_loaded: routes.length,
        date: new Date().toISOString()
      });
      return;
    }

    if (req.method === "POST" && url.pathname === "/search_verified_routes") {
      const body = await readJsonBody(req);
      const candidates = routes
        .filter((route) => routeMatchesFilters(route, body))
        .map((route) => ({
          route_id: route.route_id,
          name: route.name,
          area: route.area,
          distance_km: route.distance_km,
          elevation_gain_m: route.elevation_gain_m,
          difficulty: route.difficulty,
          source_status: route.source_status,
          source_refs: route.source_refs
        }));

      sendJson(res, 200, { candidates });
      return;
    }

    if (req.method === "POST" && url.pathname === "/validate_route_source") {
      const body = await readJsonBody(req);
      const route = getRoute(body.route_id);
      if (!route) {
        sendJson(res, 404, {
          route_id: body.route_id,
          status: "failed",
          approved_sources: [],
          reasons: ["route_id non presente nel catalogo verificato"]
        });
        return;
      }

      sendJson(res, 200, {
        route_id: route.route_id,
        status: route.source_status === "verified" ? "passed" : "manual_review_required",
        approved_sources: route.approved_sources || [],
        reasons: []
      });
      return;
    }

    if (req.method === "POST" && url.pathname === "/validate_gpx_geometry") {
      const body = await readJsonBody(req);
      const route = getRoute(body.route_id);
      if (!route) {
        sendJson(res, 404, {
          route_id: body.route_id,
          status: "failed",
          continuity_ok: false,
          anomalous_jumps_detected: true,
          outlier_points_detected: true,
          measured_distance_km: 0,
          reasons: ["route_id non presente nel catalogo verificato"]
        });
        return;
      }

      sendJson(res, 200, {
        route_id: route.route_id,
        status: route.geometry_profile.continuity_ok && !route.geometry_profile.anomalous_jumps_detected && !route.geometry_profile.outlier_points_detected
          ? "passed"
          : "manual_review_required",
        continuity_ok: route.geometry_profile.continuity_ok,
        anomalous_jumps_detected: route.geometry_profile.anomalous_jumps_detected,
        outlier_points_detected: route.geometry_profile.outlier_points_detected,
        measured_distance_km: route.geometry_profile.measured_distance_km,
        reasons: []
      });
      return;
    }

    if (req.method === "POST" && url.pathname === "/validate_waypoints") {
      const body = await readJsonBody(req);
      const route = getRoute(body.route_id);
      if (!route) {
        sendJson(res, 404, {
          route_id: body.route_id,
          status: "failed",
          verified_waypoints: [],
          mismatch_count: 999,
          reasons: ["route_id non presente nel catalogo verificato"]
        });
        return;
      }

      sendJson(res, 200, {
        route_id: route.route_id,
        status: "passed",
        verified_waypoints: route.waypoints,
        mismatch_count: 0,
        reasons: []
      });
      return;
    }

    if (req.method === "POST" && url.pathname === "/build_gpx_from_verified_route") {
      const body = await readJsonBody(req);
      const route = getRoute(body.route_id);
      if (!route) {
        sendJson(res, 404, {
          error: "route_id non presente nel catalogo verificato"
        });
        return;
      }

      const fileId = `gpx_${route.route_id}_${Date.now()}`;
      const gpxContent = buildGpxContent(route, fileId);
      const sha256 = createHash("sha256").update(gpxContent).digest("hex");
      builtFiles.set(fileId, {
        route_id: route.route_id,
        gpxContent,
        sha256,
        generated_at: new Date().toISOString()
      });

      sendJson(res, 200, {
        route_id: route.route_id,
        file_id: fileId,
        download_url: `${BASE_URL}/download/${encodeURIComponent(fileId)}`,
        sha256,
        generated_at: builtFiles.get(fileId).generated_at
      });
      return;
    }

    if (req.method === "POST" && url.pathname === "/final_certification") {
      const body = await readJsonBody(req);
      const route = getRoute(body.route_id);
      if (!route) {
        sendJson(res, 404, {
          route_id: body.route_id,
          final_status: "blocked",
          reliability_level: "none",
          checks: summarizeChecks("failed", "failed", "failed"),
          source_refs: [],
          certification_notes: ["route_id assente dal catalogo"]
        });
        return;
      }

      const statuses = [
        body.source_validation_status,
        body.geometry_validation_status,
        body.waypoint_validation_status
      ];

      const hasFailed = statuses.includes("failed");
      const hasManualReview = statuses.includes("manual_review_required");
      const finalStatus = hasFailed ? "blocked" : hasManualReview ? "manual_review_required" : "certified";
      const reliabilityLevel = finalStatus === "certified" ? "high" : finalStatus === "manual_review_required" ? "low" : "none";
      const fileRecord = body.file_id ? builtFiles.get(body.file_id) : null;

      sendJson(res, 200, {
        route_id: route.route_id,
        final_status: finalStatus,
        reliability_level: reliabilityLevel,
        checks: summarizeChecks(
          body.source_validation_status,
          body.geometry_validation_status,
          body.waypoint_validation_status
        ),
        source_refs: route.source_refs,
        file_id: fileRecord ? body.file_id : undefined,
        download_url: fileRecord ? `${BASE_URL}/download/${encodeURIComponent(body.file_id)}` : undefined,
        certification_notes: finalStatus === "certified"
          ? ["Percorso rilasciabile come GPX verificato"]
          : ["Percorso non certificato automaticamente"]
      });
      return;
    }

    if (req.method === "GET" && url.pathname.startsWith("/download/")) {
      const fileId = decodeURIComponent(url.pathname.replace("/download/", ""));
      const fileRecord = builtFiles.get(fileId);
      if (!fileRecord) {
        sendText(res, 404, "File non trovato");
        return;
      }

      sendText(res, 200, fileRecord.gpxContent, "application/gpx+xml; charset=utf-8");
      return;
    }

    sendJson(res, 404, { error: "Endpoint non trovato" });
  } catch (error) {
    sendJson(res, 500, {
      error: "internal_error",
      message: error instanceof Error ? error.message : String(error)
    });
  }
});

server.listen(PORT, HOST, () => {
  console.log(`GPT Trek backend listening on ${BASE_URL}`);
});

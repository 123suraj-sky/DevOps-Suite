#!/bin/sh
# ─────────────────────────────────────────────────────────────────────────────
# Kibana bootstrap: waits for Kibana to be ready, then creates the
# devopssuite-logs-* data view and a default index pattern if they
# don't already exist.
# ─────────────────────────────────────────────────────────────────────────────

KIBANA_URL="http://kibana:5601"
MAX_WAIT=120
ELAPSED=0

echo "[kibana-init] Waiting for Kibana to be ready..."
until curl -sf "${KIBANA_URL}/api/status" | grep -q '"overall":{"level":"available"'; do
  if [ "$ELAPSED" -ge "$MAX_WAIT" ]; then
    echo "[kibana-init] ERROR: Kibana did not become ready within ${MAX_WAIT}s"
    exit 1
  fi
  sleep 5
  ELAPSED=$((ELAPSED + 5))
  echo "[kibana-init] Still waiting... (${ELAPSED}s)"
done

echo "[kibana-init] Kibana is ready. Provisioning data view..."

# Create the devopssuite-logs-* data view (index pattern)
# Uses the Kibana Saved Objects API. Idempotent — if it already exists
DATA_VIEW_JSON='{"data_view":{"id":"devopssuite-logs","title":"devopssuite-logs-*","timeFieldName":"timestamp","name":"DevOps Suite Application Logs"}}'
DV_OUTPUT=$(curl -s -w "\n%{http_code}" \
  -X POST "${KIBANA_URL}/api/data_views/data_view" \
  -H "kbn-xsrf: kibana-init" \
  -H "Content-Type: application/json" \
  -d "$DATA_VIEW_JSON")
RESPONSE=$(echo "$DV_OUTPUT" | tail -n 1)

if [ "$RESPONSE" = "200" ] || [ "$RESPONSE" = "409" ] || echo "$DV_OUTPUT" | grep -q "Duplicate data view"; then
  echo "[kibana-init] Data view 'devopssuite-logs-*' is ready."
else
  echo "[kibana-init] WARNING: Unexpected response ${RESPONSE} when creating data view: $DV_OUTPUT"
fi

# Set as default data view
curl -s -X POST "${KIBANA_URL}/api/kibana/settings" \
  -H "kbn-xsrf: kibana-init" \
  -H "Content-Type: application/json" \
  -d '{"changes": {"defaultIndex": "devopssuite-logs"}}' > /dev/null

echo "[kibana-init] Default data view set."

# Create a saved search for application request logs
SEARCH_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" \
  -X POST "${KIBANA_URL}/api/saved_objects/search/devopssuite-request-logs" \
  -H "kbn-xsrf: kibana-init" \
  -H "Content-Type: application/json" \
  -d '{
    "attributes": {
      "title": "Application Request Logs",
      "description": "All HTTP request logs from the DevOps Suite backend",
      "hits": 0,
      "columns": ["timestamp", "method", "uri", "status", "durationMs", "userId", "projectId"],
      "sort": [["timestamp", "desc"]],
      "version": 1,
      "kibanaSavedObjectMeta": {
        "searchSourceJSON": "{\"index\":\"devopssuite-logs\",\"query\":{\"query\":\"\",\"language\":\"kuery\"},\"filter\":[]}"
      }
    }
  }')

echo "[kibana-init] Saved search provisioned (HTTP ${SEARCH_RESPONSE})"

# ─────────────────────────────────────────────────────────────────────────────
# Provision Saved Searches for Dashboards
# ─────────────────────────────────────────────────────────────────────────────

# 1. Observability: Errors and warnings (status >= 400 or durationMs >= 1000)
curl -s -o /dev/null -w "%{http_code}" \
  -X POST "${KIBANA_URL}/api/saved_objects/search/devopssuite-observability-errors" \
  -H "kbn-xsrf: kibana-init" \
  -H "Content-Type: application/json" \
  -d '{
    "attributes": {
      "title": "Observability - Errors & High Latency Requests",
      "description": "Requests with HTTP status >= 400 or latency >= 1000ms",
      "hits": 0,
      "columns": ["timestamp", "method", "uri", "status", "durationMs", "userId"],
      "sort": [["timestamp", "desc"]],
      "version": 1,
      "kibanaSavedObjectMeta": {
        "searchSourceJSON": "{\"index\":\"devopssuite-logs\",\"query\":{\"query\":\"status >= 400 or durationMs >= 1000\",\"language\":\"kuery\"},\"filter\":[]}"
      }
    }
  }' > /dev/null

# 2. Security: Authentication and access requests (/api/auth/**)
curl -s -o /dev/null -w "%{http_code}" \
  -X POST "${KIBANA_URL}/api/saved_objects/search/devopssuite-security-auth" \
  -H "kbn-xsrf: kibana-init" \
  -H "Content-Type: application/json" \
  -d '{
    "attributes": {
      "title": "Security - Authentication Requests",
      "description": "All requests hitting the authentication controller endpoints",
      "hits": 0,
      "columns": ["timestamp", "method", "uri", "status", "durationMs", "userId"],
      "sort": [["timestamp", "desc"]],
      "version": 1,
      "kibanaSavedObjectMeta": {
        "searchSourceJSON": "{\"index\":\"devopssuite-logs\",\"query\":{\"query\":\"uri: /api/auth*\",\"language\":\"kuery\"},\"filter\":[]}"
      }
    }
  }' > /dev/null

# 3. Security: Unauthorized and Forbidden requests (401 or 403)
curl -s -o /dev/null -w "%{http_code}" \
  -X POST "${KIBANA_URL}/api/saved_objects/search/devopssuite-security-failures" \
  -H "kbn-xsrf: kibana-init" \
  -H "Content-Type: application/json" \
  -d '{
    "attributes": {
      "title": "Security - Unauthorized & Forbidden (401 / 403)",
      "description": "Failed authentication or permission denials",
      "hits": 0,
      "columns": ["timestamp", "method", "uri", "status", "userId"],
      "sort": [["timestamp", "desc"]],
      "version": 1,
      "kibanaSavedObjectMeta": {
        "searchSourceJSON": "{\"index\":\"devopssuite-logs\",\"query\":{\"query\":\"status: 401 or status: 403\",\"language\":\"kuery\"},\"filter\":[]}"
      }
    }
  }' > /dev/null

# 4. Analytics: Execution requests (/api/executions/**)
curl -s -o /dev/null -w "%{http_code}" \
  -X POST "${KIBANA_URL}/api/saved_objects/search/devopssuite-analytics-executions" \
  -H "kbn-xsrf: kibana-init" \
  -H "Content-Type: application/json" \
  -d '{
    "attributes": {
      "title": "Analytics - Code Sandbox Executions",
      "description": "Docker sandbox code execution requests and performance",
      "hits": 0,
      "columns": ["timestamp", "method", "uri", "status", "durationMs", "userId"],
      "sort": [["timestamp", "desc"]],
      "version": 1,
      "kibanaSavedObjectMeta": {
        "searchSourceJSON": "{\"index\":\"devopssuite-logs\",\"query\":{\"query\":\"uri: /api/executions*\",\"language\":\"kuery\"},\"filter\":[]}"
      }
    }
  }' > /dev/null

# 5. Analytics: Project-scoped requests
curl -s -o /dev/null -w "%{http_code}" \
  -X POST "${KIBANA_URL}/api/saved_objects/search/devopssuite-analytics-projects" \
  -H "kbn-xsrf: kibana-init" \
  -H "Content-Type: application/json" \
  -d '{
    "attributes": {
      "title": "Analytics - Project Domain Operations",
      "description": "Requests associated with projects, boards, and Kanban tasks",
      "hits": 0,
      "columns": ["timestamp", "method", "uri", "projectId", "status", "durationMs"],
      "sort": [["timestamp", "desc"]],
      "version": 1,
      "kibanaSavedObjectMeta": {
        "searchSourceJSON": "{\"index\":\"devopssuite-logs\",\"query\":{\"query\":\"projectId: *\",\"language\":\"kuery\"},\"filter\":[]}"
      }
    }
  }' > /dev/null

echo "[kibana-init] Saved searches provisioned."

# ─────────────────────────────────────────────────────────────────────────────
# Provision Dashboards: Observability, Security, Analytics
# ─────────────────────────────────────────────────────────────────────────────

DASHBOARD_DIR="/kibana-config/dashboards"
if [ -d "$DASHBOARD_DIR" ]; then
  for file in "${DASHBOARD_DIR}"/*.json; do
    [ -f "$file" ] || continue
    name=$(basename "$file" .json)
    dash_id="devopssuite-${name}"
    
    RESP=$(curl -s -o /dev/null -w "%{http_code}" \
      -X POST "${KIBANA_URL}/api/saved_objects/dashboard/${dash_id}" \
      -H "kbn-xsrf: kibana-init" \
      -H "Content-Type: application/json" \
      --data-binary @"$file")

    if [ "$RESP" = "200" ] || [ "$RESP" = "409" ]; then
      echo "[kibana-init] Dashboard '${dash_id}' provisioned (HTTP ${RESP})"
    else
      echo "[kibana-init] WARNING: Unexpected response ${RESP} when creating dashboard ${dash_id}"
    fi
  done
fi

echo "[kibana-init] Bootstrap complete."

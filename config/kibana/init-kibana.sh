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
# the API returns 409 which we ignore.
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" \
  -X POST "${KIBANA_URL}/api/data_views/data_view" \
  -H "kbn-xsrf: kibana-init" \
  -H "Content-Type: application/json" \
  -d '{
    "data_view": {
      "id": "devopssuite-logs",
      "title": "devopssuite-logs-*",
      "timeFieldName": "timestamp",
      "name": "DevOps Suite Application Logs"
    }
  }')

if [ "$RESPONSE" = "200" ] || [ "$RESPONSE" = "409" ]; then
  echo "[kibana-init] Data view 'devopssuite-logs-*' provisioned (HTTP ${RESPONSE})"
else
  echo "[kibana-init] WARNING: Unexpected response ${RESPONSE} when creating data view"
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
echo "[kibana-init] Bootstrap complete."

import os, sys
from pathlib import Path
sys.path.insert(0, ".")
from scripts.diagram_generator_base import HTML_WRAPPER, DIAGRAMS_DIR

def save_diagram(slug, title, eyebrow, h1, svg):
    html = HTML_WRAPPER.format(title=title, eyebrow=eyebrow, h1=h1, svg_content=svg)
    p = DIAGRAMS_DIR / f"{slug}.html"
    p.write_text(html, encoding="utf-8")
    print(f"Generated {p.name}")

# ================= 1. LAYERS: telemetry-observability-layers =================
def gen_layers():
    slug = "telemetry-observability-layers"
    title = "Telemetry & Observability Layer Stack"
    h1 = "Full Observability Stack: From Java Monolith to Grafana & Kibana"
    eyebrow = "Layer Stack"

    svg = f"""<svg viewBox="0 0 1100 520" xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="{slug}-title {slug}-desc">
      <title id="{slug}-title">{h1}</title>
      <desc id="{slug}-desc">Layer stack showing Application Instrumentation, Ingestion Buffers, Storage Engines, and Visualization Tiers.</desc>
      <rect width="100%" height="100%" fill="#1e232d"/>

      <!-- Layer 1: Visualization (Top) -->
      <rect x="100" y="80" width="900" height="70" rx="6" fill="#242b37" stroke="rgba(248,250,252,0.18)" stroke-width="1"/>
      <text x="130" y="112" fill="#60a5fa" font-size="11" font-weight="600" font-family="'Geist Mono', monospace">04 / VISUALIZATION TIER</text>
      <text x="130" y="132" fill="#f8fafc" font-size="12">Grafana Dashboards (:8080) &bull; Kibana Log Explorer (:8083) &bull; Nginx Basic Auth</text>

      <!-- Layer 2: Storage & Indexing -->
      <rect x="100" y="170" width="900" height="70" rx="6" fill="#242b37" stroke="rgba(248,250,252,0.18)" stroke-width="1"/>
      <text x="130" y="202" fill="#60a5fa" font-size="11" font-weight="600" font-family="'Geist Mono', monospace">03 / STORAGE &amp; INDEXING</text>
      <text x="130" y="222" fill="#f8fafc" font-size="12">Elasticsearch (JSON Indices) &bull; Prometheus (TSDB Scrape Engine :9090)</text>

      <!-- Layer 3: Pipeline & Buffering (Focal) -->
      <rect x="100" y="260" width="900" height="70" rx="6" fill="rgba(240,138,89,0.08)" stroke="#f08a59" stroke-width="1.5"/>
      <text x="130" y="292" fill="#f08a59" font-size="11" font-weight="600" font-family="'Geist Mono', monospace">02 / PIPELINE &amp; LOG CORRELATION (FOCAL)</text>
      <text x="130" y="312" fill="#f8fafc" font-size="12">Spring Logback Async Appender &bull; X-Project-Id Header Correlation &bull; Micrometer MeterRegistry</text>

      <!-- Layer 4: Instrumentation & Core -->
      <rect x="100" y="350" width="900" height="70" rx="6" fill="#242b37" stroke="rgba(248,250,252,0.18)" stroke-width="1"/>
      <text x="130" y="382" fill="#60a5fa" font-size="11" font-weight="600" font-family="'Geist Mono', monospace">01 / APPLICATION INSTRUMENTATION</text>
      <text x="130" y="402" fill="#f8fafc" font-size="12">Spring Boot Actuator Endpoints &bull; RequestLoggingFilter &bull; JVM Cgroup Metrics</text>

      <!-- Vertical Flow Connectors -->
      <line x1="550" y1="350" x2="550" y2="330" stroke="#f08a59" stroke-width="1.5"/>
      <line x1="550" y1="260" x2="550" y2="240" stroke="#94a3b8" stroke-width="1.2"/>
      <line x1="550" y1="170" x2="550" y2="150" stroke="#94a3b8" stroke-width="1.2"/>

      <!-- Legend -->
      <line x1="100" y1="465" x2="1000" y2="465" stroke="rgba(248,250,252,0.08)" stroke-width="0.8"/>
      <text x="100" y="485" fill="#94a3b8" font-size="8" font-family="'Geist Mono', monospace" letter-spacing="0.18em">LEGEND</text>
      <rect x="170" y="478" width="14" height="10" rx="2" fill="rgba(240,138,89,0.2)" stroke="#f08a59" stroke-width="1"/>
      <text x="192" y="485" fill="#94a3b8" font-size="8.5">Core App Log Routing Layer</text>
    </svg>"""

    save_diagram(slug, title, eyebrow, h1, svg)

# ================= 2. MEDALLION: logging-pipeline-medallion =================
def gen_medallion():
    slug = "logging-pipeline-medallion"
    title = "Logging Pipeline Medallion Architecture"
    h1 = "Raw Request Logs to Searchable Elasticsearch Gold Aggregations"
    eyebrow = "Medallion Pipeline"

    svg = f"""<svg viewBox="0 0 1100 520" xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="{slug}-title {slug}-desc">
      <title id="{slug}-title">{h1}</title>
      <desc id="{slug}-desc">Medallion architecture diagram showing Bronze raw request capture, Silver structured sanitization, and Gold analytical visualization.</desc>
      <defs>
        <marker id="arrow" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto"><polygon points="0 0, 8 3, 0 6" fill="#94a3b8"/></marker>
        <marker id="arrow-accent" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto"><polygon points="0 0, 8 3, 0 6" fill="#f08a59"/></marker>
      </defs>
      <rect width="100%" height="100%" fill="#1e232d"/>

      <!-- Arrows -->
      <line x1="330" y1="240" x2="410" y2="240" stroke="#94a3b8" stroke-width="1.2" marker-end="url(#arrow)"/>
      <line x1="690" y1="240" x2="770" y2="240" stroke="#f08a59" stroke-width="1.4" marker-end="url(#arrow-accent)"/>

      <!-- Bronze Tier -->
      <rect x="50" y="120" width="280" height="240" rx="8" fill="#242b37" stroke="rgba(184,115,51,0.4)" stroke-width="1.2"/>
      <rect x="50" y="120" width="280" height="30" rx="8" fill="rgba(184,115,51,0.15)"/>
      <text x="70" y="140" fill="#b87333" font-size="11" font-weight="600" font-family="'Geist Mono', monospace">BRONZE / RAW INGESTION</text>
      <text x="70" y="180" fill="#f8fafc" font-size="11" font-weight="600">Raw Request Interceptor</text>
      <text x="70" y="202" fill="#94a3b8" font-size="8.5" font-family="'Geist Mono', monospace">&bull; HTTP Method, URI, Query</text>
      <text x="70" y="222" fill="#94a3b8" font-size="8.5" font-family="'Geist Mono', monospace">&bull; IP address &amp; User-Agent</text>
      <text x="70" y="242" fill="#94a3b8" font-size="8.5" font-family="'Geist Mono', monospace">&bull; Inbound Payload Buffer</text>
      <text x="70" y="262" fill="#94a3b8" font-size="8.5" font-family="'Geist Mono', monospace">&bull; Unparsed raw text</text>

      <!-- Silver Tier -->
      <rect x="410" y="120" width="280" height="240" rx="8" fill="#242b37" stroke="rgba(192,192,192,0.4)" stroke-width="1.2"/>
      <rect x="410" y="120" width="280" height="30" rx="8" fill="rgba(192,192,192,0.15)"/>
      <text x="430" y="140" fill="#c0c0c0" font-size="11" font-weight="600" font-family="'Geist Mono', monospace">SILVER / FILTERED &amp; SCOPED</text>
      <text x="430" y="180" fill="#f8fafc" font-size="11" font-weight="600">Sanitized JSON Documents</text>
      <text x="430" y="202" fill="#94a3b8" font-size="8.5" font-family="'Geist Mono', monospace">&bull; Password redaction</text>
      <text x="430" y="222" fill="#94a3b8" font-size="8.5" font-family="'Geist Mono', monospace">&bull; X-Project-Id correlation</text>
      <text x="430" y="242" fill="#94a3b8" font-size="8.5" font-family="'Geist Mono', monospace">&bull; Trace ID &amp; User ID tag</text>
      <text x="430" y="262" fill="#94a3b8" font-size="8.5" font-family="'Geist Mono', monospace">&bull; ISO-8601 Timestamps</text>

      <!-- Gold Tier (Focal) -->
      <rect x="770" y="120" width="280" height="240" rx="8" fill="rgba(240,138,89,0.06)" stroke="#f08a59" stroke-width="1.5"/>
      <rect x="770" y="120" width="280" height="30" rx="8" fill="rgba(240,138,89,0.2)"/>
      <text x="790" y="140" fill="#f08a59" font-size="11" font-weight="600" font-family="'Geist Mono', monospace">GOLD / AGGREGATED METRICS</text>
      <text x="790" y="180" fill="#f8fafc" font-size="11" font-weight="600">Searchable Analytics Indices</text>
      <text x="790" y="202" fill="#94a3b8" font-size="8.5" font-family="'Geist Mono', monospace">&bull; Error spike alert rules</text>
      <text x="790" y="222" fill="#94a3b8" font-size="8.5" font-family="'Geist Mono', monospace">&bull; Rate limit violation audit</text>
      <text x="790" y="242" fill="#94a3b8" font-size="8.5" font-family="'Geist Mono', monospace">&bull; Kibana Discover saved views</text>
      <text x="790" y="262" fill="#94a3b8" font-size="8.5" font-family="'Geist Mono', monospace">&bull; Docker sandbox error logs</text>

      <!-- Legend -->
      <line x1="50" y1="465" x2="1050" y2="465" stroke="rgba(248,250,252,0.08)" stroke-width="0.8"/>
      <text x="50" y="485" fill="#94a3b8" font-size="8" font-family="'Geist Mono', monospace" letter-spacing="0.18em">LEGEND</text>
      <rect x="120" y="478" width="14" height="10" rx="2" fill="rgba(240,138,89,0.2)" stroke="#f08a59" stroke-width="1"/>
      <text x="142" y="485" fill="#94a3b8" font-size="8.5">High-Value Elasticsearch Gold Layer</text>
    </svg>"""

    save_diagram(slug, title, eyebrow, h1, svg)

# ================= 3. HEATMAP: api-latency-traffic-heatmap =================
def gen_heatmap():
    slug = "api-latency-traffic-heatmap"
    title = "API Traffic & Latency Heatmap"
    h1 = "24-Hour Request Traffic Volume and Response Latency by Endpoint Group"
    eyebrow = "Traffic Heatmap"

    svg = f"""<svg viewBox="0 0 1100 520" xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="{slug}-title {slug}-desc">
      <title id="{slug}-title">{h1}</title>
      <desc id="{slug}-desc">Heatmap displaying endpoint latency and request densities across 6-hour windows.</desc>
      <rect width="100%" height="100%" fill="#1e232d"/>

      <!-- Grid Column Labels (Time Blocks) -->
      <text x="310" y="80" fill="#94a3b8" font-size="8.5" font-family="'Geist Mono', monospace" text-anchor="middle">00:00 - 06:00</text>
      <text x="510" y="80" fill="#94a3b8" font-size="8.5" font-family="'Geist Mono', monospace" text-anchor="middle">06:00 - 12:00</text>
      <text x="710" y="80" fill="#94a3b8" font-size="8.5" font-family="'Geist Mono', monospace" text-anchor="middle">12:00 - 18:00 (Peak)</text>
      <text x="910" y="80" fill="#94a3b8" font-size="8.5" font-family="'Geist Mono', monospace" text-anchor="middle">18:00 - 24:00</text>

      <!-- Row 1: /api/auth/* -->
      <text x="50" y="130" fill="#f8fafc" font-size="11" font-weight="600">/api/auth/*</text>
      <rect x="220" y="100" width="180" height="50" rx="4" fill="rgba(96,165,250,0.1)"/>
      <text x="310" y="130" fill="#94a3b8" font-size="8.5" font-family="'Geist Mono', monospace" text-anchor="middle">15ms &bull; 1.2k req</text>

      <rect x="420" y="100" width="180" height="50" rx="4" fill="rgba(96,165,250,0.2)"/>
      <text x="510" y="130" fill="#94a3b8" font-size="8.5" font-family="'Geist Mono', monospace" text-anchor="middle">22ms &bull; 8.4k req</text>

      <rect x="620" y="100" width="180" height="50" rx="4" fill="rgba(96,165,250,0.3)"/>
      <text x="710" y="130" fill="#f8fafc" font-size="8.5" font-family="'Geist Mono', monospace" text-anchor="middle">28ms &bull; 14.1k req</text>

      <rect x="820" y="100" width="180" height="50" rx="4" fill="rgba(96,165,250,0.15)"/>
      <text x="910" y="130" fill="#94a3b8" font-size="8.5" font-family="'Geist Mono', monospace" text-anchor="middle">18ms &bull; 4.6k req</text>

      <!-- Row 2: /api/projects/* (Kanban) -->
      <text x="50" y="200" fill="#f8fafc" font-size="11" font-weight="600">/api/projects/*</text>
      <rect x="220" y="170" width="180" height="50" rx="4" fill="rgba(96,165,250,0.1)"/>
      <text x="310" y="200" fill="#94a3b8" font-size="8.5" font-family="'Geist Mono', monospace" text-anchor="middle">12ms &bull; 2.1k req</text>

      <rect x="420" y="170" width="180" height="50" rx="4" fill="rgba(96,165,250,0.25)"/>
      <text x="510" y="200" fill="#94a3b8" font-size="8.5" font-family="'Geist Mono', monospace" text-anchor="middle">16ms &bull; 18.2k req</text>

      <rect x="620" y="170" width="180" height="50" rx="4" fill="rgba(96,165,250,0.35)"/>
      <text x="710" y="200" fill="#f8fafc" font-size="8.5" font-family="'Geist Mono', monospace" text-anchor="middle">20ms &bull; 26.5k req</text>

      <rect x="820" y="170" width="180" height="50" rx="4" fill="rgba(96,165,250,0.15)"/>
      <text x="910" y="200" fill="#94a3b8" font-size="8.5" font-family="'Geist Mono', monospace" text-anchor="middle">14ms &bull; 7.8k req</text>

      <!-- Row 3: /api/execution/* (Focal) -->
      <text x="50" y="270" fill="#f08a59" font-size="11" font-weight="600">/api/execution/*</text>
      <rect x="220" y="240" width="180" height="50" rx="4" fill="rgba(240,138,89,0.15)"/>
      <text x="310" y="270" fill="#f08a59" font-size="8.5" font-family="'Geist Mono', monospace" text-anchor="middle">420ms &bull; 210 req</text>

      <rect x="420" y="240" width="180" height="50" rx="4" fill="rgba(240,138,89,0.25)"/>
      <text x="510" y="270" fill="#f08a59" font-size="8.5" font-family="'Geist Mono', monospace" text-anchor="middle">680ms &bull; 1.4k req</text>

      <rect x="620" y="240" width="180" height="50" rx="4" fill="rgba(240,138,89,0.4)" stroke="#f08a59" stroke-width="1.2"/>
      <text x="710" y="270" fill="#f8fafc" font-size="8.5" font-weight="600" font-family="'Geist Mono', monospace" text-anchor="middle">1.2s &bull; 3.2k runs (Peak)</text>

      <rect x="820" y="240" width="180" height="50" rx="4" fill="rgba(240,138,89,0.2)"/>
      <text x="910" y="270" fill="#f08a59" font-size="8.5" font-family="'Geist Mono', monospace" text-anchor="middle">510ms &bull; 890 req</text>

      <!-- Row 4: /actuator/prometheus -->
      <text x="50" y="340" fill="#94a3b8" font-size="11" font-weight="600">/actuator/*</text>
      <rect x="220" y="310" width="180" height="50" rx="4" fill="rgba(248,250,252,0.05)"/>
      <text x="310" y="340" fill="#94a3b8" font-size="8.5" font-family="'Geist Mono', monospace" text-anchor="middle">8ms &bull; 360 req</text>

      <rect x="420" y="310" width="180" height="50" rx="4" fill="rgba(248,250,252,0.05)"/>
      <text x="510" y="340" fill="#94a3b8" font-size="8.5" font-family="'Geist Mono', monospace" text-anchor="middle">9ms &bull; 360 req</text>

      <rect x="620" y="310" width="180" height="50" rx="4" fill="rgba(248,250,252,0.05)"/>
      <text x="710" y="340" fill="#94a3b8" font-size="8.5" font-family="'Geist Mono', monospace" text-anchor="middle">11ms &bull; 360 req</text>

      <rect x="820" y="310" width="180" height="50" rx="4" fill="rgba(248,250,252,0.05)"/>
      <text x="910" y="340" fill="#94a3b8" font-size="8.5" font-family="'Geist Mono', monospace" text-anchor="middle">8ms &bull; 360 req</text>

      <!-- Legend -->
      <line x1="50" y1="465" x2="1050" y2="465" stroke="rgba(248,250,252,0.08)" stroke-width="0.8"/>
      <text x="50" y="485" fill="#94a3b8" font-size="8" font-family="'Geist Mono', monospace" letter-spacing="0.18em">LEGEND</text>
      <rect x="120" y="478" width="14" height="10" rx="2" fill="rgba(240,138,89,0.3)" stroke="#f08a59" stroke-width="1"/>
      <text x="142" y="485" fill="#94a3b8" font-size="8.5">Docker Sandboxed Compute Overhead</text>
    </svg>"""

    save_diagram(slug, title, eyebrow, h1, svg)

# ================= 4. SANKEY: system-request-distribution =================
def gen_sankey():
    slug = "system-request-distribution"
    title = "System Request Routing Sankey Flow"
    h1 = "Inbound HTTP Traffic Distribution Across Platform Services"
    eyebrow = "Sankey Flow"

    svg = f"""<svg viewBox="0 0 1100 520" xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="{slug}-title {slug}-desc">
      <title id="{slug}-title">{h1}</title>
      <desc id="{slug}-desc">Sankey diagram showing inbound traffic volume split into Auth, Kanban REST, WebSocket STOMP, and Sandbox execution.</desc>
      <rect width="100%" height="100%" fill="#1e232d"/>

      <!-- Inbound Source Bar -->
      <rect x="80" y="100" width="40" height="300" rx="4" fill="#60a5fa"/>
      <text x="60" y="250" fill="#f8fafc" font-size="12" font-weight="600" text-anchor="end">Inbound Traffic</text>
      <text x="60" y="268" fill="#94a3b8" font-size="8" font-family="'Geist Mono', monospace" text-anchor="end">100% Total</text>

      <!-- Flow bands -->
      <!-- Band 1: Kanban REST (45%) -->
      <path d="M 120,100 C 350,100 450,100 680,100 L 680,220 C 450,220 350,220 120,220 Z" fill="rgba(96,165,250,0.18)"/>
      <!-- Band 2: WebSocket STOMP (30%) -->
      <path d="M 120,220 C 350,220 450,240 680,240 L 680,320 C 450,320 350,310 120,310 Z" fill="rgba(52,211,153,0.18)"/>
      <!-- Band 3: Sandbox Runs (15% - Focal) -->
      <path d="M 120,310 C 350,310 450,340 680,340 L 680,380 C 450,380 350,370 120,370 Z" fill="rgba(240,138,89,0.3)"/>
      <!-- Band 4: Auth & Metrics (10%) -->
      <path d="M 120,370 C 350,370 450,400 680,400 L 680,430 C 450,430 350,400 120,400 Z" fill="rgba(148,163,184,0.2)"/>

      <!-- Destination Targets -->
      <!-- Dest 1: Kanban -->
      <rect x="680" y="100" width="30" height="120" rx="4" fill="#60a5fa"/>
      <text x="730" y="155" fill="#f8fafc" font-size="11" font-weight="600">Kanban &amp; Project REST (45%)</text>
      <text x="730" y="172" fill="#94a3b8" font-size="8" font-family="'Geist Mono', monospace">PostgreSQL JPA queries</text>

      <!-- Dest 2: WebSockets -->
      <rect x="680" y="240" width="30" height="80" rx="4" fill="#34d399"/>
      <text x="730" y="275" fill="#34d399" font-size="11" font-weight="600">STOMP WebSockets (30%)</text>
      <text x="730" y="292" fill="#94a3b8" font-size="8" font-family="'Geist Mono', monospace">Real-time Task &amp; Log streaming</text>

      <!-- Dest 3: Execution Sandbox (Focal) -->
      <rect x="680" y="340" width="30" height="40" rx="4" fill="#f08a59"/>
      <text x="730" y="360" fill="#f08a59" font-size="11" font-weight="600">Docker Code Sandbox (15%)</text>
      <text x="730" y="375" fill="#94a3b8" font-size="8" font-family="'Geist Mono', monospace">Isolated runner containers</text>

      <!-- Dest 4: Auth & Misc -->
      <rect x="680" y="400" width="30" height="30" rx="4" fill="#94a3b8"/>
      <text x="730" y="418" fill="#f8fafc" font-size="10.5">Auth &amp; Telemetry (10%)</text>

      <!-- Legend -->
      <line x1="80" y1="475" x2="1020" y2="475" stroke="rgba(248,250,252,0.08)" stroke-width="0.8"/>
      <text x="80" y="495" fill="#94a3b8" font-size="8" font-family="'Geist Mono', monospace" letter-spacing="0.18em">LEGEND</text>
      <rect x="150" y="488" width="14" height="10" rx="2" fill="#f08a59"/>
      <text x="172" y="496" fill="#94a3b8" font-size="8.5">Resource-Intensive Compute Stream</text>
    </svg>"""

    save_diagram(slug, title, eyebrow, h1, svg)

# ================= 5. BAR CHART: code-execution-language-stats =================
def gen_bar_chart():
    slug = "code-execution-language-stats"
    title = "Language Execution Performance Bar Chart"
    h1 = "Average Container Cold-Start & Execution Time by Language Runtime"
    eyebrow = "Bar Chart"

    svg = f"""<svg viewBox="0 0 1100 520" xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="{slug}-title {slug}-desc">
      <title id="{slug}-title">{h1}</title>
      <desc id="{slug}-desc">Bar chart comparing execution latency across Python, JavaScript, Java, Go, and C++ runtimes in the Docker sandbox.</desc>
      <rect width="100%" height="100%" fill="#1e232d"/>

      <!-- Chart Axes -->
      <line x1="160" y1="80" x2="160" y2="420" stroke="rgba(248,250,252,0.18)" stroke-width="1.2"/>
      <line x1="160" y1="420" x2="1020" y2="420" stroke="rgba(248,250,252,0.18)" stroke-width="1.2"/>

      <!-- X Axis Ticks & Grid -->
      <line x1="360" y1="80" x2="360" y2="420" stroke="rgba(248,250,252,0.05)" stroke-dasharray="3,3"/>
      <text x="360" y="438" fill="#94a3b8" font-size="8" font-family="'Geist Mono', monospace" text-anchor="middle">500ms</text>

      <line x1="560" y1="80" x2="560" y2="420" stroke="rgba(248,250,252,0.05)" stroke-dasharray="3,3"/>
      <text x="560" y="438" fill="#94a3b8" font-size="8" font-family="'Geist Mono', monospace" text-anchor="middle">1000ms</text>

      <line x1="760" y1="80" x2="760" y2="420" stroke="rgba(248,250,252,0.05)" stroke-dasharray="3,3"/>
      <text x="760" y="438" fill="#94a3b8" font-size="8" font-family="'Geist Mono', monospace" text-anchor="middle">1500ms</text>

      <line x1="960" y1="80" x2="960" y2="420" stroke="rgba(248,250,252,0.05)" stroke-dasharray="3,3"/>
      <text x="960" y="438" fill="#94a3b8" font-size="8" font-family="'Geist Mono', monospace" text-anchor="middle">2000ms</text>

      <!-- Bar 1: Python -->
      <text x="140" y="130" fill="#f8fafc" font-size="11" font-weight="600" text-anchor="end">Python 3.11</text>
      <rect x="160" y="110" width="310" height="34" rx="3" fill="#60a5fa"/>
      <text x="480" y="132" fill="#f8fafc" font-size="9" font-family="'Geist Mono', monospace">780ms</text>

      <!-- Bar 2: Node.js / JS -->
      <text x="140" y="190" fill="#f8fafc" font-size="11" font-weight="600" text-anchor="end">Node.js 20</text>
      <rect x="160" y="170" width="240" height="34" rx="3" fill="#60a5fa"/>
      <text x="410" y="192" fill="#f8fafc" font-size="9" font-family="'Geist Mono', monospace">610ms</text>

      <!-- Bar 3: Java 21 (Focal - Heavy JVM Startup) -->
      <text x="140" y="250" fill="#f08a59" font-size="11" font-weight="600" text-anchor="end">Java 21 JRE</text>
      <rect x="160" y="230" width="680" height="34" rx="3" fill="rgba(240,138,89,0.3)" stroke="#f08a59" stroke-width="1.2"/>
      <text x="850" y="252" fill="#f08a59" font-size="9" font-weight="600" font-family="'Geist Mono', monospace">1720ms (JVM Boot)</text>

      <!-- Bar 4: Go -->
      <text x="140" y="310" fill="#f8fafc" font-size="11" font-weight="600" text-anchor="end">Go 1.22</text>
      <rect x="160" y="290" width="180" height="34" rx="3" fill="#34d399"/>
      <text x="350" y="312" fill="#34d399" font-size="9" font-family="'Geist Mono', monospace">450ms</text>

      <!-- Bar 5: C++ -->
      <text x="140" y="370" fill="#f8fafc" font-size="11" font-weight="600" text-anchor="end">C++ (GCC)</text>
      <rect x="160" y="350" width="210" height="34" rx="3" fill="#34d399"/>
      <text x="380" y="372" fill="#34d399" font-size="9" font-family="'Geist Mono', monospace">520ms</text>

      <!-- Legend -->
      <line x1="80" y1="465" x2="1020" y2="465" stroke="rgba(248,250,252,0.08)" stroke-width="0.8"/>
      <text x="80" y="485" fill="#94a3b8" font-size="8" font-family="'Geist Mono', monospace" letter-spacing="0.18em">LEGEND</text>
      <rect x="150" y="478" width="14" height="10" rx="2" fill="rgba(240,138,89,0.3)" stroke="#f08a59" stroke-width="1"/>
      <text x="172" y="485" fill="#94a3b8" font-size="8.5">Compilation &amp; VM Warm-up Phase</text>
    </svg>"""

    save_diagram(slug, title, eyebrow, h1, svg)

if __name__ == "__main__":
    gen_layers()
    gen_medallion()
    gen_heatmap()
    gen_sankey()
    gen_bar_chart()
    print("Batch 4 completed!")

import os, sys
from pathlib import Path
sys.path.insert(0, ".")
from scripts.diagram_generator_base import HTML_WRAPPER, DIAGRAMS_DIR

def save_diagram(slug, title, eyebrow, h1, svg):
    html = HTML_WRAPPER.format(title=title, eyebrow=eyebrow, h1=h1, svg_content=svg)
    p = DIAGRAMS_DIR / f"{slug}.html"
    p.write_text(html, encoding="utf-8")
    print(f"Generated {p.name}")

# ================= 1. LINE CHART: resource-utilization-trends =================
def gen_line_chart():
    slug = "resource-utilization-trends"
    title = "Host Resource Utilization Trends"
    h1 = "CPU & Memory Utilization During Concurrent Docker Execution Surges"
    eyebrow = "Line Chart"

    svg = f"""<svg viewBox="0 0 1100 520" xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="{slug}-title {slug}-desc">
      <title id="{slug}-title">{h1}</title>
      <desc id="{slug}-desc">Line chart tracking host CPU % and RAM usage over a 60-minute window during burst code execution tests.</desc>
      <rect width="100%" height="100%" fill="#1e232d"/>

      <!-- Axes -->
      <line x1="80" y1="80" x2="80" y2="420" stroke="rgba(248,250,252,0.18)" stroke-width="1.2"/>
      <line x1="80" y1="420" x2="1020" y2="420" stroke="rgba(248,250,252,0.18)" stroke-width="1.2"/>

      <!-- Y Grid Lines -->
      <line x1="80" y1="335" x2="1020" y2="335" stroke="rgba(248,250,252,0.05)" stroke-dasharray="3,3"/>
      <text x="70" y="340" fill="#94a3b8" font-size="8" font-family="'Geist Mono', monospace" text-anchor="end">25%</text>

      <line x1="80" y1="250" x2="1020" y2="250" stroke="rgba(248,250,252,0.05)" stroke-dasharray="3,3"/>
      <text x="70" y="255" fill="#94a3b8" font-size="8" font-family="'Geist Mono', monospace" text-anchor="end">50%</text>

      <line x1="80" y1="165" x2="1020" y2="165" stroke="rgba(248,250,252,0.05)" stroke-dasharray="3,3"/>
      <text x="70" y="170" fill="#94a3b8" font-size="8" font-family="'Geist Mono', monospace" text-anchor="end">75%</text>

      <line x1="80" y1="80" x2="1020" y2="80" stroke="rgba(248,250,252,0.05)" stroke-dasharray="3,3"/>
      <text x="70" y="85" fill="#94a3b8" font-size="8" font-family="'Geist Mono', monospace" text-anchor="end">100%</text>

      <!-- Curve 1: RAM Usage (Steady Blue) -->
      <path d="M 80,300 C 250,290 400,280 550,260 S 800,240 1020,230" fill="none" stroke="#60a5fa" stroke-width="2"/>
      <text x="960" y="215" fill="#60a5fa" font-size="9" font-family="'Geist Mono', monospace">RAM (Flat ~58%)</text>

      <!-- Curve 2: CPU % (Burst Focal Coral) -->
      <path d="M 80,380 Q 200,370 300,360 T 450,340 T 550,130 T 650,150 T 750,350 T 1020,370" fill="none" stroke="#f08a59" stroke-width="2.5"/>
      <circle cx="550" cy="130" r="6" fill="#f08a59"/>
      <rect x="560" y="110" width="140" height="20" rx="3" fill="#1e232d" stroke="#f08a59" stroke-width="0.8"/>
      <text x="630" y="124" fill="#f08a59" font-size="8" font-family="'Geist Mono', monospace" text-anchor="middle">Burst Peak: 85% CPU</text>

      <!-- Legend -->
      <line x1="80" y1="465" x2="1020" y2="465" stroke="rgba(248,250,252,0.08)" stroke-width="0.8"/>
      <text x="80" y="485" fill="#94a3b8" font-size="8" font-family="'Geist Mono', monospace" letter-spacing="0.18em">LEGEND</text>
      <line x1="140" y1="482" x2="170" y2="482" stroke="#f08a59" stroke-width="2.5"/>
      <text x="178" y="485" fill="#94a3b8" font-size="8.5">Host CPU Spike (Concurrent Sandboxes)</text>
      <line x1="430" y1="482" x2="460" y2="482" stroke="#60a5fa" stroke-width="2"/>
      <text x="468" y="485" fill="#94a3b8" font-size="8.5">Resident Memory Consumption</text>
    </svg>"""

    save_diagram(slug, title, eyebrow, h1, svg)

# ================= 2. SCATTER: execution-memory-vs-duration =================
def gen_scatter():
    slug = "execution-memory-vs-duration"
    title = "Execution Memory vs. Duration Scatter Plot"
    h1 = "Sandbox Job Duration vs. Peak Memory Consumption (with 256MB Hard Cap)"
    eyebrow = "Scatter Plot"

    svg = f"""<svg viewBox="0 0 1100 520" xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="{slug}-title {slug}-desc">
      <title id="{slug}-title">{h1}</title>
      <desc id="{slug}-desc">Scatter plot mapping sandbox job duration in seconds against peak resident set size in megabytes.</desc>
      <rect width="100%" height="100%" fill="#1e232d"/>

      <!-- Axes -->
      <line x1="100" y1="80" x2="100" y2="420" stroke="rgba(248,250,252,0.18)" stroke-width="1.2"/>
      <line x1="100" y1="420" x2="1020" y2="420" stroke="rgba(248,250,252,0.18)" stroke-width="1.2"/>

      <!-- 256MB Limit Ceiling Line (Focal) -->
      <line x1="100" y1="120" x2="1020" y2="120" stroke="#f08a59" stroke-width="1.5" stroke-dasharray="4,4"/>
      <rect x="850" y="105" width="160" height="20" rx="3" fill="#1e232d" stroke="#f08a59" stroke-width="0.8"/>
      <text x="930" y="118" fill="#f08a59" font-size="8" font-family="'Geist Mono', monospace" text-anchor="middle">256MB Hard Ceiling (OOM)</text>

      <!-- 30s Timeout Line -->
      <line x1="920" y1="80" x2="920" y2="420" stroke="#f08a59" stroke-width="1.5" stroke-dasharray="4,4"/>
      <text x="910" y="95" fill="#f08a59" font-size="8" font-family="'Geist Mono', monospace" text-anchor="end">30s Timeout</text>

      <!-- Data Points (Clusters) -->
      <!-- Normal cluster: Python & Node (50-120MB, 0.5-3s) -->
      <circle cx="180" cy="360" r="5" fill="#60a5fa" opacity="0.8"/>
      <circle cx="210" cy="340" r="5" fill="#60a5fa" opacity="0.8"/>
      <circle cx="240" cy="320" r="5" fill="#60a5fa" opacity="0.8"/>
      <circle cx="270" cy="350" r="5" fill="#60a5fa" opacity="0.8"/>
      <circle cx="310" cy="310" r="5" fill="#60a5fa" opacity="0.8"/>
      <text x="210" y="380" fill="#60a5fa" font-size="8" font-family="'Geist Mono', monospace">Python/JS Cluster</text>

      <!-- Normal cluster: Java (140-190MB, 1.5-4s) -->
      <circle cx="280" cy="220" r="5" fill="#34d399" opacity="0.8"/>
      <circle cx="320" cy="200" r="5" fill="#34d399" opacity="0.8"/>
      <circle cx="350" cy="210" r="5" fill="#34d399" opacity="0.8"/>
      <text x="320" y="240" fill="#34d399" font-size="8" font-family="'Geist Mono', monospace">Java JRE Baseline</text>

      <!-- Heavy cluster / Near breach -->
      <circle cx="580" cy="140" r="6" fill="#f08a59"/>
      <circle cx="620" cy="130" r="6" fill="#f08a59"/>
      <circle cx="890" cy="135" r="7" fill="#f08a59"/>
      <text x="880" y="160" fill="#f08a59" font-size="8" font-family="'Geist Mono', monospace" text-anchor="end">Near-Ceiling Runs</text>

      <!-- Axis Labels -->
      <text x="560" y="445" fill="#94a3b8" font-size="8.5" font-family="'Geist Mono', monospace" text-anchor="middle">Execution Duration (Seconds) &rarr;</text>
      <text x="50" y="250" fill="#94a3b8" font-size="8.5" font-family="'Geist Mono', monospace" transform="rotate(-90 50 250)" text-anchor="middle">Memory (MB) &rarr;</text>

      <!-- Legend -->
      <line x1="80" y1="475" x2="1020" y2="475" stroke="rgba(248,250,252,0.08)" stroke-width="0.8"/>
      <text x="80" y="495" fill="#94a3b8" font-size="8" font-family="'Geist Mono', monospace" letter-spacing="0.18em">LEGEND</text>
      <line x1="140" y1="492" x2="170" y2="492" stroke="#f08a59" stroke-dasharray="3,3" stroke-width="1.5"/>
      <text x="178" y="495" fill="#94a3b8" font-size="8.5">Kernel Cgroup Safety Limit</text>
    </svg>"""

    save_diagram(slug, title, eyebrow, h1, svg)

# ================= 3. WATERFALL: request-lifecycle-waterfall =================
def gen_waterfall():
    slug = "request-lifecycle-waterfall"
    title = "Request Trace Lifecycle Waterfall"
    h1 = "End-to-End Latency Waterfall for Authenticated Kanban Request"
    eyebrow = "Trace Waterfall"

    svg = f"""<svg viewBox="0 0 1100 520" xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="{slug}-title {slug}-desc">
      <title id="{slug}-title">{h1}</title>
      <desc id="{slug}-desc">Waterfall trace showing microsecond time distribution across filter chains, DB queries, and response serialization.</desc>
      <rect width="100%" height="100%" fill="#1e232d"/>

      <!-- X Grid Lines -->
      <line x1="280" y1="80" x2="280" y2="420" stroke="rgba(248,250,252,0.18)" stroke-width="1"/>
      <line x1="480" y1="80" x2="480" y2="420" stroke="rgba(248,250,252,0.05)" stroke-dasharray="3,3"/>
      <text x="480" y="438" fill="#94a3b8" font-size="8" font-family="'Geist Mono', monospace" text-anchor="middle">+10ms</text>
      <line x1="680" y1="80" x2="680" y2="420" stroke="rgba(248,250,252,0.05)" stroke-dasharray="3,3"/>
      <text x="680" y="438" fill="#94a3b8" font-size="8" font-family="'Geist Mono', monospace" text-anchor="middle">+20ms</text>
      <line x1="880" y1="80" x2="880" y2="420" stroke="rgba(248,250,252,0.05)" stroke-dasharray="3,3"/>
      <text x="880" y="438" fill="#94a3b8" font-size="8" font-family="'Geist Mono', monospace" text-anchor="middle">+30ms</text>

      <!-- Step 1: Nginx Ingress -->
      <text x="260" y="125" fill="#f8fafc" font-size="10.5" text-anchor="end">Nginx TLS Ingress</text>
      <rect x="280" y="110" width="30" height="24" rx="2" fill="#60a5fa"/>
      <text x="320" y="126" fill="#94a3b8" font-size="8" font-family="'Geist Mono', monospace">1.5ms</text>

      <!-- Step 2: RateLimitFilter -->
      <text x="260" y="175" fill="#f8fafc" font-size="10.5" text-anchor="end">Redis RateLimitFilter</text>
      <rect x="310" y="160" width="50" height="24" rx="2" fill="#60a5fa"/>
      <text x="370" y="176" fill="#94a3b8" font-size="8" font-family="'Geist Mono', monospace">2.5ms</text>

      <!-- Step 3: JwtRequestFilter -->
      <text x="260" y="225" fill="#f8fafc" font-size="10.5" text-anchor="end">JwtRequestFilter</text>
      <rect x="360" y="210" width="70" height="24" rx="2" fill="#60a5fa"/>
      <text x="440" y="226" fill="#94a3b8" font-size="8" font-family="'Geist Mono', monospace">3.5ms (Sig Check)</text>

      <!-- Step 4: Postgres JPA Query (Focal) -->
      <text x="260" y="275" fill="#f08a59" font-size="10.5" font-weight="600" text-anchor="end">PostgreSQL JPA Query</text>
      <rect x="430" y="260" width="320" height="24" rx="2" fill="rgba(240,138,89,0.3)" stroke="#f08a59" stroke-width="1"/>
      <text x="760" y="276" fill="#f08a59" font-size="8" font-family="'Geist Mono', monospace">16.0ms (Find Tasks)</text>

      <!-- Step 5: JSON Serialization -->
      <text x="260" y="325" fill="#f8fafc" font-size="10.5" text-anchor="end">Jackson DTO Serialize</text>
      <rect x="750" y="310" width="60" height="24" rx="2" fill="#60a5fa"/>
      <text x="820" y="326" fill="#94a3b8" font-size="8" font-family="'Geist Mono', monospace">3.0ms</text>

      <!-- Step 6: Response Return -->
      <text x="260" y="375" fill="#34d399" font-size="10.5" font-weight="600" text-anchor="end">Total RTT</text>
      <rect x="280" y="360" width="530" height="24" rx="2" fill="none" stroke="#34d399" stroke-width="1.2" stroke-dasharray="3,3"/>
      <text x="820" y="376" fill="#34d399" font-size="9" font-weight="600" font-family="'Geist Mono', monospace">26.5ms Total</text>

      <!-- Legend -->
      <line x1="80" y1="465" x2="1020" y2="465" stroke="rgba(248,250,252,0.08)" stroke-width="0.8"/>
      <text x="80" y="485" fill="#94a3b8" font-size="8" font-family="'Geist Mono', monospace" letter-spacing="0.18em">LEGEND</text>
      <rect x="140" y="478" width="14" height="10" rx="2" fill="rgba(240,138,89,0.3)" stroke="#f08a59" stroke-width="1"/>
      <text x="162" y="485" fill="#94a3b8" font-size="8.5">Database Query Latency Window</text>
    </svg>"""

    save_diagram(slug, title, eyebrow, h1, svg)

# ================= 4. POLAR: system-health-polar =================
def gen_polar():
    slug = "system-health-polar"
    title = "System Health Polar / Radial Chart"
    h1 = "Subsystem Headroom & Health Indicators Across Critical Infrastructure"
    eyebrow = "Polar Chart"

    svg = f"""<svg viewBox="0 0 1100 520" xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="{slug}-title {slug}-desc">
      <title id="{slug}-title">{h1}</title>
      <desc id="{slug}-desc">Polar lollipop chart displaying health headroom percentages for DB Pool, Redis, JVM Heap, and WS Broker.</desc>
      <rect width="100%" height="100%" fill="#1e232d"/>

      <!-- Center of Polar Graph -->
      <circle cx="550" cy="240" r="160" fill="none" stroke="rgba(248,250,252,0.05)" stroke-dasharray="3,3"/>
      <circle cx="550" cy="240" r="110" fill="none" stroke="rgba(248,250,252,0.05)" stroke-dasharray="3,3"/>
      <circle cx="550" cy="240" r="60" fill="none" stroke="rgba(248,250,252,0.05)" stroke-dasharray="3,3"/>
      <circle cx="550" cy="240" r="4" fill="#94a3b8"/>

      <!-- Radial Spoke 1: JVM Heap Headroom (North) -->
      <line x1="550" y1="240" x2="550" y2="100" stroke="#34d399" stroke-width="2"/>
      <circle cx="550" cy="100" r="9" fill="#242b37" stroke="#34d399" stroke-width="2"/>
      <text x="550" y="80" fill="#34d399" font-size="9" font-family="'Geist Mono', monospace" text-anchor="middle">JVM Heap: 78% Free</text>

      <!-- Radial Spoke 2: DB Connection Pool (East - Focal) -->
      <line x1="550" y1="240" x2="690" y2="240" stroke="#f08a59" stroke-width="2.5"/>
      <circle cx="690" cy="240" r="10" fill="rgba(240,138,89,0.2)" stroke="#f08a59" stroke-width="2.5"/>
      <text x="710" y="244" fill="#f08a59" font-size="9" font-weight="600" font-family="'Geist Mono', monospace">DB Pool: 85% Avail</text>

      <!-- Radial Spoke 3: Redis Memory Headroom (South) -->
      <line x1="550" y1="240" x2="550" y2="380" stroke="#60a5fa" stroke-width="2"/>
      <circle cx="550" cy="380" r="9" fill="#242b37" stroke="#60a5fa" stroke-width="2"/>
      <text x="550" y="405" fill="#60a5fa" font-size="9" font-family="'Geist Mono', monospace" text-anchor="middle">Redis Mem: 92% Free</text>

      <!-- Radial Spoke 4: WS Connection Capacity (West) -->
      <line x1="550" y1="240" x2="410" y2="240" stroke="#60a5fa" stroke-width="2"/>
      <circle cx="410" cy="240" r="9" fill="#242b37" stroke="#60a5fa" stroke-width="2"/>
      <text x="390" y="244" fill="#60a5fa" font-size="9" font-family="'Geist Mono', monospace" text-anchor="end">WS Sessions: 70% Cap</text>

      <!-- Legend -->
      <line x1="80" y1="465" x2="1020" y2="465" stroke="rgba(248,250,252,0.08)" stroke-width="0.8"/>
      <text x="80" y="485" fill="#94a3b8" font-size="8" font-family="'Geist Mono', monospace" letter-spacing="0.18em">LEGEND</text>
      <circle cx="150" cy="482" r="6" fill="#34d399"/>
      <text x="165" y="485" fill="#94a3b8" font-size="8.5">Optimal Healthy Headroom (&gt;75%)</text>
    </svg>"""

    save_diagram(slug, title, eyebrow, h1, svg)

if __name__ == "__main__":
    gen_line_chart()
    gen_scatter()
    gen_waterfall()
    gen_polar()
    print("Batch 5 completed!")

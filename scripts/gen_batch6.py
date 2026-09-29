import os, sys
from pathlib import Path
sys.path.insert(0, ".")
from scripts.diagram_generator_base import HTML_WRAPPER, DIAGRAMS_DIR

def save_diagram(slug, title, eyebrow, h1, svg):
    html = HTML_WRAPPER.format(title=title, eyebrow=eyebrow, h1=h1, svg_content=svg)
    p = DIAGRAMS_DIR / f"{slug}.html"
    p.write_text(html, encoding="utf-8")
    print(f"Generated {p.name}")

# ================= 1. DEPENDENCY: service-dependency-graph =================
def gen_dependency():
    slug = "service-dependency-graph"
    title = "Service Dependency Graph"
    h1 = "Inter-Module and Infrastructure Blast Radius Dependency Graph"
    eyebrow = "Dependency Graph"

    svg = f"""<svg viewBox="0 0 1100 520" xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="{slug}-title {slug}-desc">
      <title id="{slug}-title">{h1}</title>
      <desc id="{slug}-desc">Dependency graph showing directional calls and blast radius between backend modules and storage tiers.</desc>
      <defs>
        <marker id="arrow" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto"><polygon points="0 0, 8 3, 0 6" fill="#94a3b8"/></marker>
        <marker id="arrow-accent" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto"><polygon points="0 0, 8 3, 0 6" fill="#f08a59"/></marker>
      </defs>
      <rect width="100%" height="100%" fill="#1e232d"/>

      <!-- Arrows -->
      <line x1="220" y1="170" x2="380" y2="170" stroke="#94a3b8" stroke-width="1.2" marker-end="url(#arrow)"/>
      <line x1="220" y1="270" x2="380" y2="270" stroke="#f08a59" stroke-width="1.2" marker-end="url(#arrow-accent)"/>
      <line x1="560" y1="170" x2="720" y2="170" stroke="#94a3b8" stroke-width="1.2" marker-end="url(#arrow)"/>
      <line x1="560" y1="270" x2="720" y2="270" stroke="#f08a59" stroke-width="1.2" marker-end="url(#arrow-accent)"/>
      <line x1="560" y1="270" x2="720" y2="370" stroke="#94a3b8" stroke-width="1.2" marker-end="url(#arrow)"/>

      <!-- Modules (Left: Ingress) -->
      <rect x="50" y="140" width="170" height="60" rx="4" fill="#242b37" stroke="rgba(248,250,252,0.18)" stroke-width="1"/>
      <text x="65" y="165" fill="#f8fafc" font-size="11" font-weight="600">com.devopssuite.auth</text>
      <text x="65" y="182" fill="#94a3b8" font-size="7.5" font-family="'Geist Mono', monospace">JWT &amp; OAuth Controllers</text>

      <rect x="50" y="240" width="170" height="60" rx="4" fill="#242b37" stroke="rgba(240,138,89,0.3)" stroke-width="1"/>
      <text x="65" y="265" fill="#f08a59" font-size="11" font-weight="600">com.devopssuite.exec</text>
      <text x="65" y="282" fill="#94a3b8" font-size="7.5" font-family="'Geist Mono', monospace">Execution Dispatcher</text>

      <!-- Modules (Center: Core Services - Focal) -->
      <rect x="380" y="130" width="180" height="80" rx="6" fill="#242b37" stroke="rgba(248,250,252,0.2)" stroke-width="1"/>
      <text x="395" y="155" fill="#f8fafc" font-size="11.5" font-weight="600">UserService &amp; RBAC</text>
      <text x="395" y="172" fill="#94a3b8" font-size="8" font-family="'Geist Mono', monospace">Security Evaluation</text>
      <text x="395" y="190" fill="rgba(148,163,184,0.7)" font-size="7.5" font-family="'Geist Mono', monospace">Central Identity Provider</text>

      <rect x="380" y="235" width="180" height="80" rx="6" fill="rgba(240,138,89,0.08)" stroke="#f08a59" stroke-width="1.5"/>
      <text x="395" y="260" fill="#f08a59" font-size="11.5" font-weight="600">DockerSandboxRunner</text>
      <text x="395" y="278" fill="#f8fafc" font-size="8" font-family="'Geist Mono', monospace">Docker Java Client API</text>
      <text x="395" y="296" fill="#94a3b8" font-size="7.5" font-family="'Geist Mono', monospace">Isolated Container Orchestrator</text>

      <!-- Target Stores (Right) -->
      <rect x="720" y="140" width="180" height="60" rx="4" fill="#242b37" stroke="rgba(96,165,250,0.3)" stroke-width="1"/>
      <text x="735" y="165" fill="#60a5fa" font-size="11" font-weight="600">PostgreSQL (Relational)</text>
      <text x="735" y="182" fill="#94a3b8" font-size="7.5" font-family="'Geist Mono', monospace">devopssuite DB</text>

      <rect x="720" y="240" width="180" height="60" rx="4" fill="#242b37" stroke="rgba(240,138,89,0.3)" stroke-width="1"/>
      <text x="735" y="265" fill="#f08a59" font-size="11" font-weight="600">Docker Daemon Socket</text>
      <text x="735" y="282" fill="#94a3b8" font-size="7.5" font-family="'Geist Mono', monospace">/var/run/docker.sock</text>

      <rect x="720" y="340" width="180" height="60" rx="4" fill="#242b37" stroke="rgba(248,250,252,0.15)" stroke-width="1"/>
      <text x="735" y="365" fill="#f8fafc" font-size="11" font-weight="600">Redis 7 Store</text>
      <text x="735" y="382" fill="#94a3b8" font-size="7.5" font-family="'Geist Mono', monospace">Rate Limits &amp; Blacklist</text>

      <!-- Legend -->
      <line x1="50" y1="465" x2="1050" y2="465" stroke="rgba(248,250,252,0.08)" stroke-width="0.8"/>
      <text x="50" y="485" fill="#94a3b8" font-size="8" font-family="'Geist Mono', monospace" letter-spacing="0.18em">LEGEND</text>
      <line x1="120" y1="483" x2="150" y2="483" stroke="#f08a59" stroke-width="1.2" marker-end="url(#arrow-accent)"/>
      <text x="158" y="485" fill="#94a3b8" font-size="8.5">High Blast Radius Dependency (Docker Sandbox)</text>
    </svg>"""

    save_diagram(slug, title, eyebrow, h1, svg)

# ================= 2. QUADRANT: feature-effort-value-matrix =================
def gen_quadrant():
    slug = "feature-effort-value-matrix"
    title = "Feature Value vs. Effort Quadrant Matrix"
    h1 = "DevOps Suite Engineering Prioritization Matrix"
    eyebrow = "Quadrant Matrix"

    svg = f"""<svg viewBox="0 0 1100 520" xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="{slug}-title {slug}-desc">
      <title id="{slug}-title">{h1}</title>
      <desc id="{slug}-desc">Quadrant matrix evaluating features across Value (Y-axis) versus Implementation Effort (X-axis).</desc>
      <rect width="100%" height="100%" fill="#1e232d"/>

      <!-- Quadrant Canvas & Axes -->
      <line x1="550" y1="60" x2="550" y2="440" stroke="rgba(248,250,252,0.18)" stroke-width="1.2"/>
      <line x1="100" y1="250" x2="1000" y2="250" stroke="rgba(248,250,252,0.18)" stroke-width="1.2"/>

      <!-- Axis Labels -->
      <text x="550" y="45" fill="#94a3b8" font-size="8.5" font-family="'Geist Mono', monospace" text-anchor="middle">&uarr; HIGH BUSINESS VALUE</text>
      <text x="100" y="270" fill="#94a3b8" font-size="8.5" font-family="'Geist Mono', monospace">&larr; LOW EFFORT</text>
      <text x="1000" y="270" fill="#94a3b8" font-size="8.5" font-family="'Geist Mono', monospace" text-anchor="end">HIGH COMPLEXITY &rarr;</text>

      <!-- Quadrant 1 (Top Left: Quick Wins) -->
      <text x="120" y="90" fill="#34d399" font-size="10.5" font-weight="600" font-family="'Geist Mono', monospace">QUICK WINS</text>
      <rect x="150" y="110" width="160" height="45" rx="4" fill="#242b37" stroke="rgba(52,211,153,0.3)" stroke-width="0.8"/>
      <text x="165" y="132" fill="#34d399" font-size="9.5" font-weight="500">Redis Token Blacklist</text>
      <text x="165" y="146" fill="#94a3b8" font-size="7.5" font-family="'Geist Mono', monospace">Fast TTL key setting</text>

      <!-- Quadrant 2 (Top Right: Major Bets - Focal) -->
      <text x="980" y="90" fill="#f08a59" font-size="10.5" font-weight="600" font-family="'Geist Mono', monospace" text-anchor="end">STRATEGIC BETS (FOCAL)</text>
      <rect x="740" y="110" width="220" height="55" rx="4" fill="rgba(240,138,89,0.1)" stroke="#f08a59" stroke-width="1.2"/>
      <text x="755" y="132" fill="#f08a59" font-size="10" font-weight="600">Docker Code Execution Sandbox</text>
      <text x="755" y="148" fill="#94a3b8" font-size="7.5" font-family="'Geist Mono', monospace">High security isolation &amp; streaming</text>

      <rect x="680" y="180" width="210" height="50" rx="4" fill="#242b37" stroke="rgba(248,250,252,0.15)" stroke-width="0.8"/>
      <text x="695" y="202" fill="#f8fafc" font-size="9.5">Kanban Realtime WS Sync</text>
      <text x="695" y="218" fill="#94a3b8" font-size="7.5" font-family="'Geist Mono', monospace">STOMP granular task diffs</text>

      <!-- Quadrant 3 (Bottom Left: Fill-ins) -->
      <text x="120" y="420" fill="#94a3b8" font-size="10" font-family="'Geist Mono', monospace">INCREMENTAL</text>
      <rect x="150" y="320" width="160" height="45" rx="4" fill="#242b37" stroke="rgba(248,250,252,0.1)" stroke-width="0.8"/>
      <text x="165" y="342" fill="#f8fafc" font-size="9.5">Email Notifications</text>
      <text x="165" y="356" fill="#94a3b8" font-size="7.5" font-family="'Geist Mono', monospace">Spring Mail SMTP</text>

      <!-- Quadrant 4 (Bottom Right: De-prioritized) -->
      <text x="980" y="420" fill="rgba(148,163,184,0.4)" font-size="10" font-family="'Geist Mono', monospace" text-anchor="end">TIME SINKS (AVOID)</text>
      <rect x="740" y="320" width="200" height="45" rx="4" fill="#242b37" stroke="rgba(248,250,252,0.06)" stroke-width="0.8"/>
      <text x="755" y="342" fill="#94a3b8" font-size="9.5">Full Microservice Split</text>
      <text x="755" y="356" fill="rgba(148,163,184,0.7)" font-size="7.5" font-family="'Geist Mono', monospace">Rejected in favor of Monolith</text>

      <!-- Legend -->
      <line x1="80" y1="465" x2="1020" y2="465" stroke="rgba(248,250,252,0.08)" stroke-width="0.8"/>
      <text x="80" y="485" fill="#94a3b8" font-size="8" font-family="'Geist Mono', monospace" letter-spacing="0.18em">LEGEND</text>
      <rect x="140" y="478" width="14" height="10" rx="2" fill="rgba(240,138,89,0.2)" stroke="#f08a59" stroke-width="1"/>
      <text x="162" y="485" fill="#94a3b8" font-size="8.5">Core Differentiating Engineering Investment</text>
    </svg>"""

    save_diagram(slug, title, eyebrow, h1, svg)

# ================= 3. RADAR: architectural-tradeoffs-radar =================
def gen_radar():
    slug = "architectural-tradeoffs-radar"
    title = "Architectural Trade-Offs Radar"
    h1 = "Architectural Trade-Offs: Modular Monolith vs. Microservice Fleet"
    eyebrow = "Radar Chart"

    svg = f"""<svg viewBox="0 0 1100 520" xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="{slug}-title {slug}-desc">
      <title id="{slug}-title">{h1}</title>
      <desc id="{slug}-desc">Radar chart assessing DevOps Suite's monolith architecture on Deployability, Performance, Simplicity, Isolation, and Observability.</desc>
      <rect width="100%" height="100%" fill="#1e232d"/>

      <!-- Radar Web Polygons (5 Axes) -->
      <polygon points="550,100 700,200 640,360 460,360 400,200" fill="none" stroke="rgba(248,250,252,0.06)" stroke-width="1"/>
      <polygon points="550,140 660,220 610,330 490,330 440,220" fill="none" stroke="rgba(248,250,252,0.06)" stroke-width="1"/>
      <polygon points="550,180 620,240 580,300 520,300 480,240" fill="none" stroke="rgba(248,250,252,0.06)" stroke-width="1"/>

      <!-- Axis Spokes -->
      <line x1="550" y1="240" x2="550" y2="80" stroke="rgba(248,250,252,0.18)" stroke-width="1"/>
      <text x="550" y="70" fill="#f8fafc" font-size="10" font-weight="600" text-anchor="middle">Operational Simplicity</text>

      <line x1="550" y1="240" x2="740" y2="190" stroke="rgba(248,250,252,0.18)" stroke-width="1"/>
      <text x="750" y="195" fill="#f8fafc" font-size="10" font-weight="600">Local Dev Velocity</text>

      <line x1="550" y1="240" x2="660" y2="390" stroke="rgba(248,250,252,0.18)" stroke-width="1"/>
      <text x="670" y="405" fill="#f8fafc" font-size="10" font-weight="600">ACID Transaction Safety</text>

      <line x1="550" y1="240" x2="440" y2="390" stroke="rgba(248,250,252,0.18)" stroke-width="1"/>
      <text x="430" y="405" fill="#f8fafc" font-size="10" font-weight="600" text-anchor="end">Security Sandbox Isolation</text>

      <line x1="550" y1="240" x2="360" y2="190" stroke="rgba(248,250,252,0.18)" stroke-width="1"/>
      <text x="350" y="195" fill="#f8fafc" font-size="10" font-weight="600" text-anchor="end">Observability Density</text>

      <!-- Shape 1: DevOps Suite Monolith (Focal Coral) -->
      <polygon points="550,95 720,195 650,380 470,360 380,195" fill="rgba(240,138,89,0.15)" stroke="#f08a59" stroke-width="2"/>
      <circle cx="550" cy="95" r="4" fill="#f08a59"/>
      <circle cx="720" cy="195" r="4" fill="#f08a59"/>
      <circle cx="650" cy="380" r="4" fill="#f08a59"/>
      <circle cx="470" cy="360" r="4" fill="#f08a59"/>
      <circle cx="380" cy="195" r="4" fill="#f08a59"/>

      <!-- Shape 2: Typical Microservices Comparison (Blue dashed) -->
      <polygon points="550,200 620,240 560,290 440,370 410,210" fill="none" stroke="#60a5fa" stroke-width="1.5" stroke-dasharray="3,3"/>

      <!-- Legend -->
      <line x1="80" y1="465" x2="1020" y2="465" stroke="rgba(248,250,252,0.08)" stroke-width="0.8"/>
      <text x="80" y="485" fill="#94a3b8" font-size="8" font-family="'Geist Mono', monospace" letter-spacing="0.18em">LEGEND</text>
      <rect x="140" y="478" width="14" height="10" rx="2" fill="rgba(240,138,89,0.2)" stroke="#f08a59" stroke-width="1"/>
      <text x="162" y="485" fill="#94a3b8" font-size="8.5">DevOps Suite Monolith Strategy</text>
      <line x1="400" y1="483" x2="430" y2="483" stroke="#60a5fa" stroke-dasharray="3,3" stroke-width="1.5"/>
      <text x="438" y="485" fill="#94a3b8" font-size="8.5">Distributed Microservices Fleet</text>
    </svg>"""

    save_diagram(slug, title, eyebrow, h1, svg)

# ================= 4. LOOP / FLYWHEEL: developer-feedback-loop =================
def gen_loop():
    slug = "developer-feedback-loop"
    title = "Developer Feedback Flywheel Loop"
    h1 = "Iterative Productivity Flywheel: Code, Sandbox, Stream, and Update"
    eyebrow = "Flywheel Loop"

    svg = f"""<svg viewBox="0 0 1100 520" xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="{slug}-title {slug}-desc">
      <title id="{slug}-title">{h1}</title>
      <desc id="{slug}-desc">Flywheel diagram illustrating the continuous developer feedback loop from writing code to sandbox execution and kanban update.</desc>
      <defs>
        <marker id="arrow-accent" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto"><polygon points="0 0, 8 3, 0 6" fill="#f08a59"/></marker>
      </defs>
      <rect width="100%" height="100%" fill="#1e232d"/>

      <!-- Circular Center Hub -->
      <circle cx="550" cy="240" r="80" fill="#242b37" stroke="#f08a59" stroke-width="1.5"/>
      <text x="550" y="235" fill="#f08a59" font-size="12" font-weight="600" text-anchor="middle">PRODUCTIVITY</text>
      <text x="550" y="255" fill="#f8fafc" font-size="9" font-family="'Geist Mono', monospace" text-anchor="middle">FLYWHEEL</text>

      <!-- Loop Circular Flow Path -->
      <path d="M 550,100 A 140,140 0 0,1 690,240" fill="none" stroke="#f08a59" stroke-width="2" marker-end="url(#arrow-accent)"/>
      <path d="M 690,240 A 140,140 0 0,1 550,380" fill="none" stroke="#f08a59" stroke-width="2" marker-end="url(#arrow-accent)"/>
      <path d="M 550,380 A 140,140 0 0,1 410,240" fill="none" stroke="#f08a59" stroke-width="2" marker-end="url(#arrow-accent)"/>
      <path d="M 410,240 A 140,140 0 0,1 550,100" fill="none" stroke="#f08a59" stroke-width="2" marker-end="url(#arrow-accent)"/>

      <!-- 4 Outer Stations -->
      <!-- Station 1: Write Code (North) -->
      <rect x="470" y="40" width="160" height="50" rx="4" fill="#242b37" stroke="rgba(248,250,252,0.18)" stroke-width="1"/>
      <text x="550" y="65" fill="#f8fafc" font-size="11" font-weight="600" text-anchor="middle">1. Monaco Web IDE</text>
      <text x="550" y="78" fill="#94a3b8" font-size="7.5" font-family="'Geist Mono', monospace" text-anchor="middle">Fast auto-save to DB</text>

      <!-- Station 2: Sandbox Exec (East - Focal) -->
      <rect x="730" y="215" width="170" height="55" rx="4" fill="rgba(240,138,89,0.1)" stroke="#f08a59" stroke-width="1.2"/>
      <text x="815" y="240" fill="#f08a59" font-size="11" font-weight="600" text-anchor="middle">2. Docker Runner</text>
      <text x="815" y="256" fill="#94a3b8" font-size="7.5" font-family="'Geist Mono', monospace" text-anchor="middle">Zero host exposure cap</text>

      <!-- Station 3: Realtime Logs (South) -->
      <rect x="470" y="390" width="160" height="50" rx="4" fill="#242b37" stroke="rgba(248,250,252,0.18)" stroke-width="1"/>
      <text x="550" y="415" fill="#f8fafc" font-size="11" font-weight="600" text-anchor="middle">3. STOMP Stream</text>
      <text x="550" y="428" fill="#34d399" font-size="7.5" font-family="'Geist Mono', monospace" text-anchor="middle">Instant debug output</text>

      <!-- Station 4: Kanban Progress (West) -->
      <rect x="200" y="215" width="170" height="55" rx="4" fill="#242b37" stroke="rgba(248,250,252,0.18)" stroke-width="1"/>
      <text x="285" y="240" fill="#f8fafc" font-size="11" font-weight="600" text-anchor="middle">4. Update Kanban</text>
      <text x="285" y="256" fill="#94a3b8" font-size="7.5" font-family="'Geist Mono', monospace" text-anchor="middle">Close task &amp; history diff</text>

      <!-- Legend -->
      <line x1="80" y1="465" x2="1020" y2="465" stroke="rgba(248,250,252,0.08)" stroke-width="0.8"/>
      <text x="80" y="485" fill="#94a3b8" font-size="8" font-family="'Geist Mono', monospace" letter-spacing="0.18em">LEGEND</text>
      <line x1="140" y1="482" x2="170" y2="482" stroke="#f08a59" stroke-width="2" marker-end="url(#arrow-accent)"/>
      <text x="178" y="485" fill="#94a3b8" font-size="8.5">Reinforcing Developer Cycle</text>
    </svg>"""

    save_diagram(slug, title, eyebrow, h1, svg)

# ================= 5. TREEMAP: backend-codebase-composition =================
def gen_treemap():
    slug = "backend-codebase-composition"
    title = "Backend Codebase Package Treemap"
    h1 = "Proportional Code Volume Distribution by Spring Boot Package"
    eyebrow = "Package Treemap"

    svg = f"""<svg viewBox="0 0 1100 520" xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="{slug}-title {slug}-desc">
      <title id="{slug}-title">{h1}</title>
      <desc id="{slug}-desc">Treemap diagram showing proportional code distribution across backend packages: Auth, Execution, Project, Security, and Config.</desc>
      <rect width="100%" height="100%" fill="#1e232d"/>

      <!-- Big Box 1: com.devopssuite.project (Kanban - 35%) -->
      <rect x="60" y="80" width="460" height="340" rx="4" fill="#242b37" stroke="rgba(248,250,252,0.2)" stroke-width="1"/>
      <text x="80" y="110" fill="#f8fafc" font-size="12" font-weight="600">com.devopssuite.project (35%)</text>
      <text x="80" y="130" fill="#94a3b8" font-size="8.5" font-family="'Geist Mono', monospace">Projects &bull; Boards &bull; Columns &bull; Tasks &bull; History Diffs</text>

      <!-- Big Box 2: com.devopssuite.execution (Runner - 25% Focal) -->
      <rect x="540" y="80" width="300" height="200" rx="4" fill="rgba(240,138,89,0.1)" stroke="#f08a59" stroke-width="1.5"/>
      <text x="560" y="110" fill="#f08a59" font-size="12" font-weight="600">com.devopssuite.execution (25%)</text>
      <text x="560" y="130" fill="#f8fafc" font-size="8.5" font-family="'Geist Mono', monospace">Docker Client Runner &bull; Async Queue</text>

      <!-- Box 3: com.devopssuite.auth (20%) -->
      <rect x="860" y="80" width="180" height="200" rx="4" fill="#242b37" stroke="rgba(96,165,250,0.3)" stroke-width="1"/>
      <text x="875" y="110" fill="#60a5fa" font-size="11" font-weight="600">auth &amp; oauth (20%)</text>
      <text x="875" y="130" fill="#94a3b8" font-size="8" font-family="'Geist Mono', monospace">JWT &bull; OAuth2</text>

      <!-- Box 4: com.devopssuite.security (10%) -->
      <rect x="540" y="300" width="240" height="120" rx="4" fill="#242b37" stroke="rgba(248,250,252,0.15)" stroke-width="1"/>
      <text x="555" y="325" fill="#f8fafc" font-size="10.5" font-weight="600">security &amp; filters (10%)</text>
      <text x="555" y="342" fill="#94a3b8" font-size="7.5" font-family="'Geist Mono', monospace">JwtRequestFilter &bull; RateLimiter</text>

      <!-- Box 5: telemetry & ide (10%) -->
      <rect x="800" y="300" width="240" height="120" rx="4" fill="#242b37" stroke="rgba(248,250,252,0.15)" stroke-width="1"/>
      <text x="815" y="325" fill="#f8fafc" font-size="10.5" font-weight="600">logging &amp; ide (10%)</text>
      <text x="815" y="342" fill="#94a3b8" font-size="7.5" font-family="'Geist Mono', monospace">Elasticsearch &bull; IdeFilePersistence</text>

      <!-- Legend -->
      <line x1="60" y1="465" x2="1040" y2="465" stroke="rgba(248,250,252,0.08)" stroke-width="0.8"/>
      <text x="60" y="485" fill="#94a3b8" font-size="8" font-family="'Geist Mono', monospace" letter-spacing="0.18em">LEGEND</text>
      <rect x="130" y="478" width="14" height="10" rx="2" fill="rgba(240,138,89,0.2)" stroke="#f08a59" stroke-width="1"/>
      <text x="152" y="485" fill="#94a3b8" font-size="8.5">Core Docker Sandbox Runner Module</text>
    </svg>"""

    save_diagram(slug, title, eyebrow, h1, svg)

if __name__ == "__main__":
    gen_dependency()
    gen_quadrant()
    gen_radar()
    gen_loop()
    gen_treemap()
    print("Batch 6 completed!")

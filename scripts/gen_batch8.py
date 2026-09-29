import os, sys
from pathlib import Path
sys.path.insert(0, ".")
from scripts.diagram_generator_base import HTML_WRAPPER, DIAGRAMS_DIR

def save_diagram(slug, title, eyebrow, h1, svg):
    html = HTML_WRAPPER.format(title=title, eyebrow=eyebrow, h1=h1, svg_content=svg)
    p = DIAGRAMS_DIR / f"{slug}.html"
    p.write_text(html, encoding="utf-8")
    print(f"Generated {p.name}")

# ================= 1. IT CURRENT STATE: infrastructure-current-state =================
def gen_it_current_state():
    slug = "infrastructure-current-state"
    title = "Infrastructure Current State Topology"
    h1 = "Production IT Current State: Containers, Volumes, and Exposed Ports"
    eyebrow = "IT Current State"

    svg = f"""<svg viewBox="0 0 1100 520" xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="{slug}-title {slug}-desc">
      <title id="{slug}-title">{h1}</title>
      <desc id="{slug}-desc">IT current-state topology illustrating local Docker Compose health, active ports, and mounted volumes.</desc>
      <rect width="100%" height="100%" fill="#1e232d"/>

      <!-- Host Server Box -->
      <rect x="50" y="60" width="1000" height="380" rx="8" fill="rgba(248,250,252,0.015)" stroke="rgba(248,250,252,0.18)" stroke-width="1"/>
      <text x="75" y="90" fill="#f8fafc" font-size="12" font-weight="600">DOCKER HOST INFRASTRUCTURE (WINDOWS / LINUX KERNEL)</text>
      <text x="75" y="108" fill="#34d399" font-size="8.5" font-family="'Geist Mono', monospace">&#9679; ALL CONTAINERS HEALTHY (UP)</text>

      <!-- Container Cards Grid -->
      <!-- C1: Backend Spring Boot (Focal) -->
      <rect x="75" y="130" width="280" height="130" rx="6" fill="rgba(240,138,89,0.08)" stroke="#f08a59" stroke-width="1.5"/>
      <text x="95" y="158" fill="#f08a59" font-size="12" font-weight="600">backend (Monolith)</text>
      <text x="95" y="178" fill="#f8fafc" font-size="8.5" font-family="'Geist Mono', monospace">Status: Up 24h &bull; Port: 8082:8081</text>
      <text x="95" y="196" fill="#94a3b8" font-size="8" font-family="'Geist Mono', monospace">Memory: 512MB limit &bull; Java 21</text>
      <text x="95" y="214" fill="#94a3b8" font-size="8" font-family="'Geist Mono', monospace">Image: devopssuite-backend:latest</text>
      <text x="95" y="232" fill="#34d399" font-size="8" font-family="'Geist Mono', monospace">&#10003; Actuator Health: UP</text>

      <!-- C2: Frontend Nginx -->
      <rect x="385" y="130" width="280" height="130" rx="6" fill="#242b37" stroke="rgba(248,250,252,0.15)" stroke-width="1"/>
      <text x="405" y="158" fill="#60a5fa" font-size="12" font-weight="600">frontend (React 18 SPA)</text>
      <text x="405" y="178" fill="#f8fafc" font-size="8.5" font-family="'Geist Mono', monospace">Status: Up &bull; Port: 80:80</text>
      <text x="405" y="196" fill="#94a3b8" font-size="8" font-family="'Geist Mono', monospace">Nginx alpine static bundle</text>
      <text x="405" y="214" fill="#94a3b8" font-size="8" font-family="'Geist Mono', monospace">Vite build &bull; Tailwind CSS</text>

      <!-- C3: PostgreSQL -->
      <rect x="695" y="130" width="330" height="130" rx="6" fill="#242b37" stroke="rgba(248,250,252,0.15)" stroke-width="1"/>
      <text x="715" y="158" fill="#60a5fa" font-size="12" font-weight="600">postgres (Primary DB)</text>
      <text x="715" y="178" fill="#f8fafc" font-size="8.5" font-family="'Geist Mono', monospace">Status: Up &bull; Port: 5432</text>
      <text x="715" y="196" fill="#94a3b8" font-size="8" font-family="'Geist Mono', monospace">DB: devopssuite (Flyway V1-V16)</text>
      <text x="715" y="214" fill="#94a3b8" font-size="8" font-family="'Geist Mono', monospace">Volume: ./postgres_data mounted</text>

      <!-- Row 2 -->
      <!-- C4: Redis -->
      <rect x="75" y="280" width="280" height="130" rx="6" fill="#242b37" stroke="rgba(248,250,252,0.15)" stroke-width="1"/>
      <text x="95" y="308" fill="#f8fafc" font-size="12" font-weight="600">redis (In-Memory Cache)</text>
      <text x="95" y="328" fill="#f8fafc" font-size="8.5" font-family="'Geist Mono', monospace">Status: Up &bull; Port: 6379</text>
      <text x="95" y="346" fill="#94a3b8" font-size="8" font-family="'Geist Mono', monospace">Rate limiting + Blacklist</text>
      <text x="95" y="364" fill="#94a3b8" font-size="8" font-family="'Geist Mono', monospace">Volume: ./redis_data</text>

      <!-- C5: Observability Proxies -->
      <rect x="385" y="280" width="640" height="130" rx="6" fill="#242b37" stroke="rgba(248,250,252,0.15)" stroke-width="1"/>
      <text x="405" y="308" fill="#f8fafc" font-size="12" font-weight="600">Observability Stack (Elasticsearch, Kibana, Prometheus, Grafana)</text>
      <text x="405" y="328" fill="#f8fafc" font-size="8.5" font-family="'Geist Mono', monospace">Nginx Admin Proxy: Basic Auth Enabled &bull; Ports: 8080 (Grafana), 8083 (Kibana)</text>
      <text x="405" y="346" fill="#94a3b8" font-size="8" font-family="'Geist Mono', monospace">Prometheus scraping Actuator at 15s intervals</text>
      <text x="405" y="364" fill="#94a3b8" font-size="8" font-family="'Geist Mono', monospace">Elasticsearch JSON logging index operational</text>

      <!-- Legend -->
      <line x1="50" y1="465" x2="1050" y2="465" stroke="rgba(248,250,252,0.08)" stroke-width="0.8"/>
      <text x="50" y="485" fill="#94a3b8" font-size="8" font-family="'Geist Mono', monospace" letter-spacing="0.18em">LEGEND</text>
      <rect x="120" y="478" width="14" height="10" rx="2" fill="rgba(240,138,89,0.2)" stroke="#f08a59" stroke-width="1"/>
      <text x="142" y="485" fill="#94a3b8" font-size="8.5">Core Application Container</text>
    </svg>"""

    save_diagram(slug, title, eyebrow, h1, svg)

# ================= 2. HIGH-LEVEL: portfolio-executive-summary =================
def gen_portfolio_summary():
    slug = "portfolio-executive-summary"
    title = "Platform Executive Summary"
    h1 = "DevOps Suite: Full-Stack Developer Productivity Platform"
    eyebrow = "Executive Summary"

    svg = f"""<svg viewBox="0 0 1100 520" xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="{slug}-title {slug}-desc">
      <title id="{slug}-title">{h1}</title>
      <desc id="{slug}-desc">Executive summary diagram highlighting DevOps Suite's key pillars: Kanban Planning, Monaco IDE, Docker Sandbox Execution, and Observability.</desc>
      <rect width="100%" height="100%" fill="#1e232d"/>

      <!-- 4 Pillars -->
      <!-- Pillar 1: Identity & Security -->
      <rect x="50" y="90" width="220" height="320" rx="8" fill="#242b37" stroke="rgba(248,250,252,0.15)" stroke-width="1"/>
      <text x="70" y="125" fill="#60a5fa" font-size="12" font-weight="600">01 / AUTHENTICATION</text>
      <text x="70" y="150" fill="#f8fafc" font-size="13" font-weight="600">Dual OAuth2 &amp; JWT</text>
      <text x="70" y="180" fill="#94a3b8" font-size="8.5" font-family="'Geist Mono', monospace">&bull; Google &amp; GitHub Social</text>
      <text x="70" y="200" fill="#94a3b8" font-size="8.5" font-family="'Geist Mono', monospace">&bull; Redis Token Blacklisting</text>
      <text x="70" y="220" fill="#94a3b8" font-size="8.5" font-family="'Geist Mono', monospace">&bull; Granular RBAC Matrix</text>
      <text x="70" y="240" fill="#94a3b8" font-size="8.5" font-family="'Geist Mono', monospace">&bull; Sliding Window Limiting</text>

      <!-- Pillar 2: Kanban & Projects -->
      <rect x="300" y="90" width="220" height="320" rx="8" fill="#242b37" stroke="rgba(248,250,252,0.15)" stroke-width="1"/>
      <text x="320" y="125" fill="#60a5fa" font-size="12" font-weight="600">02 / COLLABORATION</text>
      <text x="320" y="150" fill="#f8fafc" font-size="13" font-weight="600">Real-Time Kanban</text>
      <text x="320" y="180" fill="#94a3b8" font-size="8.5" font-family="'Geist Mono', monospace">&bull; Dynamic Boards &amp; Columns</text>
      <text x="320" y="200" fill="#94a3b8" font-size="8.5" font-family="'Geist Mono', monospace">&bull; WIP Limit Enforcement</text>
      <text x="320" y="220" fill="#94a3b8" font-size="8.5" font-family="'Geist Mono', monospace">&bull; WebSocket Live Diffs</text>
      <text x="320" y="240" fill="#94a3b8" font-size="8.5" font-family="'Geist Mono', monospace">&bull; Audit History Timeline</text>

      <!-- Pillar 3: Web IDE & Sandbox (Focal) -->
      <rect x="550" y="80" width="240" height="340" rx="8" fill="rgba(240,138,89,0.08)" stroke="#f08a59" stroke-width="2"/>
      <text x="570" y="115" fill="#f08a59" font-size="12" font-weight="600">03 / COMPUTE (CORE)</text>
      <text x="570" y="142" fill="#f8fafc" font-size="14" font-weight="600">Docker Code Sandbox</text>
      <text x="570" y="175" fill="#f08a59" font-size="8.5" font-family="'Geist Mono', monospace">&bull; Monaco Web IDE In-Browser</text>
      <text x="570" y="195" fill="#94a3b8" font-size="8.5" font-family="'Geist Mono', monospace">&bull; Complete Network Isolation</text>
      <text x="570" y="215" fill="#94a3b8" font-size="8.5" font-family="'Geist Mono', monospace">&bull; 256MB RAM &bull; 30s Cap</text>
      <text x="570" y="235" fill="#94a3b8" font-size="8.5" font-family="'Geist Mono', monospace">&bull; STOMP Stdout Live Stream</text>
      <text x="570" y="255" fill="#94a3b8" font-size="8.5" font-family="'Geist Mono', monospace">&bull; Project DB File Sync</text>

      <!-- Pillar 4: Telemetry -->
      <rect x="820" y="90" width="230" height="320" rx="8" fill="#242b37" stroke="rgba(248,250,252,0.15)" stroke-width="1"/>
      <text x="840" y="125" fill="#60a5fa" font-size="12" font-weight="600">04 / OBSERVABILITY</text>
      <text x="840" y="150" fill="#f8fafc" font-size="13" font-weight="600">ELK &amp; Prometheus</text>
      <text x="840" y="180" fill="#94a3b8" font-size="8.5" font-family="'Geist Mono', monospace">&bull; Elasticsearch Log Pipeline</text>
      <text x="840" y="200" fill="#94a3b8" font-size="8.5" font-family="'Geist Mono', monospace">&bull; Kibana Log Analysis</text>
      <text x="840" y="220" fill="#94a3b8" font-size="8.5" font-family="'Geist Mono', monospace">&bull; Prometheus Time-Series</text>
      <text x="840" y="240" fill="#94a3b8" font-size="8.5" font-family="'Geist Mono', monospace">&bull; Grafana Metrics Dashboards</text>

      <!-- Legend -->
      <line x1="50" y1="465" x2="1050" y2="465" stroke="rgba(248,250,252,0.08)" stroke-width="0.8"/>
      <text x="50" y="485" fill="#94a3b8" font-size="8" font-family="'Geist Mono', monospace" letter-spacing="0.18em">LEGEND</text>
      <rect x="120" y="478" width="14" height="10" rx="2" fill="rgba(240,138,89,0.2)" stroke="#f08a59" stroke-width="1"/>
      <text x="142" y="485" fill="#94a3b8" font-size="8.5">Core Product Value Engine (Sandboxed Runner)</text>
    </svg>"""

    save_diagram(slug, title, eyebrow, h1, svg)

# ================= 3. ORG CHART: team-rbac-hierarchy =================
def gen_org_chart():
    slug = "team-rbac-hierarchy"
    title = "Team & RBAC Hierarchy Org Chart"
    h1 = "Project Team Leadership and Role Delegation Structure"
    eyebrow = "Org Chart"

    svg = f"""<svg viewBox="0 0 1100 520" xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="{slug}-title {slug}-desc">
      <title id="{slug}-title">{h1}</title>
      <desc id="{slug}-desc">Organization chart representing project team hierarchy from Project Owner to Administrators, Members, and Viewers.</desc>
      <defs>
        <marker id="arrow" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto"><polygon points="0 0, 8 3, 0 6" fill="#94a3b8"/></marker>
      </defs>
      <rect width="100%" height="100%" fill="#1e232d"/>

      <!-- Level 0: Project Owner (Focal) -->
      <rect x="440" y="60" width="220" height="70" rx="6" fill="rgba(240,138,89,0.1)" stroke="#f08a59" stroke-width="1.5"/>
      <text x="550" y="88" fill="#f08a59" font-size="12" font-weight="600" text-anchor="middle">PROJECT OWNER</text>
      <text x="550" y="106" fill="#f8fafc" font-size="8.5" font-family="'Geist Mono', monospace" text-anchor="middle">Full Ownership &bull; Billing &bull; Destruction</text>

      <!-- Connectors L0 -> L1 -->
      <line x1="550" y1="130" x2="550" y2="180" stroke="#94a3b8" stroke-width="1.2"/>
      <line x1="320" y1="180" x2="780" y2="180" stroke="#94a3b8" stroke-width="1.2"/>
      <line x1="320" y1="180" x2="320" y2="210" stroke="#94a3b8" stroke-width="1.2" marker-end="url(#arrow)"/>
      <line x1="780" y1="180" x2="780" y2="210" stroke="#94a3b8" stroke-width="1.2" marker-end="url(#arrow)"/>

      <!-- Level 1: Project Admins -->
      <rect x="220" y="210" width="200" height="65" rx="6" fill="#242b37" stroke="rgba(248,250,252,0.18)" stroke-width="1"/>
      <text x="320" y="238" fill="#f8fafc" font-size="11" font-weight="600" text-anchor="middle">PROJECT ADMIN</text>
      <text x="320" y="255" fill="#94a3b8" font-size="8" font-family="'Geist Mono', monospace" text-anchor="middle">Member Invites &bull; Settings</text>

      <rect x="680" y="210" width="200" height="65" rx="6" fill="#242b37" stroke="rgba(248,250,252,0.18)" stroke-width="1"/>
      <text x="780" y="238" fill="#f8fafc" font-size="11" font-weight="600" text-anchor="middle">TECH LEAD (ADMIN)</text>
      <text x="780" y="255" fill="#94a3b8" font-size="8" font-family="'Geist Mono', monospace" text-anchor="middle">Board &amp; Column Policies</text>

      <!-- Connectors L1 -> L2 -->
      <line x1="320" y1="275" x2="320" y2="330" stroke="#94a3b8" stroke-width="1.2" marker-end="url(#arrow)"/>
      <line x1="780" y1="275" x2="780" y2="330" stroke="#94a3b8" stroke-width="1.2" marker-end="url(#arrow)"/>

      <!-- Level 2: Members & Viewers -->
      <rect x="220" y="330" width="200" height="65" rx="6" fill="#242b37" stroke="rgba(248,250,252,0.15)" stroke-width="1"/>
      <text x="320" y="358" fill="#34d399" font-size="11" font-weight="600" text-anchor="middle">TEAM MEMBERS</text>
      <text x="320" y="375" fill="#94a3b8" font-size="8" font-family="'Geist Mono', monospace" text-anchor="middle">Run Code &bull; Move Tasks</text>

      <rect x="680" y="330" width="200" height="65" rx="6" fill="#242b37" stroke="rgba(248,250,252,0.15)" stroke-width="1"/>
      <text x="780" y="358" fill="#94a3b8" font-size="11" font-weight="600" text-anchor="middle">VIEWERS / GUESTS</text>
      <text x="780" y="375" fill="#94a3b8" font-size="8" font-family="'Geist Mono', monospace" text-anchor="middle">Read-Only Kanban &amp; Logs</text>

      <!-- Legend -->
      <line x1="50" y1="465" x2="1050" y2="465" stroke="rgba(248,250,252,0.08)" stroke-width="0.8"/>
      <text x="50" y="485" fill="#94a3b8" font-size="8" font-family="'Geist Mono', monospace" letter-spacing="0.18em">LEGEND</text>
      <rect x="120" y="478" width="14" height="10" rx="2" fill="rgba(240,138,89,0.2)" stroke="#f08a59" stroke-width="1"/>
      <text x="142" y="485" fill="#94a3b8" font-size="8.5">Ultimate Project Governance Authority (Owner)</text>
    </svg>"""

    save_diagram(slug, title, eyebrow, h1, svg)

# ================= 4. GANTT CHART: implementation-milestones-gantt =================
def gen_gantt():
    slug = "implementation-milestones-gantt"
    title = "Platform Development Gantt Schedule"
    h1 = "DevOps Suite Engineering Phases and Milestone Completion"
    eyebrow = "Gantt Schedule"

    svg = f"""<svg viewBox="0 0 1100 520" xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="{slug}-title {slug}-desc">
      <title id="{slug}-title">{h1}</title>
      <desc id="{slug}-desc">Gantt schedule tracking the platform rollout phases: Architecture, Auth, Kanban, Sandbox, and Observability.</desc>
      <rect width="100%" height="100%" fill="#1e232d"/>

      <!-- X-axis Timeline Months -->
      <text x="250" y="70" fill="#94a3b8" font-size="8.5" font-family="'Geist Mono', monospace" text-anchor="middle">Sprint 1</text>
      <text x="450" y="70" fill="#94a3b8" font-size="8.5" font-family="'Geist Mono', monospace" text-anchor="middle">Sprint 2</text>
      <text x="650" y="70" fill="#94a3b8" font-size="8.5" font-family="'Geist Mono', monospace" text-anchor="middle">Sprint 3</text>
      <text x="850" y="70" fill="#94a3b8" font-size="8.5" font-family="'Geist Mono', monospace" text-anchor="middle">Sprint 4</text>
      <line x1="160" y1="80" x2="980" y2="80" stroke="rgba(248,250,252,0.18)" stroke-width="1"/>

      <!-- Task 1: Architecture & DB -->
      <text x="140" y="125" fill="#f8fafc" font-size="10.5" text-anchor="end">Architecture &amp; Flyway</text>
      <rect x="160" y="110" width="220" height="24" rx="3" fill="#60a5fa"/>
      <text x="270" y="126" fill="#1e232d" font-size="8" font-weight="600" font-family="'Geist Mono', monospace" text-anchor="middle">V1-V16 Migrations</text>

      <!-- Task 2: Auth & Redis -->
      <text x="140" y="185" fill="#f8fafc" font-size="10.5" text-anchor="end">Auth, OAuth2 &amp; Redis</text>
      <rect x="320" y="170" width="240" height="24" rx="3" fill="#60a5fa"/>
      <text x="440" y="186" fill="#1e232d" font-size="8" font-weight="600" font-family="'Geist Mono', monospace" text-anchor="middle">JWT Blacklist &amp; RateLimits</text>

      <!-- Task 3: Kanban & WebSocket -->
      <text x="140" y="245" fill="#f8fafc" font-size="10.5" text-anchor="end">Kanban Boards &amp; STOMP</text>
      <rect x="500" y="230" width="220" height="24" rx="3" fill="#60a5fa"/>
      <text x="610" y="246" fill="#1e232d" font-size="8" font-weight="600" font-family="'Geist Mono', monospace" text-anchor="middle">Live Task Diffs</text>

      <!-- Task 4: Docker Code Sandbox (Focal) -->
      <text x="140" y="305" fill="#f08a59" font-size="10.5" font-weight="600" text-anchor="end">Docker Code Runner</text>
      <rect x="660" y="290" width="240" height="26" rx="3" fill="rgba(240,138,89,0.3)" stroke="#f08a59" stroke-width="1.2"/>
      <text x="780" y="307" fill="#f08a59" font-size="8.5" font-weight="600" font-family="'Geist Mono', monospace" text-anchor="middle">Isolated Sandbox &amp; Streams</text>

      <!-- Task 5: ELK & Observability -->
      <text x="140" y="365" fill="#34d399" font-size="10.5" font-weight="600" text-anchor="end">Observability &amp; Release</text>
      <rect x="760" y="350" width="220" height="24" rx="3" fill="#34d399"/>
      <text x="870" y="366" fill="#1e232d" font-size="8" font-weight="600" font-family="'Geist Mono', monospace" text-anchor="middle">100% Production Ready</text>

      <!-- Legend -->
      <line x1="50" y1="465" x2="1050" y2="465" stroke="rgba(248,250,252,0.08)" stroke-width="0.8"/>
      <text x="50" y="485" fill="#94a3b8" font-size="8" font-family="'Geist Mono', monospace" letter-spacing="0.18em">LEGEND</text>
      <rect x="120" y="478" width="14" height="10" rx="2" fill="rgba(240,138,89,0.3)" stroke="#f08a59" stroke-width="1"/>
      <text x="142" y="485" fill="#94a3b8" font-size="8.5">Core Docker Sandbox Milestone</text>
      <rect x="360" y="478" width="14" height="10" rx="2" fill="#34d399"/>
      <text x="382" y="485" fill="#94a3b8" font-size="8.5">100% Project Completion</text>
    </svg>"""

    save_diagram(slug, title, eyebrow, h1, svg)

# ================= 5. DP INTEGRATION: third-party-integrations-map =================
def gen_dp_integration():
    slug = "third-party-integrations-map"
    title = "External Integrations Map"
    h1 = "Integration Topology: OAuth2 Providers, Docker Engine, and Monitoring Agents"
    eyebrow = "Integration Map"

    svg = f"""<svg viewBox="0 0 1100 520" xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="{slug}-title {slug}-desc">
      <title id="{slug}-title">{h1}</title>
      <desc id="{slug}-desc">Integration map highlighting external services: Google, GitHub, Docker Engine, and Prometheus scrapers.</desc>
      <defs>
        <marker id="arrow" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto"><polygon points="0 0, 8 3, 0 6" fill="#94a3b8"/></marker>
        <marker id="arrow-accent" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto"><polygon points="0 0, 8 3, 0 6" fill="#f08a59"/></marker>
      </defs>
      <rect width="100%" height="100%" fill="#1e232d"/>

      <!-- Center Hub: DevOps Suite Monolith (Focal) -->
      <rect x="420" y="160" width="260" height="160" rx="8" fill="rgba(240,138,89,0.08)" stroke="#f08a59" stroke-width="2"/>
      <text x="550" y="210" fill="#f08a59" font-size="14" font-weight="600" text-anchor="middle">DevOps Suite Core</text>
      <text x="550" y="235" fill="#f8fafc" font-size="9" font-family="'Geist Mono', monospace" text-anchor="middle">Spring Boot &bull; Host :8082</text>
      <text x="550" y="255" fill="#94a3b8" font-size="8" font-family="'Geist Mono', monospace" text-anchor="middle">Central Integration Coordinator</text>

      <!-- External Partner 1: Google OAuth2 (North-West) -->
      <line x1="260" y1="120" x2="420" y2="180" stroke="#94a3b8" stroke-width="1.2" marker-end="url(#arrow)"/>
      <rect x="100" y="80" width="160" height="60" rx="4" fill="#242b37" stroke="rgba(248,250,252,0.18)" stroke-width="1"/>
      <text x="180" y="105" fill="#f8fafc" font-size="11" font-weight="600" text-anchor="middle">Google OAuth2</text>
      <text x="180" y="122" fill="#94a3b8" font-size="7.5" font-family="'Geist Mono', monospace" text-anchor="middle">HTTPS &bull; User Profile</text>

      <!-- External Partner 2: GitHub OAuth2 (South-West) -->
      <line x1="260" y1="360" x2="420" y2="300" stroke="#94a3b8" stroke-width="1.2" marker-end="url(#arrow)"/>
      <rect x="100" y="340" width="160" height="60" rx="4" fill="#242b37" stroke="rgba(248,250,252,0.18)" stroke-width="1"/>
      <text x="180" y="365" fill="#f8fafc" font-size="11" font-weight="600" text-anchor="middle">GitHub OAuth2</text>
      <text x="180" y="382" fill="#94a3b8" font-size="7.5" font-family="'Geist Mono', monospace" text-anchor="middle">HTTPS &bull; Code Exchange</text>

      <!-- External Partner 3: Docker Engine API (North-East - Focal) -->
      <line x1="680" y1="180" x2="840" y2="120" stroke="#f08a59" stroke-width="1.5" marker-end="url(#arrow-accent)"/>
      <rect x="840" y="80" width="180" height="65" rx="4" fill="rgba(240,138,89,0.1)" stroke="#f08a59" stroke-width="1.2"/>
      <text x="930" y="105" fill="#f08a59" font-size="11.5" font-weight="600" text-anchor="middle">Docker Engine API</text>
      <text x="930" y="124" fill="#94a3b8" font-size="7.5" font-family="'Geist Mono', monospace" text-anchor="middle">UNIX Socket &bull; Sandbox Runner</text>
      <text x="930" y="138" fill="#94a3b8" font-size="7.5" font-family="'Geist Mono', monospace" text-anchor="middle">Container Lifecycle</text>

      <!-- External Partner 4: Prometheus Scraper (South-East) -->
      <line x1="680" y1="300" x2="840" y2="360" stroke="#94a3b8" stroke-width="1.2" marker-end="url(#arrow)"/>
      <rect x="840" y="340" width="180" height="60" rx="4" fill="#242b37" stroke="rgba(248,250,252,0.18)" stroke-width="1"/>
      <text x="930" y="365" fill="#f8fafc" font-size="11" font-weight="600" text-anchor="middle">Prometheus Scraper</text>
      <text x="930" y="382" fill="#94a3b8" font-size="7.5" font-family="'Geist Mono', monospace" text-anchor="middle">HTTP GET :8081/actuator</text>

      <!-- Legend -->
      <line x1="50" y1="465" x2="1050" y2="465" stroke="rgba(248,250,252,0.08)" stroke-width="0.8"/>
      <text x="50" y="485" fill="#94a3b8" font-size="8" font-family="'Geist Mono', monospace" letter-spacing="0.18em">LEGEND</text>
      <line x1="120" y1="483" x2="150" y2="483" stroke="#f08a59" stroke-width="1.5" marker-end="url(#arrow-accent)"/>
      <text x="158" y="485" fill="#94a3b8" font-size="8.5">Direct Docker Engine IPC Integration</text>
    </svg>"""

    save_diagram(slug, title, eyebrow, h1, svg)

if __name__ == "__main__":
    gen_it_current_state()
    gen_portfolio_summary()
    gen_org_chart()
    gen_gantt()
    gen_dp_integration()
    print("Batch 8 completed!")

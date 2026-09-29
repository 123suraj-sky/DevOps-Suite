import os, sys
from pathlib import Path
sys.path.insert(0, ".")
from scripts.diagram_generator_base import HTML_WRAPPER, DIAGRAMS_DIR

def save_diagram(slug, title, eyebrow, h1, svg):
    html = HTML_WRAPPER.format(title=title, eyebrow=eyebrow, h1=h1, svg_content=svg)
    p = DIAGRAMS_DIR / f"{slug}.html"
    p.write_text(html, encoding="utf-8")
    print(f"Generated {p.name}")

# ================= 1. FLOWCHART: rate-limiting-decision-tree =================
def gen_flowchart():
    slug = "rate-limiting-decision-tree"
    title = "Redis Sliding-Window Rate Limiter Flowchart"
    h1 = "Rate Limiter Decision Flow: Window Verification & Counter Enforcement"
    eyebrow = "Decision Flowchart"

    svg = f"""<svg viewBox="0 0 1100 520" xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="{slug}-title {slug}-desc">
      <title id="{slug}-title">{h1}</title>
      <desc id="{slug}-desc">Flowchart detailing inbound HTTP request evaluation against sliding-window counters in Redis, branching to allow or 429 Too Many Requests.</desc>
      <defs>
        <marker id="arrow" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto"><polygon points="0 0, 8 3, 0 6" fill="#94a3b8"/></marker>
        <marker id="arrow-accent" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto"><polygon points="0 0, 8 3, 0 6" fill="#f08a59"/></marker>
        <marker id="arrow-emerald" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto"><polygon points="0 0, 8 3, 0 6" fill="#34d399"/></marker>
      </defs>
      <rect width="100%" height="100%" fill="#1e232d"/>

      <!-- Arrows before nodes -->
      <line x1="160" y1="180" x2="220" y2="180" stroke="#94a3b8" stroke-width="1.2" marker-end="url(#arrow)"/>
      <line x1="370" y1="180" x2="430" y2="180" stroke="#94a3b8" stroke-width="1.2" marker-end="url(#arrow)"/>
      <!-- Decision: Yes -> Allow -->
      <line x1="580" y1="180" x2="680" y2="180" stroke="#34d399" stroke-width="1.4" marker-end="url(#arrow-emerald)"/>
      <text x="630" y="172" fill="#34d399" font-size="8" font-family="'Geist Mono', monospace" text-anchor="middle">YES (Under)</text>
      <!-- Decision: No -> Reject 429 -->
      <path d="M 505,225 V 320 Q 505,330 515,330 H 680" fill="none" stroke="#f08a59" stroke-width="1.4" marker-end="url(#arrow-accent)"/>
      <text x="540" y="322" fill="#f08a59" font-size="8" font-family="'Geist Mono', monospace">NO (Exceeded)</text>

      <!-- Start Node -->
      <rect x="40" y="150" width="120" height="60" rx="30" fill="#242b37" stroke="rgba(248,250,252,0.2)" stroke-width="1"/>
      <text x="100" y="178" fill="#f8fafc" font-size="11" font-weight="600" text-anchor="middle">Inbound Request</text>
      <text x="100" y="195" fill="#94a3b8" font-size="7.5" font-family="'Geist Mono', monospace" text-anchor="middle">IP / User Key</text>

      <!-- Step 1: Redis Key Lookup -->
      <rect x="220" y="145" width="150" height="70" rx="6" fill="#242b37" stroke="rgba(248,250,252,0.18)" stroke-width="1"/>
      <text x="295" y="172" fill="#f8fafc" font-size="11" font-weight="600" text-anchor="middle">Sliding Window</text>
      <text x="295" y="188" fill="#94a3b8" font-size="8" font-family="'Geist Mono', monospace" text-anchor="middle">ZREMRANGEBYSCORE</text>
      <text x="295" y="202" fill="rgba(148,163,184,0.7)" font-size="7.5" font-family="'Geist Mono', monospace" text-anchor="middle">Remove expired stamps</text>

      <!-- Decision Diamond (Focal) -->
      <polygon points="505,135 580,180 505,225 430,180" fill="rgba(240,138,89,0.1)" stroke="#f08a59" stroke-width="1.5"/>
      <text x="505" y="176" fill="#f8fafc" font-size="10.5" font-weight="600" text-anchor="middle">Count &lt;</text>
      <text x="505" y="192" fill="#f08a59" font-size="9" font-family="'Geist Mono', monospace" text-anchor="middle">Limit Max?</text>

      <!-- Target 1: 200 Allow -->
      <rect x="680" y="145" width="180" height="70" rx="6" fill="rgba(52,211,153,0.06)" stroke="#34d399" stroke-width="1.2"/>
      <text x="770" y="172" fill="#34d399" font-size="11.5" font-weight="600" text-anchor="middle">&#10003; Allow &amp; Pass Through</text>
      <text x="770" y="188" fill="#f8fafc" font-size="8" font-family="'Geist Mono', monospace" text-anchor="middle">ZADD current_timestamp</text>
      <text x="770" y="202" fill="#94a3b8" font-size="7.5" font-family="'Geist Mono', monospace" text-anchor="middle">Proceed to Controller</text>

      <!-- Target 2: 429 Reject -->
      <rect x="680" y="295" width="180" height="70" rx="6" fill="rgba(240,138,89,0.06)" stroke="#f08a59" stroke-width="1.2"/>
      <text x="770" y="322" fill="#f08a59" font-size="11.5" font-weight="600" text-anchor="middle">&times; 429 Too Many Requests</text>
      <text x="770" y="338" fill="#f8fafc" font-size="8" font-family="'Geist Mono', monospace" text-anchor="middle">Retry-After Header</text>
      <text x="770" y="352" fill="#94a3b8" font-size="7.5" font-family="'Geist Mono', monospace" text-anchor="middle">Halt Filter Chain</text>

      <!-- Legend -->
      <line x1="40" y1="465" x2="1060" y2="465" stroke="rgba(248,250,252,0.08)" stroke-width="0.8"/>
      <text x="40" y="485" fill="#94a3b8" font-size="8" font-family="'Geist Mono', monospace" letter-spacing="0.18em">LEGEND</text>
      <line x1="110" y1="483" x2="140" y2="483" stroke="#34d399" stroke-width="1.4" marker-end="url(#arrow-emerald)"/>
      <text x="148" y="485" fill="#94a3b8" font-size="8.5">Allowed Request Branch</text>
      <line x1="330" y1="483" x2="360" y2="483" stroke="#f08a59" stroke-width="1.4" marker-end="url(#arrow-accent)"/>
      <text x="368" y="485" fill="#94a3b8" font-size="8.5">Rate Limit Breached (429)</text>
    </svg>"""

    save_diagram(slug, title, eyebrow, h1, svg)

# ================= 2. TIMELINE: github-actions-ci-cd-timeline =================
def gen_ci_cd_timeline():
    slug = "github-actions-ci-cd-timeline"
    title = "GitHub Actions CI/CD Pipeline Timeline"
    h1 = "Automated Build, Test, Containerization, and Deployment Sequence"
    eyebrow = "Timeline Pipeline"

    svg = f"""<svg viewBox="0 0 1100 520" xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="{slug}-title {slug}-desc">
      <title id="{slug}-title">{h1}</title>
      <desc id="{slug}-desc">Pipeline timeline displaying continuous integration stages: Checkout, Maven build, Docker multi-stage images, and production deployment.</desc>
      <defs>
        <marker id="arrow-accent" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto"><polygon points="0 0, 8 3, 0 6" fill="#f08a59"/></marker>
      </defs>
      <rect width="100%" height="100%" fill="#1e232d"/>

      <!-- Main Horizontal Timeline Spine -->
      <line x1="60" y1="220" x2="1040" y2="220" stroke="rgba(248,250,252,0.18)" stroke-width="2"/>

      <!-- Milestones -->
      <!-- Milestone 1: Checkout -->
      <circle cx="120" cy="220" r="10" fill="#242b37" stroke="#60a5fa" stroke-width="2"/>
      <line x1="120" y1="220" x2="120" y2="120" stroke="#60a5fa" stroke-width="1.2"/>
      <rect x="50" y="70" width="140" height="50" rx="4" fill="#242b37" stroke="rgba(248,250,252,0.15)" stroke-width="0.8"/>
      <text x="65" y="92" fill="#60a5fa" font-size="10.5" font-weight="600">01. Checkout</text>
      <text x="65" y="108" fill="#94a3b8" font-size="8" font-family="'Geist Mono', monospace">git pull &bull; 5s</text>

      <!-- Milestone 2: Maven Backend Build -->
      <circle cx="340" cy="220" r="10" fill="#242b37" stroke="#60a5fa" stroke-width="2"/>
      <line x1="340" y1="220" x2="340" y2="290" stroke="#60a5fa" stroke-width="1.2"/>
      <rect x="270" y="290" width="140" height="60" rx="4" fill="#242b37" stroke="rgba(248,250,252,0.15)" stroke-width="0.8"/>
      <text x="285" y="312" fill="#f8fafc" font-size="10.5" font-weight="600">02. Maven Build</text>
      <text x="285" y="328" fill="#94a3b8" font-size="8" font-family="'Geist Mono', monospace">Java 21 Unit Tests</text>
      <text x="285" y="342" fill="#94a3b8" font-size="7.5" font-family="'Geist Mono', monospace">Flyway migration dry-run</text>

      <!-- Milestone 3: Frontend Vite Build -->
      <circle cx="560" cy="220" r="10" fill="#242b37" stroke="#60a5fa" stroke-width="2"/>
      <line x1="560" y1="220" x2="560" y2="120" stroke="#60a5fa" stroke-width="1.2"/>
      <rect x="490" y="70" width="140" height="50" rx="4" fill="#242b37" stroke="rgba(248,250,252,0.15)" stroke-width="0.8"/>
      <text x="505" y="92" fill="#f8fafc" font-size="10.5" font-weight="600">03. Frontend Vite</text>
      <text x="505" y="108" fill="#94a3b8" font-size="8" font-family="'Geist Mono', monospace">npm run build &bull; 15s</text>

      <!-- Milestone 4: Docker Multi-Stage (Focal) -->
      <circle cx="780" cy="220" r="12" fill="rgba(240,138,89,0.2)" stroke="#f08a59" stroke-width="2.5"/>
      <line x1="780" y1="220" x2="780" y2="290" stroke="#f08a59" stroke-width="1.5"/>
      <rect x="695" y="290" width="170" height="65" rx="4" fill="rgba(240,138,89,0.08)" stroke="#f08a59" stroke-width="1.2"/>
      <text x="710" y="314" fill="#f08a59" font-size="11" font-weight="600">04. Multi-Stage Docker</text>
      <text x="710" y="332" fill="#f8fafc" font-size="8" font-family="'Geist Mono', monospace">Minimal JRE Alpine Image</text>
      <text x="710" y="346" fill="#94a3b8" font-size="7.5" font-family="'Geist Mono', monospace">Cached layers</text>

      <!-- Milestone 5: Deploy & Healthcheck -->
      <circle cx="980" cy="220" r="10" fill="#242b37" stroke="#34d399" stroke-width="2"/>
      <line x1="980" y1="220" x2="980" y2="120" stroke="#34d399" stroke-width="1.2"/>
      <rect x="910" y="70" width="140" height="50" rx="4" fill="#242b37" stroke="rgba(52,211,153,0.3)" stroke-width="0.8"/>
      <text x="925" y="92" fill="#34d399" font-size="10.5" font-weight="600">05. Live Restart</text>
      <text x="925" y="108" fill="#94a3b8" font-size="8" font-family="'Geist Mono', monospace">Healthcheck :8082 &bull; 200</text>

      <!-- Legend -->
      <line x1="40" y1="465" x2="1060" y2="465" stroke="rgba(248,250,252,0.08)" stroke-width="0.8"/>
      <text x="40" y="485" fill="#94a3b8" font-size="8" font-family="'Geist Mono', monospace" letter-spacing="0.18em">LEGEND</text>
      <circle cx="120" cy="482" r="5" fill="#f08a59"/>
      <text x="135" y="485" fill="#94a3b8" font-size="8.5">Core Docker Image Packaging Phase</text>
      <circle cx="360" cy="482" r="5" fill="#34d399"/>
      <text x="375" y="485" fill="#94a3b8" font-size="8.5">Verified Production Deployment</text>
    </svg>"""

    save_diagram(slug, title, eyebrow, h1, svg)

# ================= 3. STORY MAP: product-features-story-map =================
def gen_story_map():
    slug = "product-features-story-map"
    title = "Product Features & User Story Map"
    h1 = "DevOps Suite Capabilities Decomposed into User Activities and Iterations"
    eyebrow = "Story Map"

    svg = f"""<svg viewBox="0 0 1100 520" xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="{slug}-title {slug}-desc">
      <title id="{slug}-title">{h1}</title>
      <desc id="{slug}-desc">Story map showing user activities across Authentication, Kanban, Code Execution, and Observability releases.</desc>
      <rect width="100%" height="100%" fill="#1e232d"/>

      <!-- Backbone Activities Header -->
      <rect x="40" y="60" width="240" height="40" rx="4" fill="#242b37" stroke="rgba(248,250,252,0.18)" stroke-width="1"/>
      <text x="160" y="85" fill="#f8fafc" font-size="11" font-weight="600" text-anchor="middle">Auth &amp; RBAC</text>

      <rect x="300" y="60" width="240" height="40" rx="4" fill="#242b37" stroke="rgba(248,250,252,0.18)" stroke-width="1"/>
      <text x="420" y="85" fill="#f8fafc" font-size="11" font-weight="600" text-anchor="middle">Kanban Management</text>

      <rect x="560" y="60" width="240" height="40" rx="4" fill="rgba(240,138,89,0.15)" stroke="#f08a59" stroke-width="1.2"/>
      <text x="680" y="85" fill="#f08a59" font-size="11" font-weight="600" text-anchor="middle">Sandboxed IDE &amp; Runner</text>

      <rect x="820" y="60" width="240" height="40" rx="4" fill="#242b37" stroke="rgba(248,250,252,0.18)" stroke-width="1"/>
      <text x="940" y="85" fill="#f8fafc" font-size="11" font-weight="600" text-anchor="middle">Observability &amp; Logs</text>

      <!-- Release 1.0 Strip -->
      <line x1="40" y1="125" x2="1060" y2="125" stroke="rgba(248,250,252,0.15)" stroke-width="0.8"/>
      <text x="40" y="145" fill="#60a5fa" font-size="8" font-family="'Geist Mono', monospace">RELEASE 1.0 (MVP)</text>

      <!-- Cards R1.0 -->
      <!-- Auth -->
      <rect x="40" y="160" width="240" height="55" rx="4" fill="#242b37" stroke="rgba(248,250,252,0.1)" stroke-width="0.8"/>
      <text x="55" y="185" fill="#f8fafc" font-size="10">JWT Local Registration</text>
      <text x="55" y="200" fill="#94a3b8" font-size="7.5" font-family="'Geist Mono', monospace">BCrypt password hashing</text>

      <!-- Kanban -->
      <rect x="300" y="160" width="240" height="55" rx="4" fill="#242b37" stroke="rgba(248,250,252,0.1)" stroke-width="0.8"/>
      <text x="315" y="185" fill="#f8fafc" font-size="10">Projects, Boards, Columns</text>
      <text x="315" y="200" fill="#94a3b8" font-size="7.5" font-family="'Geist Mono', monospace">Flyway migration tables</text>

      <!-- Runner (Focal) -->
      <rect x="560" y="160" width="240" height="55" rx="4" fill="rgba(240,138,89,0.06)" stroke="#f08a59" stroke-width="1"/>
      <text x="575" y="185" fill="#f08a59" font-size="10" font-weight="600">Docker Sandbox CLI Runner</text>
      <text x="575" y="200" fill="#94a3b8" font-size="7.5" font-family="'Geist Mono', monospace">256MB memory cap</text>

      <!-- Obs -->
      <rect x="820" y="160" width="240" height="55" rx="4" fill="#242b37" stroke="rgba(248,250,252,0.1)" stroke-width="0.8"/>
      <text x="835" y="185" fill="#f8fafc" font-size="10">Actuator Scraping</text>
      <text x="835" y="200" fill="#94a3b8" font-size="7.5" font-family="'Geist Mono', monospace">Prometheus metrics raw</text>

      <!-- Release 2.0 Strip -->
      <line x1="40" y1="245" x2="1060" y2="245" stroke="rgba(248,250,252,0.15)" stroke-width="0.8"/>
      <text x="40" y="265" fill="#34d399" font-size="8" font-family="'Geist Mono', monospace">RELEASE 2.0 (ENTERPRISE / COMPLETED)</text>

      <!-- Cards R2.0 -->
      <!-- Auth -->
      <rect x="40" y="280" width="240" height="55" rx="4" fill="#242b37" stroke="rgba(248,250,252,0.1)" stroke-width="0.8"/>
      <text x="55" y="305" fill="#f8fafc" font-size="10">Google &amp; GitHub OAuth2</text>
      <text x="55" y="320" fill="#94a3b8" font-size="7.5" font-family="'Geist Mono', monospace">Redis token blacklisting</text>

      <!-- Kanban -->
      <rect x="300" y="280" width="240" height="55" rx="4" fill="#242b37" stroke="rgba(248,250,252,0.1)" stroke-width="0.8"/>
      <text x="315" y="305" fill="#f8fafc" font-size="10">Live STOMP Sync &amp; WIP</text>
      <text x="315" y="320" fill="#94a3b8" font-size="7.5" font-family="'Geist Mono', monospace">Task history audit log</text>

      <!-- Runner -->
      <rect x="560" y="280" width="240" height="55" rx="4" fill="rgba(240,138,89,0.06)" stroke="#f08a59" stroke-width="1"/>
      <text x="575" y="305" fill="#f08a59" font-size="10" font-weight="600">Web IDE + Live Stream WS</text>
      <text x="575" y="320" fill="#94a3b8" font-size="7.5" font-family="'Geist Mono', monospace">DB file tree persistence</text>

      <!-- Obs -->
      <rect x="820" y="280" width="240" height="55" rx="4" fill="#242b37" stroke="rgba(248,250,252,0.1)" stroke-width="0.8"/>
      <text x="835" y="305" fill="#f8fafc" font-size="10">ELK Logging &amp; Grafana</text>
      <text x="835" y="320" fill="#94a3b8" font-size="7.5" font-family="'Geist Mono', monospace">Proxied dashboard access</text>

      <!-- Legend -->
      <line x1="40" y1="465" x2="1060" y2="465" stroke="rgba(248,250,252,0.08)" stroke-width="0.8"/>
      <text x="40" y="485" fill="#94a3b8" font-size="8" font-family="'Geist Mono', monospace" letter-spacing="0.18em">LEGEND</text>
      <rect x="110" y="478" width="14" height="10" rx="2" fill="rgba(240,138,89,0.2)" stroke="#f08a59" stroke-width="1"/>
      <text x="132" y="485" fill="#94a3b8" font-size="8.5">Core Product Differentiator (Code Execution Sandbox)</text>
    </svg>"""

    save_diagram(slug, title, eyebrow, h1, svg)

# ================= 4. NESTED: project-domain-aggregates =================
def gen_nested_aggregates():
    slug = "project-domain-aggregates"
    title = "Domain-Driven Design (DDD) Aggregates"
    h1 = "DDD Aggregate Roots, Entities, and Encapsulated Domain Boundaries"
    eyebrow = "Nested Aggregates"

    svg = f"""<svg viewBox="0 0 1100 520" xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="{slug}-title {slug}-desc">
      <title id="{slug}-title">{h1}</title>
      <desc id="{slug}-desc">Nested boundary diagram showing Domain-Driven Design aggregate roots and value boundaries.</desc>
      <rect width="100%" height="100%" fill="#1e232d"/>

      <!-- Aggregate 1: PROJECT AGGREGATE (Focal Outer Box) -->
      <rect x="40" y="60" width="680" height="380" rx="8" fill="rgba(240,138,89,0.02)" stroke="#f08a59" stroke-width="1.5"/>
      <text x="60" y="85" fill="#f08a59" font-size="11.5" font-weight="600">AGGREGATE ROOT: Project</text>

      <!-- Inner Entity: Kanban Board -->
      <rect x="70" y="110" width="620" height="180" rx="6" fill="#242b37" stroke="rgba(248,250,252,0.15)" stroke-width="1"/>
      <text x="90" y="135" fill="#f8fafc" font-size="11" font-weight="600">Entity: KanbanBoard</text>

      <!-- Columns inside Board -->
      <rect x="90" y="155" width="270" height="110" rx="4" fill="rgba(248,250,252,0.03)" stroke="rgba(248,250,252,0.1)" stroke-width="0.8"/>
      <text x="105" y="175" fill="#f8fafc" font-size="10">Entity: KanbanColumn</text>
      <!-- Task inside Column -->
      <rect x="105" y="190" width="240" height="60" rx="2" fill="#1e232d" stroke="rgba(240,138,89,0.3)" stroke-width="0.8"/>
      <text x="120" y="212" fill="#f08a59" font-size="9.5" font-weight="500">Entity: Task</text>
      <text x="120" y="230" fill="#94a3b8" font-size="7.5" font-family="'Geist Mono', monospace">Value Object: TaskPriority</text>

      <rect x="400" y="155" width="270" height="110" rx="4" fill="rgba(248,250,252,0.03)" stroke="rgba(248,250,252,0.1)" stroke-width="0.8"/>
      <text x="415" y="175" fill="#f8fafc" font-size="10">Entity: IdeFile</text>
      <text x="415" y="200" fill="#94a3b8" font-size="8" font-family="'Geist Mono', monospace">File path + DB blob content</text>
      <text x="415" y="220" fill="#94a3b8" font-size="8" font-family="'Geist Mono', monospace">Scoped strictly to project</text>

      <!-- Aggregate 2: USER AGGREGATE -->
      <rect x="760" y="60" width="300" height="380" rx="8" fill="rgba(248,250,252,0.015)" stroke="rgba(248,250,252,0.18)" stroke-width="1"/>
      <text x="780" y="85" fill="#f8fafc" font-size="11.5" font-weight="600">AGGREGATE ROOT: User</text>
      <rect x="780" y="110" width="260" height="80" rx="4" fill="#242b37" stroke="rgba(248,250,252,0.15)" stroke-width="0.8"/>
      <text x="795" y="135" fill="#f8fafc" font-size="10.5">Value Object: Role</text>
      <text x="795" y="152" fill="#94a3b8" font-size="8" font-family="'Geist Mono', monospace">OWNER &bull; ADMIN &bull; MEMBER</text>

      <rect x="780" y="210" width="260" height="90" rx="4" fill="#242b37" stroke="rgba(248,250,252,0.15)" stroke-width="0.8"/>
      <text x="795" y="235" fill="#f8fafc" font-size="10.5">Entity: ProjectMember</text>
      <text x="795" y="252" fill="#94a3b8" font-size="8" font-family="'Geist Mono', monospace">Association with RBAC override</text>

      <!-- Legend -->
      <line x1="40" y1="465" x2="1060" y2="465" stroke="rgba(248,250,252,0.08)" stroke-width="0.8"/>
      <text x="40" y="485" fill="#94a3b8" font-size="8" font-family="'Geist Mono', monospace" letter-spacing="0.18em">LEGEND</text>
      <rect x="110" y="478" width="14" height="10" rx="2" fill="rgba(240,138,89,0.2)" stroke="#f08a59" stroke-width="1"/>
      <text x="132" y="485" fill="#94a3b8" font-size="8.5">Core Bounded Aggregate Root</text>
    </svg>"""

    save_diagram(slug, title, eyebrow, h1, svg)

# ================= 5. UML CLASS: backend-domain-classes =================
def gen_uml_classes():
    slug = "backend-domain-classes"
    title = "Backend Domain UML Class Diagram"
    h1 = "Core Service, Repository, and Entity UML Class Hierarchy"
    eyebrow = "UML Class"

    svg = f"""<svg viewBox="0 0 1100 520" xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="{slug}-title {slug}-desc">
      <title id="{slug}-title">{h1}</title>
      <desc id="{slug}-desc">UML class diagram illustrating relationships between TaskController, TaskService, TaskRepository, and Task entity.</desc>
      <defs>
        <marker id="arrow" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto"><polygon points="0 0, 8 3, 0 6" fill="#94a3b8"/></marker>
        <marker id="arrow-white" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto"><polygon points="0 0, 8 3, 0 6" fill="#f8fafc"/></marker>
      </defs>
      <rect width="100%" height="100%" fill="#1e232d"/>

      <!-- Connectors -->
      <line x1="240" y1="180" x2="330" y2="180" stroke="#94a3b8" stroke-width="1.2" marker-end="url(#arrow)"/>
      <line x1="570" y1="180" x2="660" y2="180" stroke="#94a3b8" stroke-width="1.2" marker-end="url(#arrow)"/>
      <line x1="770" y1="260" x2="770" y2="330" stroke="#f08a59" stroke-width="1.2" marker-end="url(#arrow)"/>

      <!-- Class 1: TaskController -->
      <rect x="40" y="110" width="200" height="150" rx="4" fill="#242b37" stroke="rgba(248,250,252,0.18)" stroke-width="1"/>
      <rect x="40" y="110" width="200" height="26" rx="4" fill="rgba(248,250,252,0.06)"/>
      <text x="140" y="128" fill="#f8fafc" font-size="11" font-weight="600" text-anchor="middle">&laquo;RestController&raquo; TaskController</text>
      <line x1="40" y1="136" x2="240" y2="136" stroke="rgba(248,250,252,0.1)" stroke-width="0.8"/>
      <text x="50" y="155" fill="#94a3b8" font-size="8" font-family="'Geist Mono', monospace">- taskService: TaskService</text>
      <line x1="40" y1="168" x2="240" y2="168" stroke="rgba(248,250,252,0.1)" stroke-width="0.8"/>
      <text x="50" y="188" fill="#f8fafc" font-size="8" font-family="'Geist Mono', monospace">+ createTask(req): TaskDTO</text>
      <text x="50" y="206" fill="#f8fafc" font-size="8" font-family="'Geist Mono', monospace">+ moveTask(id, colId): void</text>
      <text x="50" y="224" fill="#f8fafc" font-size="8" font-family="'Geist Mono', monospace">+ updateTask(id, req): TaskDTO</text>

      <!-- Class 2: TaskService (Focal) -->
      <rect x="330" y="95" width="240" height="180" rx="4" fill="#242b37" stroke="#f08a59" stroke-width="1.5"/>
      <rect x="330" y="95" width="240" height="26" rx="4" fill="rgba(240,138,89,0.15)"/>
      <text x="450" y="113" fill="#f08a59" font-size="11" font-weight="600" text-anchor="middle">&laquo;Service&raquo; TaskServiceImpl</text>
      <line x1="330" y1="121" x2="570" y2="121" stroke="rgba(248,250,252,0.1)" stroke-width="0.8"/>
      <text x="340" y="138" fill="#94a3b8" font-size="8" font-family="'Geist Mono', monospace">- taskRepo: TaskRepository</text>
      <text x="340" y="154" fill="#94a3b8" font-size="8" font-family="'Geist Mono', monospace">- eventPublisher: EventPublisher</text>
      <line x1="330" y1="164" x2="570" y2="164" stroke="rgba(248,250,252,0.1)" stroke-width="0.8"/>
      <text x="340" y="184" fill="#f8fafc" font-size="8" font-family="'Geist Mono', monospace">+ createTask(TaskDTO): Task</text>
      <text x="340" y="202" fill="#f8fafc" font-size="8" font-family="'Geist Mono', monospace">+ moveTask(Long, Long): void</text>
      <text x="340" y="220" fill="#f8fafc" font-size="8" font-family="'Geist Mono', monospace">+ validateWipLimit(Long): bool</text>
      <text x="340" y="238" fill="#f8fafc" font-size="8" font-family="'Geist Mono', monospace">+ logAuditHistory(Task): void</text>

      <!-- Class 3: TaskRepository -->
      <rect x="660" y="110" width="220" height="150" rx="4" fill="#242b37" stroke="rgba(248,250,252,0.18)" stroke-width="1"/>
      <rect x="660" y="110" width="220" height="26" rx="4" fill="rgba(248,250,252,0.06)"/>
      <text x="770" y="128" fill="#f8fafc" font-size="11" font-weight="600" text-anchor="middle">&laquo;JpaRepository&raquo; TaskRepository</text>
      <line x1="660" y1="136" x2="880" y2="136" stroke="rgba(248,250,252,0.1)" stroke-width="0.8"/>
      <text x="670" y="155" fill="#94a3b8" font-size="8" font-family="'Geist Mono', monospace">Spring Data JPA Interface</text>
      <line x1="660" y1="168" x2="880" y2="168" stroke="rgba(248,250,252,0.1)" stroke-width="0.8"/>
      <text x="670" y="188" fill="#f8fafc" font-size="8" font-family="'Geist Mono', monospace">+ findByColumnId(id): List&lt;Task&gt;</text>
      <text x="670" y="206" fill="#f8fafc" font-size="8" font-family="'Geist Mono', monospace">+ countByColumnId(id): long</text>

      <!-- Class 4: Task Entity -->
      <rect x="660" y="330" width="220" height="120" rx="4" fill="#242b37" stroke="rgba(240,138,89,0.4)" stroke-width="1"/>
      <rect x="660" y="330" width="220" height="26" rx="4" fill="rgba(240,138,89,0.1)"/>
      <text x="770" y="348" fill="#f08a59" font-size="11" font-weight="600" text-anchor="middle">&laquo;Entity&raquo; Task</text>
      <line x1="660" y1="356" x2="880" y2="356" stroke="rgba(248,250,252,0.1)" stroke-width="0.8"/>
      <text x="670" y="375" fill="#f8fafc" font-size="8" font-family="'Geist Mono', monospace">- id: Long</text>
      <text x="670" y="392" fill="#f8fafc" font-size="8" font-family="'Geist Mono', monospace">- title: String</text>
      <text x="670" y="410" fill="#f8fafc" font-size="8" font-family="'Geist Mono', monospace">- column: Column</text>

      <!-- Legend -->
      <line x1="40" y1="465" x2="1060" y2="465" stroke="rgba(248,250,252,0.08)" stroke-width="0.8"/>
      <text x="40" y="485" fill="#94a3b8" font-size="8" font-family="'Geist Mono', monospace" letter-spacing="0.18em">LEGEND</text>
      <rect x="110" y="478" width="14" height="10" rx="2" fill="rgba(240,138,89,0.2)" stroke="#f08a59" stroke-width="1"/>
      <text x="132" y="485" fill="#94a3b8" font-size="8.5">Core Business Logic Service Component</text>
    </svg>"""

    save_diagram(slug, title, eyebrow, h1, svg)

if __name__ == "__main__":
    gen_flowchart()
    gen_ci_cd_timeline()
    gen_story_map()
    gen_nested_aggregates()
    gen_uml_classes()
    print("Batch 3 completed!")

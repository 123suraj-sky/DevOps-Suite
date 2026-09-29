import os, sys
from pathlib import Path
sys.path.insert(0, ".")
from scripts.diagram_generator_base import HTML_WRAPPER, DIAGRAMS_DIR

def save_diagram(slug, title, eyebrow, h1, svg):
    html = HTML_WRAPPER.format(title=title, eyebrow=eyebrow, h1=h1, svg_content=svg)
    p = DIAGRAMS_DIR / f"{slug}.html"
    p.write_text(html, encoding="utf-8")
    print(f"Generated {p.name}")

# ================= 1. SEQUENCE: auth-oauth2-jwt-sequence =================
def gen_auth_sequence():
    slug = "auth-oauth2-jwt-sequence"
    title = "Dual OAuth2 & JWT Security Flow"
    h1 = "OAuth2 Code Exchange & JWT Issuance with Redis Token Blacklisting"
    eyebrow = "Sequence Flow"
    
    svg = f"""<svg viewBox="0 0 1100 580" xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="{slug}-title {slug}-desc">
      <title id="{slug}-title">{h1}</title>
      <desc id="{slug}-desc">Sequence diagram tracing client authentication through Google and GitHub OAuth2, JWT issuance, protected endpoint requests via JwtRequestFilter, and Redis logout blacklisting.</desc>
      <defs>
        <marker id="arrow" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto"><polygon points="0 0, 8 3, 0 6" fill="#94a3b8"/></marker>
        <marker id="arrow-accent" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto"><polygon points="0 0, 8 3, 0 6" fill="#f08a59"/></marker>
        <marker id="arrow-blue" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto"><polygon points="0 0, 8 3, 0 6" fill="#60a5fa"/></marker>
      </defs>
      <rect width="100%" height="100%" fill="#1e232d"/>

      <!-- Actors Header -->
      <!-- Actor 1: Browser -->
      <rect x="50" y="30" width="130" height="44" rx="6" fill="#242b37" stroke="rgba(248,250,252,0.2)" stroke-width="1"/>
      <text x="115" y="56" fill="#f8fafc" font-size="11.5" font-weight="600" text-anchor="middle">Browser / React SPA</text>
      <!-- Actor 2: OAuth Provider -->
      <rect x="260" y="30" width="140" height="44" rx="6" fill="#242b37" stroke="rgba(248,250,252,0.2)" stroke-width="1"/>
      <text x="330" y="56" fill="#f8fafc" font-size="11.5" font-weight="600" text-anchor="middle">Google / GitHub IDP</text>
      <!-- Actor 3: Spring Security Monolith (Focal) -->
      <rect x="470" y="30" width="160" height="44" rx="6" fill="rgba(240,138,89,0.1)" stroke="#f08a59" stroke-width="1.2"/>
      <text x="550" y="56" fill="#f08a59" font-size="11.5" font-weight="600" text-anchor="middle">Spring Security Monolith</text>
      <!-- Actor 4: Redis Cache -->
      <rect x="710" y="30" width="130" height="44" rx="6" fill="#242b37" stroke="rgba(248,250,252,0.2)" stroke-width="1"/>
      <text x="775" y="56" fill="#f8fafc" font-size="11.5" font-weight="600" text-anchor="middle">Redis Token Store</text>
      <!-- Actor 5: PostgreSQL -->
      <rect x="910" y="30" width="130" height="44" rx="6" fill="#242b37" stroke="rgba(248,250,252,0.2)" stroke-width="1"/>
      <text x="975" y="56" fill="#f8fafc" font-size="11.5" font-weight="600" text-anchor="middle">PostgreSQL Users</text>

      <!-- Lifelines -->
      <line x1="115" y1="74" x2="115" y2="520" stroke="rgba(248,250,252,0.15)" stroke-width="1" stroke-dasharray="3,3"/>
      <line x1="330" y1="74" x2="330" y2="520" stroke="rgba(248,250,252,0.15)" stroke-width="1" stroke-dasharray="3,3"/>
      <line x1="550" y1="74" x2="550" y2="520" stroke="rgba(248,250,252,0.15)" stroke-width="1" stroke-dasharray="3,3"/>
      <line x1="775" y1="74" x2="775" y2="520" stroke="rgba(248,250,252,0.15)" stroke-width="1" stroke-dasharray="3,3"/>
      <line x1="975" y1="74" x2="975" y2="520" stroke="rgba(248,250,252,0.15)" stroke-width="1" stroke-dasharray="3,3"/>

      <!-- Activation Bars -->
      <rect x="111" y="90" width="8" height="380" fill="rgba(248,250,252,0.06)" stroke="#94a3b8" stroke-width="0.8"/>
      <rect x="326" y="110" width="8" height="60" fill="rgba(248,250,252,0.06)" stroke="#94a3b8" stroke-width="0.8"/>
      <rect x="546" y="140" width="8" height="340" fill="rgba(240,138,89,0.15)" stroke="#f08a59" stroke-width="1"/>
      <rect x="771" y="240" width="8" height="40" fill="rgba(248,250,252,0.06)" stroke="#94a3b8" stroke-width="0.8"/>
      <rect x="771" y="440" width="8" height="40" fill="rgba(248,250,252,0.06)" stroke="#94a3b8" stroke-width="0.8"/>
      <rect x="971" y="180" width="8" height="50" fill="rgba(248,250,252,0.06)" stroke="#94a3b8" stroke-width="0.8"/>

      <!-- Messages -->
      <!-- 1. Browser -> IDP -->
      <line x1="119" y1="115" x2="326" y2="115" stroke="#60a5fa" stroke-width="1.2" marker-end="url(#arrow-blue)"/>
      <text x="220" y="108" fill="#60a5fa" font-size="8" font-family="'Geist Mono', monospace" text-anchor="middle">1. OAuth Redirect &amp; Consent</text>

      <!-- 2. IDP -> Browser Code -->
      <line x1="326" y1="145" x2="119" y2="145" stroke="#94a3b8" stroke-width="1" stroke-dasharray="4,3" marker-end="url(#arrow)"/>
      <text x="220" y="138" fill="#94a3b8" font-size="8" font-family="'Geist Mono', monospace" text-anchor="middle">2. Callback with auth code</text>

      <!-- 3. Browser -> Spring Boot Token Exchange -->
      <line x1="119" y1="175" x2="546" y2="175" stroke="#f08a59" stroke-width="1.2" marker-end="url(#arrow-accent)"/>
      <text x="330" y="168" fill="#f08a59" font-size="8" font-family="'Geist Mono', monospace" text-anchor="middle">3. POST /api/auth/oauth2/callback (code)</text>

      <!-- 4. Spring Boot -> DB Upsert User -->
      <line x1="554" y1="195" x2="971" y2="195" stroke="#94a3b8" stroke-width="1" marker-end="url(#arrow)"/>
      <text x="760" y="188" fill="#94a3b8" font-size="8" font-family="'Geist Mono', monospace" text-anchor="middle">4. Load / Register User (RBAC Role)</text>
      <line x1="971" y1="215" x2="554" y2="215" stroke="#94a3b8" stroke-width="1" stroke-dasharray="4,3" marker-end="url(#arrow)"/>
      <text x="760" y="210" fill="#94a3b8" font-size="8" font-family="'Geist Mono', monospace" text-anchor="middle">User entity returned</text>

      <!-- 5. Headline Success: Token Pair to Browser -->
      <line x1="546" y1="245" x2="119" y2="245" stroke="#f08a59" stroke-width="1.4" marker-end="url(#arrow-accent)"/>
      <rect x="230" y="235" width="200" height="15" rx="2" fill="#1e232d"/>
      <text x="330" y="246" fill="#f08a59" font-size="8" font-weight="600" font-family="'Geist Mono', monospace" text-anchor="middle">5. 200 OK: JWT (1h) + Refresh (7d)</text>

      <!-- Combined Fragment: ALT [Authorized API Request vs Logged out / Blacklisted] -->
      <rect x="80" y="280" width="760" height="135" rx="4" fill="rgba(248,250,252,0.015)" stroke="rgba(248,250,252,0.18)" stroke-width="1"/>
      <rect x="80" y="280" width="40" height="16" rx="2" fill="#1e232d" stroke="rgba(248,250,252,0.18)" stroke-width="1"/>
      <text x="100" y="292" fill="#94a3b8" font-size="8" font-family="'Geist Mono', monospace" text-anchor="middle">ALT</text>
      <text x="135" y="292" fill="#94a3b8" font-size="7.5" font-family="'Geist Mono', monospace">[Token Active &amp; Valid]</text>

      <!-- Flow in ALT: Token check in Redis -->
      <line x1="119" y1="315" x2="546" y2="315" stroke="#60a5fa" stroke-width="1.2" marker-end="url(#arrow-blue)"/>
      <text x="330" y="308" fill="#60a5fa" font-size="8" font-family="'Geist Mono', monospace" text-anchor="middle">GET /api/projects (Bearer JWT)</text>
      <line x1="554" y1="325" x2="771" y2="325" stroke="#94a3b8" stroke-width="1" marker-end="url(#arrow)"/>
      <text x="660" y="320" fill="#94a3b8" font-size="8" font-family="'Geist Mono', monospace" text-anchor="middle">Check isBlacklisted(jti)</text>
      <line x1="771" y1="340" x2="554" y2="340" stroke="#94a3b8" stroke-width="1" stroke-dasharray="4,3" marker-end="url(#arrow)"/>
      <text x="660" y="335" fill="#94a3b8" font-size="8" font-family="'Geist Mono', monospace" text-anchor="middle">false (cache miss)</text>
      <line x1="546" y1="355" x2="119" y2="355" stroke="#60a5fa" stroke-width="1" stroke-dasharray="4,3" marker-end="url(#arrow-blue)"/>
      <text x="330" y="350" fill="#60a5fa" font-size="8" font-family="'Geist Mono', monospace" text-anchor="middle">200 OK + Resource Data</text>

      <!-- Alt Divider -->
      <line x1="85" y1="370" x2="835" y2="370" stroke="rgba(248,250,252,0.18)" stroke-width="1" stroke-dasharray="4,3"/>
      <text x="135" y="384" fill="#94a3b8" font-size="7.5" font-family="'Geist Mono', monospace">[On User Logout]</text>

      <!-- Logout message -->
      <line x1="119" y1="400" x2="546" y2="400" stroke="#f08a59" stroke-width="1.2" marker-end="url(#arrow-accent)"/>
      <text x="330" y="394" fill="#f08a59" font-size="8" font-family="'Geist Mono', monospace" text-anchor="middle">POST /api/auth/logout</text>
      <line x1="554" y1="410" x2="771" y2="410" stroke="#f08a59" stroke-width="1.2" marker-end="url(#arrow-accent)"/>
      <text x="660" y="404" fill="#f08a59" font-size="8" font-family="'Geist Mono', monospace" text-anchor="middle">SET blacklist:&#123;jti&#125; TTL=exp</text>

      <!-- Final logout response -->
      <line x1="546" y1="455" x2="119" y2="455" stroke="#94a3b8" stroke-width="1" stroke-dasharray="4,3" marker-end="url(#arrow)"/>
      <text x="330" y="448" fill="#94a3b8" font-size="8" font-family="'Geist Mono', monospace" text-anchor="middle">200 OK: Logged out successfully</text>

      <!-- Legend -->
      <line x1="50" y1="535" x2="1050" y2="535" stroke="rgba(248,250,252,0.08)" stroke-width="0.8"/>
      <text x="50" y="552" fill="#94a3b8" font-size="8" font-family="'Geist Mono', monospace" letter-spacing="0.18em">LEGEND</text>
      <line x1="120" y1="550" x2="150" y2="550" stroke="#f08a59" stroke-width="1.4" marker-end="url(#arrow-accent)"/>
      <text x="158" y="552" fill="#94a3b8" font-size="8.5">Auth / Token Issuance Flow</text>
      <line x1="370" y1="550" x2="400" y2="550" stroke="#60a5fa" stroke-width="1.2" marker-end="url(#arrow-blue)"/>
      <text x="408" y="552" fill="#94a3b8" font-size="8.5">Authenticated REST Call</text>
      <line x1="600" y1="550" x2="630" y2="550" stroke="#94a3b8" stroke-width="1" stroke-dasharray="4,3" marker-end="url(#arrow)"/>
      <text x="638" y="552" fill="#94a3b8" font-size="8.5">Async / Cache Verification</text>
    </svg>"""

    save_diagram(slug, title, eyebrow, h1, svg)

# ================= 2. DB SCHEMA: db-schema-flyway =================
def gen_db_schema():
    slug = "db-schema-flyway"
    title = "Physical Database Schema · Flyway Migrations"
    h1 = "DevOps Suite Database Schema (V1–V16) with Column Constraints & Cascades"
    eyebrow = "Database Schema"

    svg = f"""<svg viewBox="0 0 1120 620" xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="{slug}-title {slug}-desc">
      <title id="{slug}-title">{h1}</title>
      <desc id="{slug}-desc">Physical schema diagram showing core tables across users, projects, kanban boards, tasks, and task history with foreign key cascade relationships.</desc>
      <defs>
        <marker id="arrow" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto"><polygon points="0 0, 8 3, 0 6" fill="#94a3b8"/></marker>
        <marker id="arrow-accent" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto"><polygon points="0 0, 8 3, 0 6" fill="#f08a59"/></marker>
      </defs>
      <rect width="100%" height="100%" fill="#1e232d"/>

      <!-- Group: KANBAN DOMAIN -->
      <rect x="360" y="30" width="730" height="520" rx="8" fill="rgba(248,250,252,0.015)" stroke="rgba(248,250,252,0.1)" stroke-width="0.8" stroke-dasharray="4,4"/>
      <text x="375" y="48" fill="#94a3b8" font-size="8" font-family="'Geist Mono', monospace" letter-spacing="0.14em">KANBAN &amp; PROJECT DOMAIN</text>

      <!-- Connectors (drawn before tables) -->
      <!-- projects.owner_id -> users.id -->
      <path d="M 380,120 H 330 Q 320,120 320,135 V 150 Q 320,165 310,165 H 260" fill="none" stroke="#94a3b8" stroke-width="1" marker-end="url(#arrow)"/>
      <!-- boards.project_id -> projects.id (CASCADE) -->
      <path d="M 720,135 H 660 Q 650,135 650,125 V 120 H 620" fill="none" stroke="#f08a59" stroke-width="1.2" marker-end="url(#arrow-accent)"/>
      <!-- columns.board_id -> boards.id (CASCADE) -->
      <path d="M 720,320 H 680 Q 670,320 670,290 V 210 Q 670,180 680,180 H 720" fill="none" stroke="#f08a59" stroke-width="1.2" marker-end="url(#arrow-accent)"/>
      <!-- tasks.column_id -> columns.id (CASCADE) -->
      <path d="M 380,360 H 350 Q 340,360 340,380 V 380 Q 340,400 350,400 H 720" fill="none" stroke="#f08a59" stroke-width="1.2" marker-end="url(#arrow-accent)"/>

      <!-- Labels on connectors -->
      <rect x="290" y="105" width="85" height="12" rx="2" fill="#1e232d"/>
      <text x="332" y="114" fill="#94a3b8" font-size="7.5" font-family="'Geist Mono', monospace">RESTRICT</text>

      <rect x="635" y="115" width="80" height="12" rx="2" fill="#1e232d"/>
      <text x="675" y="124" fill="#f08a59" font-size="7.5" font-family="'Geist Mono', monospace">CASCADE</text>

      <rect x="640" y="240" width="80" height="12" rx="2" fill="#1e232d"/>
      <text x="680" y="249" fill="#f08a59" font-size="7.5" font-family="'Geist Mono', monospace">CASCADE</text>

      <!-- Table 1: users -->
      <rect x="30" y="80" width="230" height="190" rx="6" fill="#242b37" stroke="rgba(248,250,252,0.18)" stroke-width="1"/>
      <rect x="30" y="80" width="230" height="28" rx="6" fill="rgba(248,250,252,0.04)"/>
      <line x1="30" y1="108" x2="260" y2="108" stroke="rgba(248,250,252,0.15)" stroke-width="1"/>
      <text x="42" y="98" fill="#f8fafc" font-size="11.5" font-weight="600">public.users</text>
      <rect x="210" y="88" width="40" height="12" rx="2" fill="none" stroke="rgba(248,250,252,0.3)" stroke-width="0.8"/>
      <text x="230" y="97" fill="#94a3b8" font-size="7.5" font-family="'Geist Mono', monospace" text-anchor="middle">TABLE</text>
      <!-- Rows -->
      <text x="42" y="124" fill="#f8fafc" font-size="11">id</text> <text x="140" y="124" fill="#f08a59" font-size="7.5" font-family="'Geist Mono', monospace">PK</text> <text x="250" y="124" fill="#94a3b8" font-size="8.5" font-family="'Geist Mono', monospace" text-anchor="end">bigint</text>
      <text x="42" y="148" fill="#f8fafc" font-size="11">email</text> <text x="140" y="148" fill="#60a5fa" font-size="7.5" font-family="'Geist Mono', monospace">UQ NN</text> <text x="250" y="148" fill="#94a3b8" font-size="8.5" font-family="'Geist Mono', monospace" text-anchor="end">varchar(255)</text>
      <text x="42" y="172" fill="#f8fafc" font-size="11">password_hash</text> <text x="250" y="172" fill="#94a3b8" font-size="8.5" font-family="'Geist Mono', monospace" text-anchor="end">varchar(255)</text>
      <text x="42" y="196" fill="#f8fafc" font-size="11">role</text> <text x="140" y="196" fill="#94a3b8" font-size="7.5" font-family="'Geist Mono', monospace">NN</text> <text x="250" y="196" fill="#94a3b8" font-size="8.5" font-family="'Geist Mono', monospace" text-anchor="end">varchar(32)</text>
      <text x="42" y="220" fill="#f8fafc" font-size="11">provider</text> <text x="250" y="220" fill="#94a3b8" font-size="8.5" font-family="'Geist Mono', monospace" text-anchor="end">varchar(32)</text>
      <line x1="30" y1="234" x2="260" y2="234" stroke="rgba(248,250,252,0.1)" stroke-width="0.8"/>
      <text x="42" y="250" fill="#94a3b8" font-size="7.5" font-family="'Geist Mono', monospace">idx_users_email</text>

      <!-- Table 2: projects -->
      <rect x="380" y="80" width="240" height="190" rx="6" fill="#242b37" stroke="rgba(248,250,252,0.18)" stroke-width="1"/>
      <rect x="380" y="80" width="240" height="28" rx="6" fill="rgba(248,250,252,0.04)"/>
      <line x1="380" y1="108" x2="620" y2="108" stroke="rgba(248,250,252,0.15)" stroke-width="1"/>
      <text x="392" y="98" fill="#f8fafc" font-size="11.5" font-weight="600">public.projects</text>
      <rect x="570" y="88" width="40" height="12" rx="2" fill="none" stroke="rgba(248,250,252,0.3)" stroke-width="0.8"/>
      <text x="590" y="97" fill="#94a3b8" font-size="7.5" font-family="'Geist Mono', monospace" text-anchor="middle">TABLE</text>
      <text x="392" y="124" fill="#f8fafc" font-size="11">id</text> <text x="490" y="124" fill="#f08a59" font-size="7.5" font-family="'Geist Mono', monospace">PK</text> <text x="610" y="124" fill="#94a3b8" font-size="8.5" font-family="'Geist Mono', monospace" text-anchor="end">bigint</text>
      <text x="392" y="148" fill="#f8fafc" font-size="11">name</text> <text x="490" y="148" fill="#94a3b8" font-size="7.5" font-family="'Geist Mono', monospace">NN</text> <text x="610" y="148" fill="#94a3b8" font-size="8.5" font-family="'Geist Mono', monospace" text-anchor="end">varchar(120)</text>
      <text x="392" y="172" fill="#f8fafc" font-size="11">owner_id</text> <text x="490" y="172" fill="#60a5fa" font-size="7.5" font-family="'Geist Mono', monospace">FK</text> <text x="610" y="172" fill="#94a3b8" font-size="8.5" font-family="'Geist Mono', monospace" text-anchor="end">bigint</text>
      <text x="392" y="196" fill="#f8fafc" font-size="11">created_at</text> <text x="610" y="196" fill="#94a3b8" font-size="8.5" font-family="'Geist Mono', monospace" text-anchor="end">timestamp</text>
      <line x1="380" y1="210" x2="620" y2="210" stroke="rgba(248,250,252,0.1)" stroke-width="0.8"/>
      <text x="392" y="226" fill="#94a3b8" font-size="7.5" font-family="'Geist Mono', monospace">idx_projects_owner_id</text>

      <!-- Table 3: boards -->
      <rect x="720" y="80" width="240" height="150" rx="6" fill="#242b37" stroke="rgba(248,250,252,0.18)" stroke-width="1"/>
      <rect x="720" y="80" width="240" height="28" rx="6" fill="rgba(240,138,89,0.15)"/>
      <line x1="720" y1="108" x2="960" y2="108" stroke="rgba(248,250,252,0.15)" stroke-width="1"/>
      <text x="732" y="98" fill="#f8fafc" font-size="11.5" font-weight="600">public.kanban_boards</text>
      <text x="732" y="124" fill="#f8fafc" font-size="11">id</text> <text x="830" y="124" fill="#f08a59" font-size="7.5" font-family="'Geist Mono', monospace">PK</text> <text x="950" y="124" fill="#94a3b8" font-size="8.5" font-family="'Geist Mono', monospace" text-anchor="end">bigint</text>
      <text x="732" y="148" fill="#f8fafc" font-size="11">project_id</text> <text x="830" y="148" fill="#f08a59" font-size="7.5" font-family="'Geist Mono', monospace">FK</text> <text x="950" y="148" fill="#94a3b8" font-size="8.5" font-family="'Geist Mono', monospace" text-anchor="end">bigint</text>
      <text x="732" y="172" fill="#f8fafc" font-size="11">title</text> <text x="950" y="172" fill="#94a3b8" font-size="8.5" font-family="'Geist Mono', monospace" text-anchor="end">varchar(100)</text>

      <!-- Table 4: columns -->
      <rect x="720" y="270" width="240" height="170" rx="6" fill="#242b37" stroke="rgba(248,250,252,0.18)" stroke-width="1"/>
      <rect x="720" y="270" width="240" height="28" rx="6" fill="rgba(240,138,89,0.15)"/>
      <line x1="720" y1="298" x2="960" y2="298" stroke="rgba(248,250,252,0.15)" stroke-width="1"/>
      <text x="732" y="288" fill="#f8fafc" font-size="11.5" font-weight="600">public.kanban_columns</text>
      <text x="732" y="316" fill="#f8fafc" font-size="11">id</text> <text x="830" y="316" fill="#f08a59" font-size="7.5" font-family="'Geist Mono', monospace">PK</text> <text x="950" y="316" fill="#94a3b8" font-size="8.5" font-family="'Geist Mono', monospace" text-anchor="end">bigint</text>
      <text x="732" y="340" fill="#f8fafc" font-size="11">board_id</text> <text x="830" y="340" fill="#f08a59" font-size="7.5" font-family="'Geist Mono', monospace">FK</text> <text x="950" y="340" fill="#94a3b8" font-size="8.5" font-family="'Geist Mono', monospace" text-anchor="end">bigint</text>
      <text x="732" y="364" fill="#f8fafc" font-size="11">name</text> <text x="950" y="364" fill="#94a3b8" font-size="8.5" font-family="'Geist Mono', monospace" text-anchor="end">varchar(60)</text>
      <text x="732" y="388" fill="#f8fafc" font-size="11">position</text> <text x="950" y="388" fill="#94a3b8" font-size="8.5" font-family="'Geist Mono', monospace" text-anchor="end">integer</text>

      <!-- Table 5: tasks -->
      <rect x="380" y="310" width="240" height="210" rx="6" fill="#242b37" stroke="rgba(248,250,252,0.18)" stroke-width="1"/>
      <rect x="380" y="310" width="240" height="28" rx="6" fill="rgba(240,138,89,0.15)"/>
      <line x1="380" y1="338" x2="620" y2="338" stroke="rgba(248,250,252,0.15)" stroke-width="1"/>
      <text x="392" y="328" fill="#f8fafc" font-size="11.5" font-weight="600">public.kanban_tasks</text>
      <text x="392" y="356" fill="#f8fafc" font-size="11">id</text> <text x="490" y="356" fill="#f08a59" font-size="7.5" font-family="'Geist Mono', monospace">PK</text> <text x="610" y="356" fill="#94a3b8" font-size="8.5" font-family="'Geist Mono', monospace" text-anchor="end">bigint</text>
      <text x="392" y="380" fill="#f8fafc" font-size="11">column_id</text> <text x="490" y="380" fill="#f08a59" font-size="7.5" font-family="'Geist Mono', monospace">FK</text> <text x="610" y="380" fill="#94a3b8" font-size="8.5" font-family="'Geist Mono', monospace" text-anchor="end">bigint</text>
      <text x="392" y="404" fill="#f8fafc" font-size="11">title</text> <text x="610" y="404" fill="#94a3b8" font-size="8.5" font-family="'Geist Mono', monospace" text-anchor="end">varchar(160)</text>
      <text x="392" y="428" fill="#f8fafc" font-size="11">priority</text> <text x="610" y="428" fill="#94a3b8" font-size="8.5" font-family="'Geist Mono', monospace" text-anchor="end">varchar(20)</text>
      <text x="392" y="452" fill="#f8fafc" font-size="11">assignee_id</text> <text x="490" y="452" fill="#60a5fa" font-size="7.5" font-family="'Geist Mono', monospace">FK</text> <text x="610" y="452" fill="#94a3b8" font-size="8.5" font-family="'Geist Mono', monospace" text-anchor="end">bigint</text>
      <line x1="380" y1="468" x2="620" y2="468" stroke="rgba(248,250,252,0.1)" stroke-width="0.8"/>
      <text x="392" y="484" fill="#94a3b8" font-size="7.5" font-family="'Geist Mono', monospace">idx_tasks_column_id</text>

      <!-- Legend -->
      <line x1="50" y1="580" x2="1050" y2="580" stroke="rgba(248,250,252,0.08)" stroke-width="0.8"/>
      <text x="50" y="598" fill="#94a3b8" font-size="8" font-family="'Geist Mono', monospace" letter-spacing="0.18em">LEGEND</text>
      <line x1="120" y1="595" x2="150" y2="595" stroke="#f08a59" stroke-width="1.4" marker-end="url(#arrow-accent)"/>
      <text x="158" y="598" fill="#94a3b8" font-size="8.5">ON DELETE CASCADE (Focal)</text>
      <line x1="360" y1="595" x2="390" y2="595" stroke="#94a3b8" stroke-width="1.2" marker-end="url(#arrow)"/>
      <text x="398" y="598" fill="#94a3b8" font-size="8.5">ON DELETE RESTRICT</text>
      <rect x="580" y="590" width="16" height="10" rx="2" fill="rgba(240,138,89,0.2)"/>
      <text x="602" y="598" fill="#94a3b8" font-size="8.5">Cascade Target Table</text>
    </svg>"""

    save_diagram(slug, title, eyebrow, h1, svg)

# ================= 3. DATA FLOW: websocket-stomp-routing =================
def gen_websocket_flow():
    slug = "websocket-stomp-routing"
    title = "Real-Time WebSocket & STOMP Broker Flow"
    h1 = "STOMP Over SockJS: Event Publishing and Browser Topic Subscription"
    eyebrow = "Data Flow"

    svg = f"""<svg viewBox="0 0 1100 540" xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="{slug}-title {slug}-desc">
      <title id="{slug}-title">{h1}</title>
      <desc id="{slug}-desc">Data flow diagram showing Spring application event publishing routed through the STOMP message broker to client browser subscription channels.</desc>
      <defs>
        <marker id="arrow" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto"><polygon points="0 0, 8 3, 0 6" fill="#94a3b8"/></marker>
        <marker id="arrow-emerald" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto"><polygon points="0 0, 8 3, 0 6" fill="#34d399"/></marker>
        <marker id="arrow-accent" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto"><polygon points="0 0, 8 3, 0 6" fill="#f08a59"/></marker>
      </defs>
      <rect width="100%" height="100%" fill="#1e232d"/>

      <!-- Event Producers (Left) -->
      <!-- Producer 1: Execution Engine -->
      <rect x="50" y="100" width="180" height="74" rx="6" fill="#242b37" stroke="rgba(240,138,89,0.3)" stroke-width="1"/>
      <text x="65" y="125" fill="#f08a59" font-size="11" font-weight="600">Docker Runner</text>
      <text x="65" y="142" fill="#94a3b8" font-size="8" font-family="'Geist Mono', monospace">StdOut / StdErr events</text>
      <text x="65" y="156" fill="rgba(148,163,184,0.7)" font-size="7.5" font-family="'Geist Mono', monospace">DockerOutputEvent</text>

      <!-- Producer 2: Kanban Service -->
      <rect x="50" y="210" width="180" height="74" rx="6" fill="#242b37" stroke="rgba(248,250,252,0.18)" stroke-width="1"/>
      <text x="65" y="235" fill="#f8fafc" font-size="11" font-weight="600">Kanban Service</text>
      <text x="65" y="252" fill="#94a3b8" font-size="8" font-family="'Geist Mono', monospace">Task Moved / Updated</text>
      <text x="65" y="266" fill="rgba(148,163,184,0.7)" font-size="7.5" font-family="'Geist Mono', monospace">TaskDiffEvent</text>

      <!-- Producer 3: Notification Service -->
      <rect x="50" y="320" width="180" height="74" rx="6" fill="#242b37" stroke="rgba(248,250,252,0.18)" stroke-width="1"/>
      <text x="65" y="345" fill="#f8fafc" font-size="11" font-weight="600">Notification Service</text>
      <text x="65" y="362" fill="#94a3b8" font-size="8" font-family="'Geist Mono', monospace">Project invite / alerts</text>
      <text x="65" y="376" fill="rgba(148,163,184,0.7)" font-size="7.5" font-family="'Geist Mono', monospace">InAppNotificationEvent</text>

      <!-- Core Message Broker (Center - Focal) -->
      <rect x="360" y="80" width="280" height="340" rx="8" fill="rgba(52,211,153,0.06)" stroke="#34d399" stroke-width="1.5"/>
      <text x="500" y="115" fill="#34d399" font-size="13" font-weight="600" text-anchor="middle">STOMP In-Memory Broker</text>
      <text x="500" y="132" fill="#94a3b8" font-size="8.5" font-family="'Geist Mono', monospace" text-anchor="middle">SimpMessagingTemplate</text>
      
      <!-- Sub-queues in broker -->
      <rect x="385" y="160" width="230" height="60" rx="4" fill="#242b37" stroke="rgba(52,211,153,0.3)" stroke-width="0.8"/>
      <text x="400" y="182" fill="#34d399" font-size="10" font-weight="600">/topic/logs/&#123;projectId&#125;</text>
      <text x="400" y="200" fill="#94a3b8" font-size="8" font-family="'Geist Mono', monospace">Terminal Execution Chunks</text>

      <rect x="385" y="240" width="230" height="60" rx="4" fill="#242b37" stroke="rgba(52,211,153,0.3)" stroke-width="0.8"/>
      <text x="400" y="262" fill="#34d399" font-size="10" font-weight="600">/topic/tasks/&#123;projectId&#125;</text>
      <text x="400" y="280" fill="#94a3b8" font-size="8" font-family="'Geist Mono', monospace">Granular Kanban Diffs</text>

      <rect x="385" y="320" width="230" height="60" rx="4" fill="#242b37" stroke="rgba(52,211,153,0.3)" stroke-width="0.8"/>
      <text x="400" y="342" fill="#34d399" font-size="10" font-weight="600">/topic/notifications/&#123;userId&#125;</text>
      <text x="400" y="360" fill="#94a3b8" font-size="8" font-family="'Geist Mono', monospace">Personal In-App Toast Alerts</text>

      <!-- Client Subscribers (Right) -->
      <!-- Subscriber 1: Web IDE Console -->
      <rect x="760" y="145" width="200" height="68" rx="6" fill="#242b37" stroke="rgba(248,250,252,0.18)" stroke-width="1"/>
      <text x="775" y="170" fill="#f8fafc" font-size="11" font-weight="600">Web IDE Terminal</text>
      <text x="775" y="188" fill="#94a3b8" font-size="8" font-family="'Geist Mono', monospace">xterm / Monaco output</text>

      <!-- Subscriber 2: Kanban Board -->
      <rect x="760" y="235" width="200" height="68" rx="6" fill="#242b37" stroke="rgba(248,250,252,0.18)" stroke-width="1"/>
      <text x="775" y="260" fill="#f8fafc" font-size="11" font-weight="600">Live Kanban View</text>
      <text x="775" y="278" fill="#94a3b8" font-size="8" font-family="'Geist Mono', monospace">Auto-sync card positions</text>

      <!-- Subscriber 3: Notification Toast -->
      <rect x="760" y="325" width="200" height="68" rx="6" fill="#242b37" stroke="rgba(248,250,252,0.18)" stroke-width="1"/>
      <text x="775" y="350" fill="#f8fafc" font-size="11" font-weight="600">Notification Dropdown</text>
      <text x="775" y="368" fill="#94a3b8" font-size="8" font-family="'Geist Mono', monospace">Badge counter &amp; toast</text>

      <!-- Connectors -->
      <!-- Producers -> Broker -->
      <line x1="230" y1="137" x2="385" y2="190" stroke="#f08a59" stroke-width="1.2" marker-end="url(#arrow-accent)"/>
      <line x1="230" y1="247" x2="385" y2="270" stroke="#94a3b8" stroke-width="1.2" marker-end="url(#arrow)"/>
      <line x1="230" y1="357" x2="385" y2="350" stroke="#94a3b8" stroke-width="1.2" marker-end="url(#arrow)"/>

      <!-- Broker -> Subscribers -->
      <line x1="615" y1="190" x2="760" y2="180" stroke="#34d399" stroke-width="1.4" marker-end="url(#arrow-emerald)"/>
      <line x1="615" y1="270" x2="760" y2="270" stroke="#34d399" stroke-width="1.4" marker-end="url(#arrow-emerald)"/>
      <line x1="615" y1="350" x2="760" y2="360" stroke="#34d399" stroke-width="1.4" marker-end="url(#arrow-emerald)"/>

      <!-- Legend -->
      <line x1="50" y1="470" x2="1050" y2="470" stroke="rgba(248,250,252,0.08)" stroke-width="0.8"/>
      <text x="50" y="490" fill="#94a3b8" font-size="8" font-family="'Geist Mono', monospace" letter-spacing="0.18em">LEGEND</text>
      <line x1="120" y1="488" x2="150" y2="488" stroke="#34d399" stroke-width="1.4" marker-end="url(#arrow-emerald)"/>
      <text x="158" y="490" fill="#94a3b8" font-size="8.5">STOMP Push Subscription</text>
      <line x1="360" y1="488" x2="390" y2="488" stroke="#f08a59" stroke-width="1.2" marker-end="url(#arrow-accent)"/>
      <text x="398" y="490" fill="#94a3b8" font-size="8.5">Docker Sandbox Output Publish</text>
      <line x1="620" y1="488" x2="650" y2="488" stroke="#94a3b8" stroke-width="1.2" marker-end="url(#arrow)"/>
      <text x="658" y="490" fill="#94a3b8" font-size="8.5">Application Event Publish</text>
    </svg>"""

    save_diagram(slug, title, eyebrow, h1, svg)

# ================= 4. DEPLOYMENT: docker-compose-deployment =================
def gen_deployment_topology():
    slug = "docker-compose-deployment"
    title = "Docker Compose Infrastructure & Network Deployment"
    h1 = "Container Networking, Host Port Bindings, and Volume Persistence"
    eyebrow = "Deployment Topology"

    svg = f"""<svg viewBox="0 0 1100 560" xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="{slug}-title {slug}-desc">
      <title id="{slug}-title">{h1}</title>
      <desc id="{slug}-desc">Deployment diagram illustrating the Docker bridge network, container services, persistent volume mappings, and exposed host ports.</desc>
      <defs>
        <marker id="arrow" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto"><polygon points="0 0, 8 3, 0 6" fill="#94a3b8"/></marker>
        <marker id="arrow-accent" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto"><polygon points="0 0, 8 3, 0 6" fill="#f08a59"/></marker>
      </defs>
      <rect width="100%" height="100%" fill="#1e232d"/>

      <!-- Host Machine Frame -->
      <rect x="40" y="30" width="1020" height="470" rx="8" fill="rgba(248,250,252,0.015)" stroke="rgba(248,250,252,0.15)" stroke-width="1"/>
      <text x="60" y="55" fill="#f8fafc" font-size="11" font-weight="600">HOST OPERATING SYSTEM (Docker Host)</text>

      <!-- Docker Bridge Network Box -->
      <rect x="60" y="75" width="980" height="335" rx="6" fill="rgba(248,250,252,0.02)" stroke="rgba(240,138,89,0.3)" stroke-width="1" stroke-dasharray="4,4"/>
      <text x="80" y="96" fill="#f08a59" font-size="8.5" font-family="'Geist Mono', monospace" letter-spacing="0.1em">DOCKER BRIDGE NETWORK: devops-suite-net</text>

      <!-- Containers -->
      <!-- C1: Frontend Nginx -->
      <rect x="80" y="120" width="170" height="100" rx="6" fill="#242b37" stroke="rgba(248,250,252,0.2)" stroke-width="1"/>
      <text x="95" y="145" fill="#f8fafc" font-size="11" font-weight="600">frontend</text>
      <text x="95" y="162" fill="#94a3b8" font-size="8" font-family="'Geist Mono', monospace">React SPA (Nginx)</text>
      <rect x="95" y="175" width="140" height="18" rx="2" fill="rgba(96,165,250,0.15)"/>
      <text x="165" y="188" fill="#60a5fa" font-size="8" font-family="'Geist Mono', monospace" text-anchor="middle">Host: 80 &rarr; Cont: 80</text>

      <!-- C2: Spring Boot Backend (Focal) -->
      <rect x="290" y="120" width="220" height="140" rx="6" fill="rgba(240,138,89,0.08)" stroke="#f08a59" stroke-width="1.5"/>
      <text x="310" y="145" fill="#f8fafc" font-size="12" font-weight="600">backend</text>
      <text x="310" y="162" fill="#f08a59" font-size="8.5" font-family="'Geist Mono', monospace">Spring Boot Monolith</text>
      <rect x="310" y="175" width="180" height="18" rx="2" fill="rgba(240,138,89,0.2)"/>
      <text x="400" y="188" fill="#f08a59" font-size="8" font-family="'Geist Mono', monospace" text-anchor="middle">Host: 8082 &rarr; Cont: 8081</text>
      <text x="310" y="215" fill="#94a3b8" font-size="7.5" font-family="'Geist Mono', monospace">JVM 21 Alpine · JRE Mode</text>
      <text x="310" y="232" fill="#94a3b8" font-size="7.5" font-family="'Geist Mono', monospace">Internal DNS: http://backend:8081</text>

      <!-- C3: Postgres -->
      <rect x="550" y="120" width="160" height="100" rx="6" fill="#242b37" stroke="rgba(248,250,252,0.2)" stroke-width="1"/>
      <text x="565" y="145" fill="#f8fafc" font-size="11" font-weight="600">postgres</text>
      <text x="565" y="162" fill="#94a3b8" font-size="8" font-family="'Geist Mono', monospace">PostgreSQL 16</text>
      <text x="565" y="182" fill="#94a3b8" font-size="8" font-family="'Geist Mono', monospace">Cont Port: 5432</text>
      <text x="565" y="202" fill="#60a5fa" font-size="7.5" font-family="'Geist Mono', monospace">Vol: pg_data</text>

      <!-- C4: Redis -->
      <rect x="750" y="120" width="150" height="100" rx="6" fill="#242b37" stroke="rgba(248,250,252,0.2)" stroke-width="1"/>
      <text x="765" y="145" fill="#f8fafc" font-size="11" font-weight="600">redis</text>
      <text x="765" y="162" fill="#94a3b8" font-size="8" font-family="'Geist Mono', monospace">Redis 7 Alpine</text>
      <text x="765" y="182" fill="#94a3b8" font-size="8" font-family="'Geist Mono', monospace">Cont Port: 6379</text>
      <text x="765" y="202" fill="#60a5fa" font-size="7.5" font-family="'Geist Mono', monospace">Vol: redis_data</text>

      <!-- C5: Elasticsearch -->
      <rect x="80" y="260" width="170" height="110" rx="6" fill="#242b37" stroke="rgba(248,250,252,0.2)" stroke-width="1"/>
      <text x="95" y="285" fill="#f8fafc" font-size="11" font-weight="600">elasticsearch</text>
      <text x="95" y="302" fill="#94a3b8" font-size="8" font-family="'Geist Mono', monospace">Log Aggregator :9200</text>
      <text x="95" y="322" fill="#60a5fa" font-size="7.5" font-family="'Geist Mono', monospace">Vol: es_data</text>

      <!-- C6: Admin Proxy & Dashboards -->
      <rect x="550" y="260" width="350" height="110" rx="6" fill="#242b37" stroke="rgba(248,250,252,0.2)" stroke-width="1"/>
      <text x="565" y="285" fill="#f8fafc" font-size="11" font-weight="600">nginx-admin-proxy</text>
      <text x="565" y="302" fill="#94a3b8" font-size="8" font-family="'Geist Mono', monospace">Basic Auth Barrier for Observability</text>
      <rect x="565" y="318" width="150" height="18" rx="2" fill="rgba(148,163,184,0.15)"/>
      <text x="640" y="331" fill="#f8fafc" font-size="7.5" font-family="'Geist Mono', monospace" text-anchor="middle">Grafana :8080 &rarr; 3000</text>
      <rect x="730" y="318" width="150" height="18" rx="2" fill="rgba(148,163,184,0.15)"/>
      <text x="805" y="331" fill="#f8fafc" font-size="7.5" font-family="'Geist Mono', monospace" text-anchor="middle">Kibana :8083 &rarr; 5601</text>

      <!-- Host Volume persistence bar -->
      <rect x="60" y="425" width="980" height="50" rx="6" fill="rgba(96,165,250,0.06)" stroke="rgba(96,165,250,0.25)" stroke-width="1"/>
      <text x="80" y="455" fill="#60a5fa" font-size="9" font-weight="600" font-family="'Geist Mono', monospace">PERSISTENT HOST VOLUMES:</text>
      <text x="270" y="455" fill="#94a3b8" font-size="8.5" font-family="'Geist Mono', monospace">./postgres_data &bull; ./redis_data &bull; ./es_data &bull; ./prometheus_data &bull; ./grafana_data</text>

      <!-- Legend -->
      <line x1="40" y1="515" x2="1060" y2="515" stroke="rgba(248,250,252,0.08)" stroke-width="0.8"/>
      <text x="40" y="535" fill="#94a3b8" font-size="8" font-family="'Geist Mono', monospace" letter-spacing="0.18em">LEGEND</text>
      <rect x="110" y="528" width="14" height="10" rx="2" fill="rgba(240,138,89,0.2)" stroke="#f08a59" stroke-width="1"/>
      <text x="132" y="536" fill="#94a3b8" font-size="8.5">Core Application Container</text>
      <rect x="330" y="528" width="14" height="10" rx="2" fill="rgba(96,165,250,0.15)"/>
      <text x="352" y="536" fill="#94a3b8" font-size="8.5">Host-Bound Exposed Port</text>
      <line x1="540" y1="533" x2="570" y2="533" stroke="rgba(240,138,89,0.5)" stroke-dasharray="4,4"/>
      <text x="578" y="536" fill="#94a3b8" font-size="8.5">Internal Docker Bridge Network</text>
    </svg>"""

    save_diagram(slug, title, eyebrow, h1, svg)

# ================= 5. DP SECURITY MATRIX: rbac-security-matrix =================
def gen_rbac_matrix():
    slug = "rbac-security-matrix"
    title = "Role-Based Access Control (RBAC) Security Matrix"
    h1 = "Fine-Grained Permissions Matrix by Platform Role"
    eyebrow = "Security Matrix"

    roles = ["OWNER", "ADMIN", "MEMBER", "VIEWER"]
    resources = [
        ("Project Administration", ["Delete Project", "Transfer Ownership", "Update Settings"]),
        ("Member Management", ["Invite Users", "Assign Roles", "Remove Members"]),
        ("Kanban Board", ["Create Columns / WIP", "Create / Move Tasks", "Comment & Attach"]),
        ("Web IDE & Sandbox", ["Execute Code Runner", "Save / Delete Files", "View Realtime Logs"]),
        ("Telemetry & Audit", ["View Elasticsearch Logs", "View Prometheus Metrics", "View Audit Trails"])
    ]

    # Matrix Table SVG
    svg = f"""<svg viewBox="0 0 1100 580" xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="{slug}-title {slug}-desc">
      <title id="{slug}-title">{h1}</title>
      <desc id="{slug}-desc">Security matrix mapping platform roles (OWNER, ADMIN, MEMBER, VIEWER) against granular project operations and administrative capabilities.</desc>
      <rect width="100%" height="100%" fill="#1e232d"/>

      <!-- Matrix Header -->
      <rect x="40" y="40" width="340" height="40" rx="4" fill="#242b37" stroke="rgba(248,250,252,0.15)" stroke-width="0.8"/>
      <text x="60" y="65" fill="#f8fafc" font-size="11" font-weight="600">Resource / Permission Area</text>

      <rect x="400" y="40" width="140" height="40" rx="4" fill="rgba(240,138,89,0.15)" stroke="#f08a59" stroke-width="1.2"/>
      <text x="470" y="65" fill="#f08a59" font-size="11" font-weight="600" text-anchor="middle">OWNER</text>

      <rect x="560" y="40" width="140" height="40" rx="4" fill="#242b37" stroke="rgba(248,250,252,0.15)" stroke-width="0.8"/>
      <text x="630" y="65" fill="#f8fafc" font-size="11" font-weight="600" text-anchor="middle">ADMIN</text>

      <rect x="720" y="40" width="140" height="40" rx="4" fill="#242b37" stroke="rgba(248,250,252,0.15)" stroke-width="0.8"/>
      <text x="790" y="65" fill="#f8fafc" font-size="11" font-weight="600" text-anchor="middle">MEMBER</text>

      <rect x="880" y="40" width="140" height="40" rx="4" fill="#242b37" stroke="rgba(248,250,252,0.15)" stroke-width="0.8"/>
      <text x="950" y="65" fill="#94a3b8" font-size="11" font-weight="600" text-anchor="middle">VIEWER</text>

      <!-- Matrix Rows -->
      <!-- Row 1: Project Admin -->
      <rect x="40" y="95" width="1020" height="65" rx="4" fill="rgba(248,250,252,0.02)" stroke="rgba(248,250,252,0.08)" stroke-width="0.8"/>
      <text x="60" y="125" fill="#f8fafc" font-size="10.5" font-weight="600">Project Administration</text>
      <text x="60" y="145" fill="#94a3b8" font-size="8" font-family="'Geist Mono', monospace">Delete, Transfer, Rename, Archive</text>
      <!-- Owner: Full --> <text x="470" y="132" fill="#34d399" font-size="13" font-family="'Geist Mono', monospace" text-anchor="middle">&#10003; Full</text>
      <!-- Admin: Partial --> <text x="630" y="132" fill="#60a5fa" font-size="9" font-family="'Geist Mono', monospace" text-anchor="middle">Config only</text>
      <!-- Member: None --> <text x="790" y="132" fill="rgba(148,163,184,0.3)" font-size="12" font-family="'Geist Mono', monospace" text-anchor="middle">&mdash;</text>
      <!-- Viewer: None --> <text x="950" y="132" fill="rgba(148,163,184,0.3)" font-size="12" font-family="'Geist Mono', monospace" text-anchor="middle">&mdash;</text>

      <!-- Row 2: Member Management -->
      <rect x="40" y="170" width="1020" height="65" rx="4" fill="rgba(248,250,252,0.02)" stroke="rgba(248,250,252,0.08)" stroke-width="0.8"/>
      <text x="60" y="200" fill="#f8fafc" font-size="10.5" font-weight="600">Team &amp; Membership</text>
      <text x="60" y="220" fill="#94a3b8" font-size="8" font-family="'Geist Mono', monospace">Invite users, Change roles, Revoke</text>
      <text x="470" y="207" fill="#34d399" font-size="13" font-family="'Geist Mono', monospace" text-anchor="middle">&#10003; Full</text>
      <text x="630" y="207" fill="#34d399" font-size="13" font-family="'Geist Mono', monospace" text-anchor="middle">&#10003; Invite/Edit</text>
      <text x="790" y="207" fill="rgba(148,163,184,0.3)" font-size="12" font-family="'Geist Mono', monospace" text-anchor="middle">&mdash;</text>
      <text x="950" y="207" fill="rgba(148,163,184,0.3)" font-size="12" font-family="'Geist Mono', monospace" text-anchor="middle">&mdash;</text>

      <!-- Row 3: Kanban Operations -->
      <rect x="40" y="245" width="1020" height="65" rx="4" fill="rgba(248,250,252,0.02)" stroke="rgba(248,250,252,0.08)" stroke-width="0.8"/>
      <text x="60" y="275" fill="#f8fafc" font-size="10.5" font-weight="600">Kanban Board &amp; Tasks</text>
      <text x="60" y="295" fill="#94a3b8" font-size="8" font-family="'Geist Mono', monospace">Columns, WIP limits, Tasks, Drag/Drop</text>
      <text x="470" y="282" fill="#34d399" font-size="13" font-family="'Geist Mono', monospace" text-anchor="middle">&#10003; Full</text>
      <text x="630" y="282" fill="#34d399" font-size="13" font-family="'Geist Mono', monospace" text-anchor="middle">&#10003; Full</text>
      <text x="790" y="282" fill="#34d399" font-size="11" font-family="'Geist Mono', monospace" text-anchor="middle">&#10003; Tasks only</text>
      <text x="950" y="282" fill="#94a3b8" font-size="9" font-family="'Geist Mono', monospace" text-anchor="middle">Read only</text>

      <!-- Row 4: IDE & Code Execution -->
      <rect x="40" y="320" width="1020" height="65" rx="4" fill="rgba(240,138,89,0.04)" stroke="rgba(240,138,89,0.2)" stroke-width="0.8"/>
      <text x="60" y="350" fill="#f08a59" font-size="10.5" font-weight="600">Web IDE &amp; Sandbox Runner</text>
      <text x="60" y="370" fill="#94a3b8" font-size="8" font-family="'Geist Mono', monospace">Trigger execution, Edit files, View logs</text>
      <text x="470" y="357" fill="#34d399" font-size="13" font-family="'Geist Mono', monospace" text-anchor="middle">&#10003; Full</text>
      <text x="630" y="357" fill="#34d399" font-size="13" font-family="'Geist Mono', monospace" text-anchor="middle">&#10003; Full</text>
      <text x="790" y="357" fill="#34d399" font-size="11" font-family="'Geist Mono', monospace" text-anchor="middle">&#10003; Run/Edit</text>
      <text x="950" y="357" fill="#94a3b8" font-size="9" font-family="'Geist Mono', monospace" text-anchor="middle">Read only</text>

      <!-- Row 5: Telemetry & Observability -->
      <rect x="40" y="395" width="1020" height="65" rx="4" fill="rgba(248,250,252,0.02)" stroke="rgba(248,250,252,0.08)" stroke-width="0.8"/>
      <text x="60" y="425" fill="#f8fafc" font-size="10.5" font-weight="600">Observability &amp; Audit Logs</text>
      <text x="60" y="445" fill="#94a3b8" font-size="8" font-family="'Geist Mono', monospace">Elasticsearch logs, Grafana, Metrics</text>
      <text x="470" y="432" fill="#34d399" font-size="13" font-family="'Geist Mono', monospace" text-anchor="middle">&#10003; Full</text>
      <text x="630" y="432" fill="#34d399" font-size="13" font-family="'Geist Mono', monospace" text-anchor="middle">&#10003; Full</text>
      <text x="790" y="432" fill="rgba(148,163,184,0.3)" font-size="12" font-family="'Geist Mono', monospace" text-anchor="middle">&mdash;</text>
      <text x="950" y="432" fill="rgba(148,163,184,0.3)" font-size="12" font-family="'Geist Mono', monospace" text-anchor="middle">&mdash;</text>

      <!-- Legend -->
      <line x1="40" y1="495" x2="1060" y2="495" stroke="rgba(248,250,252,0.08)" stroke-width="0.8"/>
      <text x="40" y="515" fill="#94a3b8" font-size="8" font-family="'Geist Mono', monospace" letter-spacing="0.18em">LEGEND</text>
      <text x="110" y="515" fill="#34d399" font-size="9" font-family="'Geist Mono', monospace">&#10003; Authorized</text>
      <text x="240" y="515" fill="#60a5fa" font-size="9" font-family="'Geist Mono', monospace">Limited Scope</text>
      <text x="360" y="515" fill="rgba(148,163,184,0.4)" font-size="9" font-family="'Geist Mono', monospace">&mdash; Denied (403 Forbidden)</text>
      <rect x="580" y="507" width="14" height="10" rx="2" fill="rgba(240,138,89,0.2)"/>
      <text x="602" y="515" fill="#f08a59" font-size="8.5">Security Focal Role (OWNER)</text>
    </svg>"""

    save_diagram(slug, title, eyebrow, h1, svg)

# ================= 6. STATE MACHINE: kanban-task-state-machine =================
def gen_task_state_machine():
    slug = "kanban-task-state-machine"
    title = "Kanban Task Lifecycle & Status State Machine"
    h1 = "Kanban Task Transitions, WIP Validation, and Real-Time Event Triggers"
    eyebrow = "State Machine"

    svg = f"""<svg viewBox="0 0 1100 520" xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="{slug}-title {slug}-desc">
      <title id="{slug}-title">{h1}</title>
      <desc id="{slug}-desc">State machine diagram showing valid transitions of a Kanban task card across Backlog, To Do, In Progress, Review, and Done with WIP guard constraints.</desc>
      <defs>
        <marker id="arrow" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto"><polygon points="0 0, 8 3, 0 6" fill="#94a3b8"/></marker>
        <marker id="arrow-accent" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto"><polygon points="0 0, 8 3, 0 6" fill="#f08a59"/></marker>
        <marker id="arrow-emerald" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto"><polygon points="0 0, 8 3, 0 6" fill="#34d399"/></marker>
      </defs>
      <rect width="100%" height="100%" fill="#1e232d"/>

      <!-- Initial State Circle -->
      <circle cx="60" cy="180" r="14" fill="#242b37" stroke="#94a3b8" stroke-width="1.5"/>
      <circle cx="60" cy="180" r="7" fill="#94a3b8"/>

      <!-- Arrows before states -->
      <line x1="74" y1="180" x2="112" y2="180" stroke="#94a3b8" stroke-width="1.2" marker-end="url(#arrow)"/>
      <line x1="262" y1="180" x2="302" y2="180" stroke="#94a3b8" stroke-width="1.2" marker-end="url(#arrow)"/>
      <line x1="452" y1="180" x2="492" y2="180" stroke="#f08a59" stroke-width="1.4" marker-end="url(#arrow-accent)"/>
      <line x1="652" y1="180" x2="692" y2="180" stroke="#f08a59" stroke-width="1.4" marker-end="url(#arrow-accent)"/>
      <line x1="842" y1="180" x2="882" y2="180" stroke="#34d399" stroke-width="1.4" marker-end="url(#arrow-emerald)"/>

      <!-- Reject / Return loop: Review -> In Progress -->
      <path d="M 770,230 V 270 Q 770,280 760,280 H 580 Q 570,280 570,270 V 230" fill="none" stroke="#f08a59" stroke-width="1.2" stroke-dasharray="4,3" marker-end="url(#arrow-accent)"/>
      <rect x="625" y="272" width="90" height="14" rx="2" fill="#1e232d"/>
      <text x="670" y="282" fill="#f08a59" font-size="7.5" font-family="'Geist Mono', monospace" text-anchor="middle">Needs Rework</text>

      <!-- State 1: Backlog -->
      <rect x="112" y="130" width="150" height="100" rx="6" fill="#242b37" stroke="rgba(248,250,252,0.18)" stroke-width="1"/>
      <text x="130" y="158" fill="#f8fafc" font-size="12" font-weight="600">BACKLOG</text>
      <text x="130" y="176" fill="#94a3b8" font-size="8" font-family="'Geist Mono', monospace">Unprioritized tasks</text>
      <text x="130" y="196" fill="rgba(148,163,184,0.7)" font-size="7.5" font-family="'Geist Mono', monospace">Entry: CreatedEvent</text>

      <!-- State 2: To Do -->
      <rect x="302" y="130" width="150" height="100" rx="6" fill="#242b37" stroke="rgba(248,250,252,0.18)" stroke-width="1"/>
      <text x="320" y="158" fill="#f8fafc" font-size="12" font-weight="600">TO DO</text>
      <text x="320" y="176" fill="#94a3b8" font-size="8" font-family="'Geist Mono', monospace">Committed for sprint</text>
      <text x="320" y="196" fill="rgba(148,163,184,0.7)" font-size="7.5" font-family="'Geist Mono', monospace">Guard: User assigned</text>

      <!-- State 3: In Progress (Focal) -->
      <rect x="492" y="120" width="160" height="120" rx="6" fill="rgba(240,138,89,0.08)" stroke="#f08a59" stroke-width="1.5"/>
      <text x="510" y="148" fill="#f08a59" font-size="12" font-weight="600">IN PROGRESS</text>
      <text x="510" y="168" fill="#f8fafc" font-size="8.5" font-family="'Geist Mono', monospace">Active Development</text>
      <rect x="510" y="180" width="120" height="18" rx="2" fill="rgba(240,138,89,0.2)"/>
      <text x="570" y="193" fill="#f08a59" font-size="7.5" font-family="'Geist Mono', monospace" text-anchor="middle">WIP Limit Guard &le; 3</text>
      <text x="510" y="218" fill="#94a3b8" font-size="7.5" font-family="'Geist Mono', monospace">Trigger: WS MOVED</text>

      <!-- State 4: Review -->
      <rect x="692" y="130" width="150" height="100" rx="6" fill="#242b37" stroke="rgba(248,250,252,0.18)" stroke-width="1"/>
      <text x="710" y="158" fill="#f8fafc" font-size="12" font-weight="600">IN REVIEW</text>
      <text x="710" y="176" fill="#94a3b8" font-size="8" font-family="'Geist Mono', monospace">PR / Code Verification</text>
      <text x="710" y="196" fill="rgba(148,163,184,0.7)" font-size="7.5" font-family="'Geist Mono', monospace">Guard: Tests pass</text>

      <!-- State 5: Done -->
      <rect x="882" y="130" width="150" height="100" rx="6" fill="#242b37" stroke="rgba(52,211,153,0.3)" stroke-width="1"/>
      <text x="900" y="158" fill="#34d399" font-size="12" font-weight="600">DONE</text>
      <text x="900" y="176" fill="#94a3b8" font-size="8" font-family="'Geist Mono', monospace">Merged &amp; Verified</text>
      <text x="900" y="196" fill="rgba(52,211,153,0.8)" font-size="7.5" font-family="'Geist Mono', monospace">Audit: History Logged</text>

      <!-- Bottom Details -->
      <rect x="112" y="340" width="920" height="85" rx="6" fill="rgba(248,250,252,0.02)" stroke="rgba(248,250,252,0.08)" stroke-width="0.8"/>
      <text x="130" y="365" fill="#f8fafc" font-size="11" font-weight="600">Kanban Realtime Invariants &amp; Audit Trail</text>
      <text x="130" y="385" fill="#94a3b8" font-size="8.5" font-family="'Geist Mono', monospace">• Every drag-and-drop transition writes an immutable audit record to `kanban_task_history`</text>
      <text x="130" y="400" fill="#94a3b8" font-size="8.5" font-family="'Geist Mono', monospace">• WIP (Work In Progress) ceiling strictly prevents column overload with 400 Bad Request if breached</text>
      <text x="130" y="415" fill="#94a3b8" font-size="8.5" font-family="'Geist Mono', monospace">• State changes broadcast JSON diffs to `/topic/tasks/&#123;projectId&#125;` for live multi-user sync</text>

      <!-- Legend -->
      <line x1="50" y1="465" x2="1050" y2="465" stroke="rgba(248,250,252,0.08)" stroke-width="0.8"/>
      <text x="50" y="485" fill="#94a3b8" font-size="8" font-family="'Geist Mono', monospace" letter-spacing="0.18em">LEGEND</text>
      <line x1="120" y1="483" x2="150" y2="483" stroke="#f08a59" stroke-width="1.4" marker-end="url(#arrow-accent)"/>
      <text x="158" y="485" fill="#94a3b8" font-size="8.5">Active Execution Transition</text>
      <line x1="370" y1="483" x2="400" y2="483" stroke="#34d399" stroke-width="1.4" marker-end="url(#arrow-emerald)"/>
      <text x="408" y="485" fill="#94a3b8" font-size="8.5">Terminal Completion</text>
      <line x1="570" y1="483" x2="600" y2="483" stroke="#f08a59" stroke-width="1.2" stroke-dasharray="4,3" marker-end="url(#arrow-accent)"/>
      <text x="608" y="485" fill="#94a3b8" font-size="8.5">Rejection / Rework Loop</text>
    </svg>"""

    save_diagram(slug, title, eyebrow, h1, svg)

if __name__ == "__main__":
    gen_auth_sequence()
    gen_db_schema()
    gen_websocket_flow()
    gen_deployment_topology()
    gen_rbac_matrix()
    gen_task_state_machine()
    print("Phase 1 core diagrams generated!")

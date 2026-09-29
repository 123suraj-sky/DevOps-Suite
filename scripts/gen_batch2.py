import os, sys
from pathlib import Path
sys.path.insert(0, ".")
from scripts.diagram_generator_base import HTML_WRAPPER, DIAGRAMS_DIR

def save_diagram(slug, title, eyebrow, h1, svg):
    html = HTML_WRAPPER.format(title=title, eyebrow=eyebrow, h1=h1, svg_content=svg)
    p = DIAGRAMS_DIR / f"{slug}.html"
    p.write_text(html, encoding="utf-8")
    print(f"Generated {p.name}")

# ================= 1. KANBAN: kanban-board-workflow =================
def gen_kanban_board():
    slug = "kanban-board-workflow"
    title = "Kanban Board & Column WIP Workflow"
    h1 = "Kanban Board: Columns, Task WIP Limits, and Granular Event Diffs"
    eyebrow = "Kanban Workflow"

    svg = f"""<svg viewBox="0 0 1100 520" xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="{slug}-title {slug}-desc">
      <title id="{slug}-title">{h1}</title>
      <desc id="{slug}-desc">Kanban board layout showing column swimlanes, WIP constraints, priority cards, and card dragging flow.</desc>
      <defs>
        <marker id="arrow-accent" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto"><polygon points="0 0, 8 3, 0 6" fill="#f08a59"/></marker>
      </defs>
      <rect width="100%" height="100%" fill="#1e232d"/>

      <!-- Column 1: Backlog -->
      <rect x="40" y="50" width="240" height="400" rx="6" fill="rgba(248,250,252,0.02)" stroke="rgba(248,250,252,0.1)" stroke-width="0.8"/>
      <text x="56" y="80" fill="#f8fafc" font-size="12" font-weight="600">Backlog</text>
      <rect x="220" y="68" width="45" height="16" rx="2" fill="rgba(148,163,184,0.15)"/>
      <text x="242" y="80" fill="#94a3b8" font-size="8" font-family="'Geist Mono', monospace" text-anchor="middle">WIP: &infin;</text>
      <!-- Task 101 -->
      <rect x="55" y="105" width="210" height="75" rx="4" fill="#242b37" stroke="rgba(248,250,252,0.12)" stroke-width="0.8"/>
      <text x="68" y="128" fill="#f8fafc" font-size="10.5" font-weight="500">OAuth Refresh Polish</text>
      <rect x="68" y="142" width="46" height="14" rx="2" fill="rgba(96,165,250,0.15)"/>
      <text x="91" y="152" fill="#60a5fa" font-size="7" font-family="'Geist Mono', monospace" text-anchor="middle">LOW</text>
      <text x="250" y="152" fill="#94a3b8" font-size="8" font-family="'Geist Mono', monospace" text-anchor="end">#DEV-101</text>

      <!-- Column 2: In Progress (Focal) -->
      <rect x="300" y="50" width="240" height="400" rx="6" fill="rgba(240,138,89,0.03)" stroke="rgba(240,138,89,0.4)" stroke-width="1.2"/>
      <text x="316" y="80" fill="#f08a59" font-size="12" font-weight="600">In Progress</text>
      <rect x="480" y="68" width="45" height="16" rx="2" fill="rgba(240,138,89,0.2)"/>
      <text x="502" y="80" fill="#f08a59" font-size="8" font-family="'Geist Mono', monospace" text-anchor="middle">WIP: 2/3</text>
      <!-- Task 102 (Focal Card) -->
      <rect x="315" y="105" width="210" height="85" rx="4" fill="#242b37" stroke="#f08a59" stroke-width="1.2"/>
      <text x="328" y="128" fill="#f8fafc" font-size="10.5" font-weight="600">Docker Cgroup Limit Cap</text>
      <rect x="328" y="142" width="46" height="14" rx="2" fill="rgba(240,138,89,0.2)"/>
      <text x="351" y="152" fill="#f08a59" font-size="7" font-family="'Geist Mono', monospace" text-anchor="middle">HIGH</text>
      <text x="510" y="152" fill="#94a3b8" font-size="8" font-family="'Geist Mono', monospace" text-anchor="end">#DEV-102</text>
      <text x="328" y="176" fill="#94a3b8" font-size="7.5" font-family="'Geist Mono', monospace">Assigned: @suraj</text>
      <!-- Task 103 -->
      <rect x="315" y="200" width="210" height="75" rx="4" fill="#242b37" stroke="rgba(248,250,252,0.12)" stroke-width="0.8"/>
      <text x="328" y="223" fill="#f8fafc" font-size="10.5" font-weight="500">Flyway V16 Migration</text>
      <rect x="328" y="237" width="56" height="14" rx="2" fill="rgba(248,250,252,0.1)"/>
      <text x="356" y="247" fill="#f8fafc" font-size="7" font-family="'Geist Mono', monospace" text-anchor="middle">MEDIUM</text>

      <!-- Drag Arrow Flow -->
      <path d="M 265,140 Q 290,120 315,140" fill="none" stroke="#f08a59" stroke-width="1.5" stroke-dasharray="4,3" marker-end="url(#arrow-accent)"/>
      <rect x="270" y="105" width="40" height="12" rx="2" fill="#1e232d"/>
      <text x="290" y="114" fill="#f08a59" font-size="7" font-family="'Geist Mono', monospace" text-anchor="middle">DRAG</text>

      <!-- Column 3: Review -->
      <rect x="560" y="50" width="240" height="400" rx="6" fill="rgba(248,250,252,0.02)" stroke="rgba(248,250,252,0.1)" stroke-width="0.8"/>
      <text x="576" y="80" fill="#f8fafc" font-size="12" font-weight="600">Review</text>
      <rect x="740" y="68" width="45" height="16" rx="2" fill="rgba(148,163,184,0.15)"/>
      <text x="762" y="80" fill="#94a3b8" font-size="8" font-family="'Geist Mono', monospace" text-anchor="middle">WIP: 1/2</text>
      <!-- Task 99 -->
      <rect x="575" y="105" width="210" height="75" rx="4" fill="#242b37" stroke="rgba(248,250,252,0.12)" stroke-width="0.8"/>
      <text x="588" y="128" fill="#f8fafc" font-size="10.5" font-weight="500">STOMP Auth Handshake</text>
      <text x="770" y="152" fill="#94a3b8" font-size="8" font-family="'Geist Mono', monospace" text-anchor="end">#DEV-99</text>

      <!-- Column 4: Done -->
      <rect x="820" y="50" width="240" height="400" rx="6" fill="rgba(52,211,153,0.03)" stroke="rgba(52,211,153,0.2)" stroke-width="0.8"/>
      <text x="836" y="80" fill="#34d399" font-size="12" font-weight="600">Done</text>
      <!-- Task 95 -->
      <rect x="835" y="105" width="210" height="75" rx="4" fill="#242b37" stroke="rgba(52,211,153,0.3)" stroke-width="0.8"/>
      <text x="848" y="128" fill="#34d399" font-size="10.5" font-weight="500">&#10003; JWT Blacklist Redis</text>
      <text x="1030" y="152" fill="#94a3b8" font-size="8" font-family="'Geist Mono', monospace" text-anchor="end">#DEV-95</text>

      <!-- Legend -->
      <line x1="40" y1="475" x2="1060" y2="475" stroke="rgba(248,250,252,0.08)" stroke-width="0.8"/>
      <text x="40" y="495" fill="#94a3b8" font-size="8" font-family="'Geist Mono', monospace" letter-spacing="0.18em">LEGEND</text>
      <rect x="110" y="488" width="14" height="10" rx="2" fill="rgba(240,138,89,0.2)" stroke="#f08a59" stroke-width="1"/>
      <text x="132" y="496" fill="#94a3b8" font-size="8.5">Active Sprint Column &amp; WIP Enforcement</text>
      <line x1="390" y1="493" x2="420" y2="493" stroke="#f08a59" stroke-dasharray="3,3" stroke-width="1.2" marker-end="url(#arrow-accent)"/>
      <text x="428" y="496" fill="#94a3b8" font-size="8.5">Real-time Task Drag / Reposition Event</text>
    </svg>"""

    save_diagram(slug, title, eyebrow, h1, svg)

# ================= 2. SWIMLANE: user-task-lifecycle-swimlane =================
def gen_swimlane():
    slug = "user-task-lifecycle-swimlane"
    title = "Multi-Actor Task Lifecycle Swimlane"
    h1 = "Task & Code Lifecycle Across Developer, Project Lead, and Admin"
    eyebrow = "Swimlane Map"

    svg = f"""<svg viewBox="0 0 1100 520" xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="{slug}-title {slug}-desc">
      <title id="{slug}-title">{h1}</title>
      <desc id="{slug}-desc">Swimlane diagram dividing lifecycle activities across Developer, Project Lead, and Admin roles.</desc>
      <defs>
        <marker id="arrow" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto"><polygon points="0 0, 8 3, 0 6" fill="#94a3b8"/></marker>
        <marker id="arrow-accent" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto"><polygon points="0 0, 8 3, 0 6" fill="#f08a59"/></marker>
      </defs>
      <rect width="100%" height="100%" fill="#1e232d"/>

      <!-- Lane Dividers -->
      <line x1="40" y1="60" x2="1060" y2="60" stroke="rgba(248,250,252,0.15)" stroke-width="1"/>
      <line x1="40" y1="180" x2="1060" y2="180" stroke="rgba(248,250,252,0.15)" stroke-width="1"/>
      <line x1="40" y1="310" x2="1060" y2="310" stroke="rgba(248,250,252,0.15)" stroke-width="1"/>
      <line x1="40" y1="440" x2="1060" y2="440" stroke="rgba(248,250,252,0.15)" stroke-width="1"/>

      <!-- Lane Headers -->
      <text x="50" y="125" fill="#f8fafc" font-size="11" font-weight="600">PROJECT LEAD</text>
      <text x="50" y="250" fill="#f08a59" font-size="11" font-weight="600">DEVELOPER (Focal)</text>
      <text x="50" y="380" fill="#94a3b8" font-size="11" font-weight="600">ADMIN</text>

      <!-- Connectors -->
      <path d="M 320,120 H 350 Q 360,120 360,140 V 230 Q 360,245 370,245 H 390" fill="none" stroke="#94a3b8" stroke-width="1.2" marker-end="url(#arrow)"/>
      <path d="M 540,245 H 580" fill="none" stroke="#f08a59" stroke-width="1.4" marker-end="url(#arrow-accent)"/>
      <path d="M 730,245 H 760 Q 770,245 770,225 V 135 Q 770,120 780,120 H 800" fill="none" stroke="#94a3b8" stroke-width="1.2" marker-end="url(#arrow)"/>

      <!-- Lane 1: Lead Boxes -->
      <rect x="180" y="90" width="140" height="60" rx="4" fill="#242b37" stroke="rgba(248,250,252,0.15)" stroke-width="1"/>
      <text x="195" y="115" fill="#f8fafc" font-size="10.5" font-weight="500">Create Task</text>
      <text x="195" y="132" fill="#94a3b8" font-size="7.5" font-family="'Geist Mono', monospace">Set column &amp; priority</text>

      <rect x="800" y="90" width="140" height="60" rx="4" fill="#242b37" stroke="rgba(248,250,252,0.15)" stroke-width="1"/>
      <text x="815" y="115" fill="#f8fafc" font-size="10.5" font-weight="500">Review &amp; Close</text>
      <text x="815" y="132" fill="#94a3b8" font-size="7.5" font-family="'Geist Mono', monospace">Move to Done</text>

      <!-- Lane 2: Developer Boxes -->
      <rect x="390" y="215" width="150" height="60" rx="4" fill="#242b37" stroke="rgba(240,138,89,0.3)" stroke-width="1"/>
      <text x="405" y="240" fill="#f8fafc" font-size="10.5" font-weight="500">Pick Task</text>
      <text x="405" y="257" fill="#f08a59" font-size="7.5" font-family="'Geist Mono', monospace">Move to In Progress</text>

      <rect x="580" y="205" width="150" height="80" rx="4" fill="rgba(240,138,89,0.1)" stroke="#f08a59" stroke-width="1.4"/>
      <text x="595" y="230" fill="#f08a59" font-size="11" font-weight="600">Code &amp; Execute</text>
      <text x="595" y="248" fill="#f8fafc" font-size="8" font-family="'Geist Mono', monospace">Monaco IDE Sandbox</text>
      <text x="595" y="266" fill="#94a3b8" font-size="7.5" font-family="'Geist Mono', monospace">Stream WS Output</text>

      <!-- Lane 3: Admin Boxes -->
      <rect x="580" y="350" width="150" height="60" rx="4" fill="#242b37" stroke="rgba(248,250,252,0.15)" stroke-width="1"/>
      <text x="595" y="375" fill="#f8fafc" font-size="10.5" font-weight="500">Audit &amp; Resource Cap</text>
      <text x="595" y="392" fill="#94a3b8" font-size="7.5" font-family="'Geist Mono', monospace">Monitor execution rate</text>
      <line x1="655" y1="285" x2="655" y2="350" stroke="#94a3b8" stroke-dasharray="3,3" stroke-width="1"/>

      <!-- Legend -->
      <line x1="40" y1="465" x2="1060" y2="465" stroke="rgba(248,250,252,0.08)" stroke-width="0.8"/>
      <text x="40" y="485" fill="#94a3b8" font-size="8" font-family="'Geist Mono', monospace" letter-spacing="0.18em">LEGEND</text>
      <line x1="110" y1="483" x2="140" y2="483" stroke="#f08a59" stroke-width="1.4" marker-end="url(#arrow-accent)"/>
      <text x="148" y="485" fill="#94a3b8" font-size="8.5">Core Developer Execution Flow</text>
      <line x1="360" y1="483" x2="390" y2="483" stroke="#94a3b8" stroke-dasharray="3,3" stroke-width="1"/>
      <text x="398" y="485" fill="#94a3b8" font-size="8.5">Telemetry &amp; Audit Link</text>
    </svg>"""

    save_diagram(slug, title, eyebrow, h1, svg)

# ================= 3. USER JOURNEY: developer-ide-run-journey =================
def gen_user_journey():
    slug = "developer-ide-run-journey"
    title = "Developer Experience & IDE Run Journey"
    h1 = "End-to-End Developer Journey: From Project Creation to Live Sandboxed Run"
    eyebrow = "User Journey"

    svg = f"""<svg viewBox="0 0 1100 520" xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="{slug}-title {slug}-desc">
      <title id="{slug}-title">{h1}</title>
      <desc id="{slug}-desc">User journey map showing developer experience stages: Onboarding, Project Setup, Coding in IDE, Sandboxed Execution, and Result Inspection.</desc>
      <rect width="100%" height="100%" fill="#1e232d"/>

      <!-- Stages (Columns) -->
      <!-- Stage 1 -->
      <rect x="40" y="60" width="190" height="380" rx="6" fill="rgba(248,250,252,0.015)" stroke="rgba(248,250,252,0.1)" stroke-width="0.8"/>
      <text x="55" y="90" fill="#60a5fa" font-size="10" font-weight="600" font-family="'Geist Mono', monospace">01 / AUTH</text>
      <text x="55" y="112" fill="#f8fafc" font-size="12" font-weight="600">OAuth Login</text>
      <rect x="55" y="130" width="160" height="80" rx="4" fill="#242b37" stroke="rgba(248,250,252,0.1)" stroke-width="0.8"/>
      <text x="68" y="152" fill="#f8fafc" font-size="9.5">Action: 1-Click Login</text>
      <text x="68" y="170" fill="#94a3b8" font-size="8" font-family="'Geist Mono', monospace">GitHub or Google</text>
      <text x="68" y="190" fill="#34d399" font-size="8" font-family="'Geist Mono', monospace">Feeling: Seamless &#128522;</text>

      <!-- Stage 2 -->
      <rect x="250" y="60" width="190" height="380" rx="6" fill="rgba(248,250,252,0.015)" stroke="rgba(248,250,252,0.1)" stroke-width="0.8"/>
      <text x="265" y="90" fill="#60a5fa" font-size="10" font-weight="600" font-family="'Geist Mono', monospace">02 / SETUP</text>
      <text x="265" y="112" fill="#f8fafc" font-size="12" font-weight="600">Select Project</text>
      <rect x="265" y="130" width="160" height="80" rx="4" fill="#242b37" stroke="rgba(248,250,252,0.1)" stroke-width="0.8"/>
      <text x="278" y="152" fill="#f8fafc" font-size="9.5">Action: Open Kanban</text>
      <text x="278" y="170" fill="#94a3b8" font-size="8" font-family="'Geist Mono', monospace">Pick Active Task</text>
      <text x="278" y="190" fill="#34d399" font-size="8" font-family="'Geist Mono', monospace">Feeling: Focused</text>

      <!-- Stage 3 -->
      <rect x="460" y="60" width="190" height="380" rx="6" fill="rgba(248,250,252,0.015)" stroke="rgba(248,250,252,0.1)" stroke-width="0.8"/>
      <text x="475" y="90" fill="#60a5fa" font-size="10" font-weight="600" font-family="'Geist Mono', monospace">03 / CODING</text>
      <text x="475" y="112" fill="#f8fafc" font-size="12" font-weight="600">Monaco IDE</text>
      <rect x="475" y="130" width="160" height="80" rx="4" fill="#242b37" stroke="rgba(248,250,252,0.1)" stroke-width="0.8"/>
      <text x="488" y="152" fill="#f8fafc" font-size="9.5">Action: Write Python</text>
      <text x="488" y="170" fill="#94a3b8" font-size="8" font-family="'Geist Mono', monospace">Auto-saved to DB</text>
      <text x="488" y="190" fill="#34d399" font-size="8" font-family="'Geist Mono', monospace">Feeling: Productive</text>

      <!-- Stage 4 (Focal) -->
      <rect x="670" y="60" width="190" height="380" rx="6" fill="rgba(240,138,89,0.04)" stroke="#f08a59" stroke-width="1.2"/>
      <text x="685" y="90" fill="#f08a59" font-size="10" font-weight="600" font-family="'Geist Mono', monospace">04 / RUN (FOCAL)</text>
      <text x="685" y="112" fill="#f8fafc" font-size="12" font-weight="600">Docker Sandbox</text>
      <rect x="685" y="130" width="160" height="80" rx="4" fill="#242b37" stroke="#f08a59" stroke-width="1"/>
      <text x="698" y="152" fill="#f08a59" font-size="9.5" font-weight="600">Action: Click "Run"</text>
      <text x="698" y="170" fill="#94a3b8" font-size="8" font-family="'Geist Mono', monospace">Isolated container</text>
      <text x="698" y="190" fill="#f08a59" font-size="8" font-family="'Geist Mono', monospace">Zero host exposure</text>

      <!-- Stage 5 -->
      <rect x="880" y="60" width="180" height="380" rx="6" fill="rgba(248,250,252,0.015)" stroke="rgba(248,250,252,0.1)" stroke-width="0.8"/>
      <text x="895" y="90" fill="#60a5fa" font-size="10" font-weight="600" font-family="'Geist Mono', monospace">05 / FEEDBACK</text>
      <text x="895" y="112" fill="#f8fafc" font-size="12" font-weight="600">Live Streaming</text>
      <rect x="895" y="130" width="150" height="80" rx="4" fill="#242b37" stroke="rgba(248,250,252,0.1)" stroke-width="0.8"/>
      <text x="908" y="152" fill="#f8fafc" font-size="9.5">Action: Read Logs</text>
      <text x="908" y="170" fill="#34d399" font-size="8" font-family="'Geist Mono', monospace">STOMP Real-time</text>
      <text x="908" y="190" fill="#34d399" font-size="8" font-family="'Geist Mono', monospace">Feeling: Delighted</text>

      <!-- Emotion Curve -->
      <path d="M 135,320 Q 345,300 555,270 T 765,240 T 970,220" fill="none" stroke="#f08a59" stroke-width="2"/>
      <circle cx="135" cy="320" r="5" fill="#f08a59"/>
      <circle cx="345" cy="290" r="5" fill="#f08a59"/>
      <circle cx="555" cy="270" r="5" fill="#f08a59"/>
      <circle cx="765" cy="240" r="6" fill="#f08a59"/>
      <circle cx="970" cy="220" r="5" fill="#34d399"/>
      <text x="50" y="380" fill="#94a3b8" font-size="8" font-family="'Geist Mono', monospace">Confidence &amp; Productivity Curve &uarr;</text>

      <!-- Legend -->
      <line x1="40" y1="465" x2="1060" y2="465" stroke="rgba(248,250,252,0.08)" stroke-width="0.8"/>
      <text x="40" y="485" fill="#94a3b8" font-size="8" font-family="'Geist Mono', monospace" letter-spacing="0.18em">LEGEND</text>
      <line x1="110" y1="483" x2="140" y2="483" stroke="#f08a59" stroke-width="2"/>
      <text x="148" y="485" fill="#94a3b8" font-size="8.5">Satisfaction &amp; Velocity Curve</text>
    </svg>"""

    save_diagram(slug, title, eyebrow, h1, svg)

# ================= 4. ER DIAGRAM: entity-relationships =================
def gen_er_diagram():
    slug = "entity-relationships"
    title = "Domain Entity-Relationship Diagram"
    h1 = "Conceptual Entity Relationships, Multiplicities, and Foreign Keys"
    eyebrow = "Entity Relationship"

    svg = f"""<svg viewBox="0 0 1100 520" xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="{slug}-title {slug}-desc">
      <title id="{slug}-title">{h1}</title>
      <desc id="{slug}-desc">Entity relationship diagram showing cardinalities between User, Project, KanbanBoard, Column, Task, and IdeFile entities.</desc>
      <defs>
        <marker id="arrow" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto"><polygon points="0 0, 8 3, 0 6" fill="#94a3b8"/></marker>
      </defs>
      <rect width="100%" height="100%" fill="#1e232d"/>

      <!-- Relationships -->
      <!-- User (1) -> Project (N) -->
      <line x1="200" y1="130" x2="350" y2="130" stroke="#94a3b8" stroke-width="1.2" marker-end="url(#arrow)"/>
      <text x="275" y="120" fill="#94a3b8" font-size="8" font-family="'Geist Mono', monospace" text-anchor="middle">1 : N (owns)</text>

      <!-- Project (1) -> Board (1) -->
      <line x1="490" y1="130" x2="620" y2="130" stroke="#94a3b8" stroke-width="1.2" marker-end="url(#arrow)"/>
      <text x="555" y="120" fill="#f08a59" font-size="8" font-family="'Geist Mono', monospace" text-anchor="middle">1 : 1 (has)</text>

      <!-- Board (1) -> Column (N) -->
      <line x1="760" y1="130" x2="880" y2="130" stroke="#94a3b8" stroke-width="1.2" marker-end="url(#arrow)"/>
      <text x="820" y="120" fill="#94a3b8" font-size="8" font-family="'Geist Mono', monospace" text-anchor="middle">1 : N</text>

      <!-- Column (1) -> Task (N) -->
      <path d="M 950,180 V 270 Q 950,285 935,285 H 760" fill="none" stroke="#94a3b8" stroke-width="1.2" marker-end="url(#arrow)"/>
      <text x="870" y="275" fill="#94a3b8" font-size="8" font-family="'Geist Mono', monospace">1 : N (contains)</text>

      <!-- Project (1) -> IdeFile (N) -->
      <path d="M 420,180 V 270 Q 420,285 435,285 H 620" fill="none" stroke="#94a3b8" stroke-width="1.2" marker-end="url(#arrow)"/>
      <text x="510" y="275" fill="#94a3b8" font-size="8" font-family="'Geist Mono', monospace">1 : N (persists)</text>

      <!-- Entities -->
      <!-- Entity: User -->
      <rect x="60" y="90" width="140" height="90" rx="4" fill="#242b37" stroke="rgba(248,250,252,0.18)" stroke-width="1"/>
      <rect x="60" y="90" width="140" height="24" rx="4" fill="rgba(248,250,252,0.06)"/>
      <text x="130" y="106" fill="#f8fafc" font-size="11" font-weight="600" text-anchor="middle">User</text>
      <text x="75" y="128" fill="#f08a59" font-size="8" font-family="'Geist Mono', monospace">PK id</text>
      <text x="75" y="146" fill="#94a3b8" font-size="8" font-family="'Geist Mono', monospace">email</text>
      <text x="75" y="164" fill="#94a3b8" font-size="8" font-family="'Geist Mono', monospace">role</text>

      <!-- Entity: Project -->
      <rect x="350" y="90" width="140" height="90" rx="4" fill="#242b37" stroke="rgba(248,250,252,0.18)" stroke-width="1"/>
      <rect x="350" y="90" width="140" height="24" rx="4" fill="rgba(248,250,252,0.06)"/>
      <text x="420" y="106" fill="#f8fafc" font-size="11" font-weight="600" text-anchor="middle">Project</text>
      <text x="365" y="128" fill="#f08a59" font-size="8" font-family="'Geist Mono', monospace">PK id</text>
      <text x="365" y="146" fill="#94a3b8" font-size="8" font-family="'Geist Mono', monospace">FK owner_id</text>
      <text x="365" y="164" fill="#94a3b8" font-size="8" font-family="'Geist Mono', monospace">name</text>

      <!-- Entity: KanbanBoard -->
      <rect x="620" y="90" width="140" height="90" rx="4" fill="#242b37" stroke="rgba(240,138,89,0.3)" stroke-width="1"/>
      <rect x="620" y="90" width="140" height="24" rx="4" fill="rgba(240,138,89,0.15)"/>
      <text x="690" y="106" fill="#f08a59" font-size="11" font-weight="600" text-anchor="middle">KanbanBoard</text>
      <text x="635" y="128" fill="#f08a59" font-size="8" font-family="'Geist Mono', monospace">PK id</text>
      <text x="635" y="146" fill="#94a3b8" font-size="8" font-family="'Geist Mono', monospace">FK project_id</text>
      <text x="635" y="164" fill="#94a3b8" font-size="8" font-family="'Geist Mono', monospace">title</text>

      <!-- Entity: Column -->
      <rect x="880" y="90" width="140" height="90" rx="4" fill="#242b37" stroke="rgba(248,250,252,0.18)" stroke-width="1"/>
      <rect x="880" y="90" width="140" height="24" rx="4" fill="rgba(248,250,252,0.06)"/>
      <text x="950" y="106" fill="#f8fafc" font-size="11" font-weight="600" text-anchor="middle">Column</text>
      <text x="895" y="128" fill="#f08a59" font-size="8" font-family="'Geist Mono', monospace">PK id</text>
      <text x="895" y="146" fill="#94a3b8" font-size="8" font-family="'Geist Mono', monospace">FK board_id</text>
      <text x="895" y="164" fill="#94a3b8" font-size="8" font-family="'Geist Mono', monospace">position</text>

      <!-- Entity: Task -->
      <rect x="620" y="240" width="140" height="90" rx="4" fill="#242b37" stroke="rgba(248,250,252,0.18)" stroke-width="1"/>
      <rect x="620" y="240" width="140" height="24" rx="4" fill="rgba(248,250,252,0.06)"/>
      <text x="690" y="256" fill="#f8fafc" font-size="11" font-weight="600" text-anchor="middle">Task</text>
      <text x="635" y="278" fill="#f08a59" font-size="8" font-family="'Geist Mono', monospace">PK id</text>
      <text x="635" y="296" fill="#94a3b8" font-size="8" font-family="'Geist Mono', monospace">FK column_id</text>
      <text x="635" y="314" fill="#94a3b8" font-size="8" font-family="'Geist Mono', monospace">priority</text>

      <!-- Entity: IdeFile -->
      <rect x="350" y="240" width="140" height="90" rx="4" fill="#242b37" stroke="rgba(248,250,252,0.18)" stroke-width="1"/>
      <rect x="350" y="240" width="140" height="24" rx="4" fill="rgba(248,250,252,0.06)"/>
      <text x="420" y="256" fill="#f8fafc" font-size="11" font-weight="600" text-anchor="middle">IdeFile</text>
      <text x="365" y="278" fill="#f08a59" font-size="8" font-family="'Geist Mono', monospace">PK id</text>
      <text x="365" y="296" fill="#94a3b8" font-size="8" font-family="'Geist Mono', monospace">FK project_id</text>
      <text x="365" y="314" fill="#94a3b8" font-size="8" font-family="'Geist Mono', monospace">path / content</text>

      <!-- Legend -->
      <line x1="60" y1="465" x2="1040" y2="465" stroke="rgba(248,250,252,0.08)" stroke-width="0.8"/>
      <text x="60" y="485" fill="#94a3b8" font-size="8" font-family="'Geist Mono', monospace" letter-spacing="0.18em">LEGEND</text>
      <line x1="130" y1="483" x2="160" y2="483" stroke="#94a3b8" stroke-width="1.2" marker-end="url(#arrow)"/>
      <text x="168" y="485" fill="#94a3b8" font-size="8.5">Entity Cardinality Link</text>
    </svg>"""

    save_diagram(slug, title, eyebrow, h1, svg)

# ================= 5. TREE: ide-virtual-filesystem-tree =================
def gen_ide_tree():
    slug = "ide-virtual-filesystem-tree"
    title = "IDE Virtual Filesystem Tree"
    h1 = "Project-Scoped Virtual File Hierarchy Persisted in PostgreSQL"
    eyebrow = "Tree Hierarchy"

    svg = f"""<svg viewBox="0 0 1100 520" xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="{slug}-title {slug}-desc">
      <title id="{slug}-title">{h1}</title>
      <desc id="{slug}-desc">Tree diagram of the virtual file hierarchy for a project stored in the ide_files database table.</desc>
      <defs>
        <marker id="arrow" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto"><polygon points="0 0, 8 3, 0 6" fill="#94a3b8"/></marker>
      </defs>
      <rect width="100%" height="100%" fill="#1e232d"/>

      <!-- Root Node -->
      <rect x="60" y="210" width="160" height="60" rx="6" fill="#242b37" stroke="#f08a59" stroke-width="1.2"/>
      <text x="75" y="235" fill="#f08a59" font-size="11" font-weight="600">project-root /</text>
      <text x="75" y="252" fill="#94a3b8" font-size="8" font-family="'Geist Mono', monospace">Project ID Scoped</text>

      <!-- Level 1 Connectors -->
      <path d="M 220,240 H 280 Q 290,240 290,170 V 100 Q 290,90 300,90 H 340" fill="none" stroke="#94a3b8" stroke-width="1.2" marker-end="url(#arrow)"/>
      <path d="M 220,240 H 340" fill="none" stroke="#94a3b8" stroke-width="1.2" marker-end="url(#arrow)"/>
      <path d="M 220,240 H 280 Q 290,240 290,320 V 390 Q 290,400 300,400 H 340" fill="none" stroke="#94a3b8" stroke-width="1.2" marker-end="url(#arrow)"/>

      <!-- Level 1 Nodes -->
      <!-- src/ -->
      <rect x="340" y="65" width="160" height="50" rx="4" fill="#242b37" stroke="rgba(248,250,252,0.18)" stroke-width="1"/>
      <text x="355" y="90" fill="#f8fafc" font-size="11" font-weight="600">&#128193; src/</text>
      <text x="355" y="105" fill="#94a3b8" font-size="7.5" font-family="'Geist Mono', monospace">Directory Node</text>

      <!-- config/ -->
      <rect x="340" y="215" width="160" height="50" rx="4" fill="#242b37" stroke="rgba(248,250,252,0.18)" stroke-width="1"/>
      <text x="355" y="240" fill="#f8fafc" font-size="11" font-weight="600">&#128193; config/</text>
      <text x="355" y="255" fill="#94a3b8" font-size="7.5" font-family="'Geist Mono', monospace">Directory Node</text>

      <!-- README.md -->
      <rect x="340" y="375" width="160" height="50" rx="4" fill="#242b37" stroke="rgba(248,250,252,0.18)" stroke-width="1"/>
      <text x="355" y="400" fill="#60a5fa" font-size="11" font-weight="500">&#128196; README.md</text>
      <text x="355" y="415" fill="#94a3b8" font-size="7.5" font-family="'Geist Mono', monospace">File &bull; 1.2 KB</text>

      <!-- Level 2 Connectors & Files -->
      <!-- src -> main.py -->
      <line x1="500" y1="90" x2="620" y2="70" stroke="#94a3b8" stroke-width="1" marker-end="url(#arrow)"/>
      <rect x="620" y="45" width="180" height="45" rx="4" fill="#242b37" stroke="rgba(240,138,89,0.3)" stroke-width="1"/>
      <text x="635" y="68" fill="#f08a59" font-size="10.5" font-weight="600">&#128196; main.py (Entrypoint)</text>
      <text x="635" y="82" fill="#94a3b8" font-size="7.5" font-family="'Geist Mono', monospace">Python 3.11 Runtime</text>

      <!-- src -> utils.py -->
      <line x1="500" y1="90" x2="620" y2="120" stroke="#94a3b8" stroke-width="1" marker-end="url(#arrow)"/>
      <rect x="620" y="100" width="180" height="45" rx="4" fill="#242b37" stroke="rgba(248,250,252,0.15)" stroke-width="1"/>
      <text x="635" y="122" fill="#f8fafc" font-size="10.5">&#128196; utils.py</text>
      <text x="635" y="136" fill="#94a3b8" font-size="7.5" font-family="'Geist Mono', monospace">Helper functions</text>

      <!-- config -> app.json -->
      <line x1="500" y1="240" x2="620" y2="240" stroke="#94a3b8" stroke-width="1" marker-end="url(#arrow)"/>
      <rect x="620" y="215" width="180" height="45" rx="4" fill="#242b37" stroke="rgba(248,250,252,0.15)" stroke-width="1"/>
      <text x="635" y="238" fill="#f8fafc" font-size="10.5">&#128196; settings.json</text>
      <text x="635" y="252" fill="#94a3b8" font-size="7.5" font-family="'Geist Mono', monospace">Environment configuration</text>

      <!-- DB mapping note -->
      <rect x="850" y="140" width="210" height="180" rx="6" fill="rgba(248,250,252,0.02)" stroke="rgba(248,250,252,0.1)" stroke-width="0.8"/>
      <text x="870" y="170" fill="#f8fafc" font-size="11" font-weight="600">Database Storage</text>
      <text x="870" y="195" fill="#94a3b8" font-size="8" font-family="'Geist Mono', monospace">&bull; Stored in ide_files table</text>
      <text x="870" y="215" fill="#94a3b8" font-size="8" font-family="'Geist Mono', monospace">&bull; Scoped by project_id</text>
      <text x="870" y="235" fill="#94a3b8" font-size="8" font-family="'Geist Mono', monospace">&bull; Unique constraint:</text>
      <text x="878" y="250" fill="#f08a59" font-size="7.5" font-family="'Geist Mono', monospace">(project_id, file_path)</text>
      <text x="870" y="275" fill="#94a3b8" font-size="8" font-family="'Geist Mono', monospace">&bull; Synced with Monaco Editor</text>

      <!-- Legend -->
      <line x1="60" y1="465" x2="1040" y2="465" stroke="rgba(248,250,252,0.08)" stroke-width="0.8"/>
      <text x="60" y="485" fill="#94a3b8" font-size="8" font-family="'Geist Mono', monospace" letter-spacing="0.18em">LEGEND</text>
      <rect x="130" y="478" width="14" height="10" rx="2" fill="rgba(240,138,89,0.2)" stroke="#f08a59" stroke-width="1"/>
      <text x="152" y="485" fill="#94a3b8" font-size="8.5">Executable Entrypoint File</text>
    </svg>"""

    save_diagram(slug, title, eyebrow, h1, svg)

if __name__ == "__main__":
    gen_kanban_board()
    gen_swimlane()
    gen_user_journey()
    gen_er_diagram()
    gen_ide_tree()
    print("Batch 2 completed!")

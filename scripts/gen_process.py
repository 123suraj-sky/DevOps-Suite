from scripts.diagram_generator_base import HTML_WRAPPER, DIAGRAMS_DIR

def generate_process():
    title = "Docker Sandboxed Execution Lifecycle"
    slug = "code-execution-lifecycle"
    h1 = "Docker Sandboxed Execution — Task Queue to Live WebSocket Stream"
    eyebrow = "Process Workflow"
    
    svg = f"""<svg viewBox="0 0 1100 520" xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="{slug}-title {slug}-desc">
      <title id="{slug}-title">{h1}</title>
      <desc id="{slug}-desc">Process diagram showing sequential lifecycle of code execution: IDE submission, rate limiting, async queue dispatch, Docker container isolation, log streaming, and container disposal.</desc>
      <defs>
        <pattern id="grid-dots-proc" width="22" height="22" patternUnits="userSpaceOnUse">
          <circle cx="2" cy="2" r="1" fill="rgba(248,250,252,0.06)"/>
        </pattern>
        <marker id="arrow" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto"><polygon points="0 0, 8 3, 0 6" fill="#94a3b8"/></marker>
        <marker id="arrow-accent" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto"><polygon points="0 0, 8 3, 0 6" fill="#f08a59"/></marker>
        <marker id="arrow-emerald" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto"><polygon points="0 0, 8 3, 0 6" fill="#34d399"/></marker>
      </defs>

      <rect width="100%" height="100%" fill="#1e232d"/>
      <rect width="100%" height="100%" fill="url(#grid-dots-proc)"/>

      <!-- Step columns headers -->
      <!-- Step 1 -->
      <rect x="50" y="40" width="18" height="18" rx="9" fill="rgba(148,163,184,0.2)"/>
      <text x="59" y="52" fill="#f8fafc" font-size="8" font-family="'Geist Mono', monospace" text-anchor="middle">1</text>
      <text x="59" y="70" fill="#94a3b8" font-size="7.5" font-family="'Geist Mono', monospace" text-anchor="middle">SUBMIT</text>

      <!-- Step 2 -->
      <rect x="220" y="40" width="18" height="18" rx="9" fill="rgba(148,163,184,0.2)"/>
      <text x="229" y="52" fill="#f8fafc" font-size="8" font-family="'Geist Mono', monospace" text-anchor="middle">2</text>
      <text x="229" y="70" fill="#94a3b8" font-size="7.5" font-family="'Geist Mono', monospace" text-anchor="middle">THROTTLE</text>

      <!-- Step 3 -->
      <rect x="390" y="40" width="18" height="18" rx="9" fill="rgba(148,163,184,0.2)"/>
      <text x="399" y="52" fill="#f8fafc" font-size="8" font-family="'Geist Mono', monospace" text-anchor="middle">3</text>
      <text x="399" y="70" fill="#94a3b8" font-size="7.5" font-family="'Geist Mono', monospace" text-anchor="middle">ENQUEUE</text>

      <!-- Step 4 (Focal) -->
      <rect x="570" y="40" width="18" height="18" rx="9" fill="rgba(240,138,89,0.3)"/>
      <text x="579" y="52" fill="#f08a59" font-size="8" font-weight="600" font-family="'Geist Mono', monospace" text-anchor="middle">4</text>
      <text x="579" y="70" fill="#f08a59" font-size="7.5" font-family="'Geist Mono', monospace" text-anchor="middle">ISOLATE</text>

      <!-- Step 5 -->
      <rect x="750" y="40" width="18" height="18" rx="9" fill="rgba(52,211,153,0.25)"/>
      <text x="759" y="52" fill="#34d399" font-size="8" font-family="'Geist Mono', monospace" text-anchor="middle">5</text>
      <text x="759" y="70" fill="#34d399" font-size="7.5" font-family="'Geist Mono', monospace" text-anchor="middle">STREAM</text>

      <!-- Step 6 -->
      <rect x="930" y="40" width="18" height="18" rx="9" fill="rgba(148,163,184,0.2)"/>
      <text x="939" y="52" fill="#f8fafc" font-size="8" font-family="'Geist Mono', monospace" text-anchor="middle">6</text>
      <text x="939" y="70" fill="#94a3b8" font-size="7.5" font-family="'Geist Mono', monospace" text-anchor="middle">TEARDOWN</text>

      <!-- Connectors behind boxes -->
      <line x1="130" y1="180" x2="162" y2="180" stroke="#94a3b8" stroke-width="1.2" marker-end="url(#arrow)"/>
      <line x1="298" y1="180" x2="332" y2="180" stroke="#94a3b8" stroke-width="1.2" marker-end="url(#arrow)"/>
      <line x1="468" y1="180" x2="502" y2="180" stroke="#f08a59" stroke-width="1.4" marker-end="url(#arrow-accent)"/>
      <line x1="658" y1="180" x2="682" y2="180" stroke="#f08a59" stroke-width="1.4" marker-end="url(#arrow-accent)"/>
      <line x1="838" y1="180" x2="862" y2="180" stroke="#34d399" stroke-width="1.2" marker-end="url(#arrow-emerald)"/>

      <!-- Return async stream to browser -->
      <path d="M 760,230 V 290 Q 760,300 750,300 H 70 Q 60,300 60,280 V 230" fill="none" stroke="#34d399" stroke-width="1.2" stroke-dasharray="4,3" marker-end="url(#arrow-emerald)"/>
      <rect x="360" y="292" width="110" height="14" rx="2" fill="#1e232d"/>
      <text x="415" y="302" fill="#34d399" font-size="7.5" font-family="'Geist Mono', monospace" text-anchor="middle">STOMP /topic/logs</text>

      <!-- Nodes -->
      <!-- Node 1: Web IDE -->
      <rect x="20" y="130" width="110" height="100" rx="6" fill="#242b37" stroke="rgba(248,250,252,0.15)" stroke-width="1"/>
      <rect x="28" y="138" width="30" height="12" rx="2" fill="none" stroke="rgba(148,163,184,0.4)" stroke-width="0.8"/>
      <text x="43" y="147" fill="#94a3b8" font-size="7" font-family="'Geist Mono', monospace" text-anchor="middle">IDE</text>
      <text x="75" y="172" fill="#f8fafc" font-size="11" font-weight="600" text-anchor="middle">Monaco Code</text>
      <text x="75" y="188" fill="#94a3b8" font-size="8" font-family="'Geist Mono', monospace" text-anchor="middle">POST /run</text>
      <text x="75" y="208" fill="rgba(148,163,184,0.7)" font-size="7.5" font-family="'Geist Mono', monospace" text-anchor="middle">Payload: Code+Lang</text>

      <!-- Node 2: Rate Limiter -->
      <rect x="162" y="130" width="136" height="100" rx="6" fill="#242b37" stroke="rgba(248,250,252,0.15)" stroke-width="1"/>
      <rect x="170" y="138" width="34" height="12" rx="2" fill="none" stroke="rgba(148,163,184,0.4)" stroke-width="0.8"/>
      <text x="187" y="147" fill="#94a3b8" font-size="7" font-family="'Geist Mono', monospace" text-anchor="middle">REDIS</text>
      <text x="230" y="172" fill="#f8fafc" font-size="11" font-weight="600" text-anchor="middle">Sliding Window</text>
      <text x="230" y="188" fill="#94a3b8" font-size="8" font-family="'Geist Mono', monospace" text-anchor="middle">RateLimitFilter</text>
      <text x="230" y="208" fill="rgba(148,163,184,0.7)" font-size="7.5" font-family="'Geist Mono', monospace" text-anchor="middle">Max Executions Cap</text>

      <!-- Node 3: Spring Async Queue -->
      <rect x="332" y="130" width="136" height="100" rx="6" fill="#242b37" stroke="rgba(248,250,252,0.15)" stroke-width="1"/>
      <rect x="340" y="138" width="38" height="12" rx="2" fill="none" stroke="rgba(148,163,184,0.4)" stroke-width="0.8"/>
      <text x="359" y="147" fill="#94a3b8" font-size="7" font-family="'Geist Mono', monospace" text-anchor="middle">QUEUE</text>
      <text x="400" y="172" fill="#f8fafc" font-size="11" font-weight="600" text-anchor="middle">Async Executor</text>
      <text x="400" y="188" fill="#94a3b8" font-size="8" font-family="'Geist Mono', monospace" text-anchor="middle">Spring Task Worker</text>
      <text x="400" y="208" fill="rgba(148,163,184,0.7)" font-size="7.5" font-family="'Geist Mono', monospace" text-anchor="middle">ThreadPool &amp; Bounds</text>

      <!-- Node 4: Docker Sandbox (Focal) -->
      <rect x="502" y="118" width="156" height="124" rx="6" fill="rgba(240,138,89,0.08)" stroke="#f08a59" stroke-width="1.5"/>
      <rect x="510" y="126" width="46" height="12" rx="2" fill="transparent" stroke="rgba(240,138,89,0.5)" stroke-width="0.8"/>
      <text x="533" y="135" fill="#f08a59" font-size="7" font-family="'Geist Mono', monospace" text-anchor="middle">SANDBOX</text>
      <text x="580" y="160" fill="#f8fafc" font-size="12" font-weight="600" text-anchor="middle">Docker Container</text>
      <text x="580" y="178" fill="#f08a59" font-size="8" font-family="'Geist Mono', monospace" text-anchor="middle">--no-network · ReadOnly</text>
      <text x="580" y="194" fill="#94a3b8" font-size="8" font-family="'Geist Mono', monospace" text-anchor="middle">256MB RAM · 1 CPU</text>
      <text x="580" y="210" fill="#94a3b8" font-size="7.5" font-family="'Geist Mono', monospace" text-anchor="middle">30s Hard Timeout</text>

      <!-- Node 5: Output Streamer -->
      <rect x="682" y="130" width="156" height="100" rx="6" fill="#242b37" stroke="rgba(52,211,153,0.3)" stroke-width="1"/>
      <rect x="690" y="138" width="38" height="12" rx="2" fill="none" stroke="rgba(52,211,153,0.4)" stroke-width="0.8"/>
      <text x="709" y="147" fill="#34d399" font-size="7" font-family="'Geist Mono', monospace" text-anchor="middle">STOMP</text>
      <text x="760" y="172" fill="#f8fafc" font-size="11" font-weight="600" text-anchor="middle">Log Streaming</text>
      <text x="760" y="188" fill="#34d399" font-size="8" font-family="'Geist Mono', monospace" text-anchor="middle">Frame-by-frame STDOUT</text>
      <text x="760" y="208" fill="rgba(148,163,184,0.7)" font-size="7.5" font-family="'Geist Mono', monospace" text-anchor="middle">Realtime WS Push</text>

      <!-- Node 6: Container Cleanup -->
      <rect x="862" y="130" width="136" height="100" rx="6" fill="#242b37" stroke="rgba(248,250,252,0.15)" stroke-width="1"/>
      <rect x="870" y="138" width="36" height="12" rx="2" fill="none" stroke="rgba(148,163,184,0.4)" stroke-width="0.8"/>
      <text x="888" y="147" fill="#94a3b8" font-size="7" font-family="'Geist Mono', monospace" text-anchor="middle">CLEAN</text>
      <text x="930" y="172" fill="#f8fafc" font-size="11" font-weight="600" text-anchor="middle">Destroy &amp; Audit</text>
      <text x="930" y="188" fill="#94a3b8" font-size="8" font-family="'Geist Mono', monospace" text-anchor="middle">Force Remove rm -f</text>
      <text x="930" y="208" fill="rgba(148,163,184,0.7)" font-size="7.5" font-family="'Geist Mono', monospace" text-anchor="middle">Log Run Metrics</text>

      <!-- Bottom summary cards -->
      <rect x="50" y="360" width="480" height="90" rx="6" fill="rgba(248,250,252,0.02)" stroke="rgba(248,250,252,0.08)" stroke-width="0.8"/>
      <text x="70" y="385" fill="#f8fafc" font-size="11" font-weight="600">Strict Isolation Security Profile</text>
      <text x="70" y="405" fill="#94a3b8" font-size="8.5" font-family="'Geist Mono', monospace">• Network completely disabled: container cannot call external IPs</text>
      <text x="70" y="420" fill="#94a3b8" font-size="8.5" font-family="'Geist Mono', monospace">• Root filesystem mounted read-only; temp execution buffer wiped</text>
      <text x="70" y="435" fill="#94a3b8" font-size="8.5" font-family="'Geist Mono', monospace">• Memory ceiling enforced by cgroups to prevent host exhaustion</text>

      <rect x="570" y="360" width="480" height="90" rx="6" fill="rgba(248,250,252,0.02)" stroke="rgba(248,250,252,0.08)" stroke-width="0.8"/>
      <text x="590" y="385" fill="#f8fafc" font-size="11" font-weight="600">Resilient Realtime Streaming</text>
      <text x="590" y="405" fill="#94a3b8" font-size="8.5" font-family="'Geist Mono', monospace">• Logs chunked and dispatched immediately over STOMP /topic/logs/&#123;projectId&#125;</text>
      <text x="590" y="420" fill="#94a3b8" font-size="8.5" font-family="'Geist Mono', monospace">• Zero blocking on client browser thread; Monaco terminal renders stream</text>
      <text x="590" y="435" fill="#94a3b8" font-size="8.5" font-family="'Geist Mono', monospace">• Immediate graceful kill on timeout triggers EXIT_TIMEOUT event</text>

      <!-- Legend -->
      <line x1="50" y1="480" x2="1050" y2="480" stroke="rgba(248,250,252,0.08)" stroke-width="0.8"/>
      <text x="50" y="498" fill="#94a3b8" font-size="8" font-family="'Geist Mono', monospace" letter-spacing="0.18em">LEGEND</text>
      <line x1="120" y1="495" x2="150" y2="495" stroke="#f08a59" stroke-width="1.4" marker-end="url(#arrow-accent)"/>
      <text x="158" y="498" fill="#94a3b8" font-size="8.5">Isolated Execution Step</text>
      <line x1="330" y1="495" x2="360" y2="495" stroke="#34d399" stroke-width="1.2" stroke-dasharray="4,3" marker-end="url(#arrow-emerald)"/>
      <text x="368" y="498" fill="#94a3b8" font-size="8.5">Real-time WebSocket Push</text>
      <line x1="550" y1="495" x2="580" y2="495" stroke="#94a3b8" stroke-width="1.2" marker-end="url(#arrow)"/>
      <text x="588" y="498" fill="#94a3b8" font-size="8.5">Internal Synchronous Pipeline</text>
    </svg>"""

    html = HTML_WRAPPER.format(title=title, eyebrow=eyebrow, h1=h1, svg_content=svg)
    (DIAGRAMS_DIR / f"{slug}.html").write_text(html, encoding="utf-8")
    print(f"Generated {slug}.html")

generate_process()

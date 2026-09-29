import os, sys
from pathlib import Path
sys.path.insert(0, ".")
from scripts.diagram_generator_base import HTML_WRAPPER, DIAGRAMS_DIR

def save_diagram(slug, title, eyebrow, h1, svg):
    html = HTML_WRAPPER.format(title=title, eyebrow=eyebrow, h1=h1, svg_content=svg)
    p = DIAGRAMS_DIR / f"{slug}.html"
    p.write_text(html, encoding="utf-8")
    print(f"Generated {p.name}")

# ================= 1. FISHBONE: sandbox-failure-cause-analysis =================
def gen_fishbone():
    slug = "sandbox-failure-cause-analysis"
    title = "Execution Sandbox Failure Root Cause Analysis"
    h1 = "Fishbone / Ishikawa Cause Analysis for Sandbox Job Terminations"
    eyebrow = "Root Cause Analysis"

    svg = f"""<svg viewBox="0 0 1100 520" xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="{slug}-title {slug}-desc">
      <title id="{slug}-title">{h1}</title>
      <desc id="{slug}-desc">Ishikawa fishbone diagram categorizing root causes for Docker code sandbox failures across Memory, Network, Timeouts, and Host constraints.</desc>
      <rect width="100%" height="100%" fill="#1e232d"/>

      <!-- Central Spine -->
      <line x1="80" y1="240" x2="880" y2="240" stroke="#f08a59" stroke-width="2"/>
      
      <!-- Fish Head (Problem Statement - Focal) -->
      <polygon points="880,180 1020,240 880,300" fill="rgba(240,138,89,0.15)" stroke="#f08a59" stroke-width="1.5"/>
      <text x="930" y="235" fill="#f08a59" font-size="11.5" font-weight="600" text-anchor="middle">EXECUTION</text>
      <text x="930" y="255" fill="#f8fafc" font-size="11" font-weight="600" text-anchor="middle">TERMINATION</text>

      <!-- Rib 1 (Top Left: Memory Limits) -->
      <line x1="280" y1="240" x2="200" y2="120" stroke="rgba(248,250,252,0.3)" stroke-width="1.2"/>
      <text x="190" y="110" fill="#60a5fa" font-size="10.5" font-weight="600">Memory Ceiling</text>
      <line x1="230" y1="165" x2="310" y2="165" stroke="rgba(248,250,252,0.15)"/>
      <text x="315" y="168" fill="#94a3b8" font-size="8" font-family="'Geist Mono', monospace">cgroup OOM Kill (256MB)</text>

      <!-- Rib 2 (Top Right: Timeouts) -->
      <line x1="650" y1="240" x2="570" y2="120" stroke="rgba(248,250,252,0.3)" stroke-width="1.2"/>
      <text x="560" y="110" fill="#60a5fa" font-size="10.5" font-weight="600">Timeout Limits</text>
      <line x1="600" y1="165" x2="680" y2="165" stroke="rgba(248,250,252,0.15)"/>
      <text x="685" y="168" fill="#94a3b8" font-size="8" font-family="'Geist Mono', monospace">30s Wall-clock Exceeded</text>

      <!-- Rib 3 (Bottom Left: Network Violations) -->
      <line x1="280" y1="240" x2="200" y2="360" stroke="rgba(248,250,252,0.3)" stroke-width="1.2"/>
      <text x="190" y="380" fill="#60a5fa" font-size="10.5" font-weight="600">Network Security</text>
      <line x1="230" y1="315" x2="310" y2="315" stroke="rgba(248,250,252,0.15)"/>
      <text x="315" y="318" fill="#94a3b8" font-size="8" font-family="'Geist Mono', monospace">--no-network Socket Drop</text>

      <!-- Rib 4 (Bottom Right: Filesystem Write) -->
      <line x1="650" y1="240" x2="570" y2="360" stroke="rgba(248,250,252,0.3)" stroke-width="1.2"/>
      <text x="560" y="380" fill="#60a5fa" font-size="10.5" font-weight="600">Filesystem Policy</text>
      <line x1="600" y1="315" x2="680" y2="315" stroke="rgba(248,250,252,0.15)"/>
      <text x="685" y="318" fill="#94a3b8" font-size="8" font-family="'Geist Mono', monospace">Read-only Mount Reject</text>

      <!-- Legend -->
      <line x1="80" y1="465" x2="1020" y2="465" stroke="rgba(248,250,252,0.08)" stroke-width="0.8"/>
      <text x="80" y="485" fill="#94a3b8" font-size="8" font-family="'Geist Mono', monospace" letter-spacing="0.18em">LEGEND</text>
      <line x1="140" y1="482" x2="170" y2="482" stroke="#f08a59" stroke-width="2"/>
      <text x="178" y="485" fill="#94a3b8" font-size="8.5">Controlled Sandbox Safety Boundary Termination</text>
    </svg>"""

    save_diagram(slug, title, eyebrow, h1, svg)

# ================= 2. VENN: security-cross-cutting-concerns =================
def gen_venn():
    slug = "security-cross-cutting-concerns"
    title = "Cross-Cutting Security Concerns Venn"
    h1 = "Convergence of JWT Stateless Tokens, Redis Blacklisting, and Docker Sandboxing"
    eyebrow = "Security Venn"

    svg = f"""<svg viewBox="0 0 1100 520" xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="{slug}-title {slug}-desc">
      <title id="{slug}-title">{h1}</title>
      <desc id="{slug}-desc">Venn diagram illustrating overlapping domains between Stateless JWT Auth, Stateful Redis Blacklisting, and Docker Kernel Sandboxing.</desc>
      <rect width="100%" height="100%" fill="#1e232d"/>

      <!-- Circle 1: Stateless JWT Auth (Left) -->
      <circle cx="430" cy="220" r="140" fill="rgba(96,165,250,0.1)" stroke="#60a5fa" stroke-width="1.5"/>
      <text x="360" y="160" fill="#60a5fa" font-size="12" font-weight="600">Stateless JWT</text>
      <text x="360" y="180" fill="#94a3b8" font-size="8" font-family="'Geist Mono', monospace">1h Expiry &bull; Claims</text>

      <!-- Circle 2: Stateful Redis Blacklist (Right) -->
      <circle cx="670" cy="220" r="140" fill="rgba(52,211,153,0.1)" stroke="#34d399" stroke-width="1.5"/>
      <text x="740" y="160" fill="#34d399" font-size="12" font-weight="600">Stateful Redis</text>
      <text x="740" y="180" fill="#94a3b8" font-size="8" font-family="'Geist Mono', monospace">Instant Revocation &bull; TTL</text>

      <!-- Circle 3: Docker Sandbox Execution (Bottom - Focal) -->
      <circle cx="550" cy="300" r="140" fill="rgba(240,138,89,0.12)" stroke="#f08a59" stroke-width="1.5"/>
      <text x="550" y="410" fill="#f08a59" font-size="12" font-weight="600" text-anchor="middle">Docker Kernel Sandbox</text>
      <text x="550" y="426" fill="#94a3b8" font-size="8" font-family="'Geist Mono', monospace" text-anchor="middle">No-network &bull; 256MB cap</text>

      <!-- Center Intersection (Tri-party Protection) -->
      <circle cx="550" cy="240" r="12" fill="#f08a59"/>
      <text x="550" y="244" fill="#1e232d" font-size="7" font-weight="700" font-family="'Geist Mono', monospace" text-anchor="middle">&#10003;</text>
      <rect x="490" y="200" width="120" height="20" rx="3" fill="#1e232d" stroke="rgba(248,250,252,0.2)" stroke-width="0.8"/>
      <text x="550" y="214" fill="#f8fafc" font-size="8" font-weight="600" text-anchor="middle">Hardened Core</text>

      <!-- Legend -->
      <line x1="80" y1="465" x2="1020" y2="465" stroke="rgba(248,250,252,0.08)" stroke-width="0.8"/>
      <text x="80" y="485" fill="#94a3b8" font-size="8" font-family="'Geist Mono', monospace" letter-spacing="0.18em">LEGEND</text>
      <circle cx="140" cy="482" r="5" fill="#f08a59"/>
      <text x="155" y="485" fill="#94a3b8" font-size="8.5">Triple-Barrier Security Perimeter</text>
    </svg>"""

    save_diagram(slug, title, eyebrow, h1, svg)

# ================= 3. PYRAMID: testing-pyramid =================
def gen_pyramid():
    slug = "testing-pyramid"
    title = "Testing Strategy Pyramid"
    h1 = "DevOps Suite Automated Quality & Verification Strategy"
    eyebrow = "Testing Pyramid"

    svg = f"""<svg viewBox="0 0 1100 520" xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="{slug}-title {slug}-desc">
      <title id="{slug}-title">{h1}</title>
      <desc id="{slug}-desc">Testing pyramid showing test distribution across Unit tests, Integration tests, and End-to-End browser tests.</desc>
      <rect width="100%" height="100%" fill="#1e232d"/>

      <!-- Top Tier: E2E Tests (10%) -->
      <polygon points="550,80 630,170 470,170" fill="rgba(240,138,89,0.15)" stroke="#f08a59" stroke-width="1.2"/>
      <text x="550" y="140" fill="#f08a59" font-size="10.5" font-weight="600" text-anchor="middle">E2E Tests (10%)</text>
      <text x="550" y="155" fill="#94a3b8" font-size="7.5" font-family="'Geist Mono', monospace" text-anchor="middle">Browser &bull; API Workflows</text>

      <!-- Middle Tier: Integration Tests (30% - Focal) -->
      <polygon points="470,175 630,175 730,285 370,285" fill="rgba(96,165,250,0.12)" stroke="#60a5fa" stroke-width="1.2"/>
      <text x="550" y="225" fill="#60a5fa" font-size="11.5" font-weight="600" text-anchor="middle">Integration Tests (30%)</text>
      <text x="550" y="245" fill="#f8fafc" font-size="8.5" font-family="'Geist Mono', monospace" text-anchor="middle">@SpringBootTest &bull; Testcontainers Postgres &bull; Redis</text>

      <!-- Bottom Tier: Unit Tests (60%) -->
      <polygon points="370,290 730,290 850,420 250,420" fill="rgba(52,211,153,0.1)" stroke="#34d399" stroke-width="1.2"/>
      <text x="550" y="350" fill="#34d399" font-size="12" font-weight="600" text-anchor="middle">Unit Tests (60%)</text>
      <text x="550" y="370" fill="#f8fafc" font-size="8.5" font-family="'Geist Mono', monospace" text-anchor="middle">JUnit 5 &bull; Mockito &bull; React Testing Library</text>
      <text x="550" y="388" fill="#94a3b8" font-size="8" font-family="'Geist Mono', monospace" text-anchor="middle">Instant Feedback Cycle</text>

      <!-- Speed & Cost indicators on right -->
      <line x1="880" y1="100" x2="880" y2="400" stroke="rgba(248,250,252,0.18)" stroke-width="1.2"/>
      <text x="900" y="110" fill="#f08a59" font-size="8.5" font-family="'Geist Mono', monospace">&uarr; Higher Cost &amp; Execution Time</text>
      <text x="900" y="390" fill="#34d399" font-size="8.5" font-family="'Geist Mono', monospace">&darr; Maximum Speed &amp; Isolation</text>

      <!-- Legend -->
      <line x1="80" y1="465" x2="1020" y2="465" stroke="rgba(248,250,252,0.08)" stroke-width="0.8"/>
      <text x="80" y="485" fill="#94a3b8" font-size="8" font-family="'Geist Mono', monospace" letter-spacing="0.18em">LEGEND</text>
      <polygon points="140,480 148,490 132,490" fill="#34d399"/>
      <text x="155" y="485" fill="#94a3b8" font-size="8.5">Foundation: Fast Mocked Unit Suites</text>
    </svg>"""

    save_diagram(slug, title, eyebrow, h1, svg)

# ================= 4. WARDLEY MAP: devops-platform-wardley-map =================
def gen_wardley():
    slug = "devops-platform-wardley-map"
    title = "Platform Evolution Wardley Map"
    h1 = "Evolutionary Maturity of DevOps Suite Platform Components"
    eyebrow = "Wardley Map"

    svg = f"""<svg viewBox="0 0 1100 520" xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="{slug}-title {slug}-desc">
      <title id="{slug}-title">{h1}</title>
      <desc id="{slug}-desc">Wardley map positioning system features from Genesis, Custom Built, Product, to Commodity.</desc>
      <rect width="100%" height="100%" fill="#1e232d"/>

      <!-- Axes -->
      <line x1="80" y1="420" x2="1020" y2="420" stroke="rgba(248,250,252,0.18)" stroke-width="1.2"/>
      <line x1="80" y1="80" x2="80" y2="420" stroke="rgba(248,250,252,0.18)" stroke-width="1.2"/>

      <!-- Evolution Stages -->
      <text x="180" y="440" fill="#94a3b8" font-size="8.5" font-family="'Geist Mono', monospace" text-anchor="middle">Genesis</text>
      <text x="420" y="440" fill="#94a3b8" font-size="8.5" font-family="'Geist Mono', monospace" text-anchor="middle">Custom Built</text>
      <text x="680" y="440" fill="#94a3b8" font-size="8.5" font-family="'Geist Mono', monospace" text-anchor="middle">Product (+feature)</text>
      <text x="920" y="440" fill="#94a3b8" font-size="8.5" font-family="'Geist Mono', monospace" text-anchor="middle">Commodity / Utility</text>

      <line x1="300" y1="80" x2="300" y2="420" stroke="rgba(248,250,252,0.05)" stroke-dasharray="3,3"/>
      <line x1="550" y1="80" x2="550" y2="420" stroke="rgba(248,250,252,0.05)" stroke-dasharray="3,3"/>
      <line x1="800" y1="80" x2="800" y2="420" stroke="rgba(248,250,252,0.05)" stroke-dasharray="3,3"/>

      <!-- Component 1: Docker Sandbox (Custom Built - Focal) -->
      <circle cx="450" cy="180" r="7" fill="#f08a59"/>
      <text x="450" y="160" fill="#f08a59" font-size="10.5" font-weight="600" text-anchor="middle">Docker Sandbox Runner</text>
      <text x="450" y="200" fill="#94a3b8" font-size="8" font-family="'Geist Mono', monospace" text-anchor="middle">Proprietary Isolation</text>

      <!-- Component 2: Monaco Web IDE -->
      <circle cx="680" cy="180" r="6" fill="#60a5fa"/>
      <text x="680" y="160" fill="#f8fafc" font-size="10.5" text-anchor="middle">Monaco Code Editor</text>

      <!-- Component 3: Relational DB & Redis -->
      <circle cx="920" cy="300" r="6" fill="#34d399"/>
      <text x="920" y="280" fill="#34d399" font-size="10.5" text-anchor="middle">Postgres &amp; Redis</text>

      <!-- Component 4: OAuth Providers -->
      <circle cx="940" cy="180" r="6" fill="#34d399"/>
      <text x="940" y="160" fill="#34d399" font-size="10.5" text-anchor="middle">Google / GitHub OAuth</text>

      <!-- Legend -->
      <line x1="80" y1="465" x2="1020" y2="465" stroke="rgba(248,250,252,0.08)" stroke-width="0.8"/>
      <text x="80" y="485" fill="#94a3b8" font-size="8" font-family="'Geist Mono', monospace" letter-spacing="0.18em">LEGEND</text>
      <circle cx="140" cy="482" r="5" fill="#f08a59"/>
      <text x="155" y="485" fill="#94a3b8" font-size="8.5">Core Intellectual Property &amp; Value Engine</text>
    </svg>"""

    save_diagram(slug, title, eyebrow, h1, svg)

if __name__ == "__main__":
    gen_fishbone()
    gen_venn()
    gen_pyramid()
    gen_wardley()
    print("Batch 7 completed!")

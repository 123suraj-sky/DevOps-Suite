import os
from pathlib import Path

DIAGRAMS_DIR = Path("docs/diagrams")
DIAGRAMS_DIR.mkdir(parents=True, exist_ok=True)

HTML_WRAPPER = """<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{title}</title>
  <link href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Geist:wght@400;500;600&family=Geist+Mono:wght@400;500;600&display=swap" rel="stylesheet">
  <style>
    *, *::before, *::after {{ box-sizing: border-box; margin: 0; padding: 0; }}
    :root {{
      --color-paper:   #1e232d;
      --color-ink:     #f8fafc;
      --color-muted:   #94a3b8;
      --color-accent:  #f08a59;
      --font-sans:     'Geist', system-ui, -apple-system, sans-serif;
      --font-serif:    'Instrument Serif', Georgia, serif;
      --font-mono:     'Geist Mono', ui-monospace, monospace;
    }}
    body {{
      font-family: var(--font-sans);
      background: var(--color-paper);
      color: var(--color-ink);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 2.5rem 1.5rem;
    }}
    .frame {{ max-width: 1240px; width: 100%; }}
    .eyebrow {{
      font-family: var(--font-mono);
      font-size: 0.7rem;
      font-weight: 500;
      letter-spacing: 0.18em;
      text-transform: uppercase;
      color: var(--color-muted);
      margin-bottom: 0.4rem;
    }}
    h1 {{
      font-family: var(--font-serif);
      font-size: clamp(1.6rem, 2.5vw + 0.8rem, 2.2rem);
      font-weight: 400;
      letter-spacing: -0.02em;
      line-height: 1.15;
      color: var(--color-ink);
      margin-bottom: 1.25rem;
    }}
    svg {{
      width: 100%;
      height: auto;
      display: block;
      border: 1px solid rgba(248, 250, 252, 0.08);
      border-radius: 8px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.35);
    }}
  </style>
</head>
<body>
  <div class="frame">
    <p class="eyebrow">{eyebrow} · Diagram Design</p>
    <h1>{h1}</h1>
    {svg_content}
  </div>
</body>
</html>
"""

print("Base wrapper ready")

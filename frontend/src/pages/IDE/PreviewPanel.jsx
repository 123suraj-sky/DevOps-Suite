/**
 * PreviewPanel — live preview pane for HTML and Markdown files.
 *
 * Props:
 *   language  — 'html' | 'markdown'
 *   content   — string: current editor content (may have unsaved edits)
 *   dark      — boolean: true for the dark IDE chrome, false for CodeEditorPage
 *   files     — FileListItem[] from ideFilesApi.listFiles (IDE only; omit for
 *               standalone CodeEditorPage where there is no shared file system)
 *   tabs      — Tab[] from EditorContext (IDE only; provides latest unsaved
 *               content for linked files that are open in the editor)
 *   htmlFilePath — string: path of the HTML file being previewed, used to
 *               resolve relative asset paths (e.g. "../css/style.css")
 */

import { useRef, useEffect, useCallback, useState, useReducer } from 'react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { ideFilesApi } from '../../api/ideFilesApi';

// ── marked configuration ──────────────────────────────────────────────────────

marked.setOptions({
  gfm:    true,
  breaks: false,
});

// ── Markdown prose styles ─────────────────────────────────────────────────────

const MD_STYLES = `
  *, *::before, *::after { box-sizing: border-box; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
    font-size: 14px;
    line-height: 1.6;
    color: #24292f;
    background: #ffffff;
    padding: 20px 24px;
    margin: 0;
    max-width: 860px;
  }
  h1,h2,h3,h4,h5,h6 { margin-top:1.5em; margin-bottom:.5em; font-weight:600; line-height:1.25; }
  h1 { font-size:2em;   border-bottom:1px solid #d0d7de; padding-bottom:.3em; }
  h2 { font-size:1.5em; border-bottom:1px solid #d0d7de; padding-bottom:.3em; }
  h3 { font-size:1.25em; }
  p  { margin:.5em 0 1em; }
  a  { color:#0969da; text-decoration:none; }
  a:hover { text-decoration:underline; }
  code {
    font-family:'SFMono-Regular',Consolas,'Liberation Mono',Menlo,monospace;
    font-size:.875em; background:#f6f8fa;
    border:1px solid #d0d7de; border-radius:6px; padding:.2em .4em;
  }
  pre {
    background:#f6f8fa; border:1px solid #d0d7de; border-radius:6px;
    padding:12px 16px; overflow-x:auto; line-height:1.45;
  }
  pre code { background:none; border:none; padding:0; font-size:.85em; }
  blockquote { margin:0 0 1em; padding:.5em 1em; color:#57606a; border-left:4px solid #d0d7de; }
  table { border-collapse:collapse; width:100%; margin-bottom:1em; }
  th,td { border:1px solid #d0d7de; padding:6px 13px; }
  th { background:#f6f8fa; font-weight:600; }
  tr:nth-child(even) td { background:#f6f8fa; }
  ul,ol { padding-left:2em; margin-bottom:1em; }
  li+li { margin-top:.25em; }
  hr { border:none; border-top:1px solid #d0d7de; margin:1.5em 0; }
  img { max-width:100%; }
  li input[type="checkbox"] { margin-right:.4em; }
`;

// ── Path resolution helpers ───────────────────────────────────────────────────

/**
 * Resolve a relative asset path against the HTML file's directory.
 *
 * e.g. htmlFilePath = "src/index.html", assetRef = "../css/style.css"
 *      → "css/style.css"
 *
 * Returns null for absolute URLs (http://, https://, //, data:, etc.) so
 * those are left unchanged in the HTML and the browser fetches them normally.
 */
function resolveRelativePath(htmlFilePath, assetRef) {
  if (!assetRef) return null;
  // Leave absolute URLs and data URIs alone
  if (/^(https?:\/\/|\/\/|data:|blob:|#)/.test(assetRef)) return null;
  // Absolute paths within the project (e.g. /style.css) — strip leading slash
  const ref = assetRef.startsWith('/') ? assetRef.slice(1) : assetRef;

  // Build the directory of the HTML file
  const dir = htmlFilePath ? htmlFilePath.split('/').slice(0, -1).join('/') : '';

  // Concatenate and normalise with URL-style resolution
  const raw = dir ? `${dir}/${ref}` : ref;
  const parts = raw.split('/');
  const resolved = [];
  for (const part of parts) {
    if (part === '..') resolved.pop();
    else if (part !== '.') resolved.push(part);
  }
  return resolved.join('/');
}

/**
 * Find a file in the IDE file list by resolved path.
 * The IDE stores paths without a leading slash.
 */
function findFile(files, resolvedPath) {
  if (!files?.length || !resolvedPath) return null;
  return files.find((f) => f.path === resolvedPath || f.path === `/${resolvedPath}`) ?? null;
}

/**
 * Get the latest content for a file — prefer the open tab (which has unsaved
 * edits) over the DB snapshot.
 */
function getContentFromTab(tabs, fileId) {
  return tabs?.find((t) => t.id === fileId)?.content ?? null;
}

// ── Asset inlining ────────────────────────────────────────────────────────────

/**
 * Parse the HTML string and collect all resolvable CSS and JS asset references.
 * Returns an array of { type: 'css'|'js', ref: originalSrc, resolved: string, fileId: string|null }.
 *
 * We use simple regex scanning here rather than a full DOM parser so this
 * works synchronously before we have a window object, and avoids executing
 * any scripts during analysis.
 */
function collectAssetRefs(html, htmlFilePath, files) {
  const assets = [];

  // <link rel="stylesheet" href="...">  (order/type attributes may appear before or after href)
  const linkRe = /<link\b[^>]*\brel=["']stylesheet["'][^>]*\bhref=["']([^"']+)["'][^>]*>|<link\b[^>]*\bhref=["']([^"']+)["'][^>]*\brel=["']stylesheet["'][^>]*/gi;
  let m;
  while ((m = linkRe.exec(html)) !== null) {
    const ref = m[1] ?? m[2];
    const resolved = resolveRelativePath(htmlFilePath, ref);
    if (resolved) {
      const file = findFile(files, resolved);
      assets.push({ type: 'css', ref, resolved, fileId: file?.id ?? null });
    }
  }

  // <script src="...">
  const scriptRe = /<script\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi;
  while ((m = scriptRe.exec(html)) !== null) {
    const ref = m[1];
    const resolved = resolveRelativePath(htmlFilePath, ref);
    if (resolved) {
      const file = findFile(files, resolved);
      assets.push({ type: 'js', ref, resolved, fileId: file?.id ?? null });
    }
  }

  return assets;
}

/**
 * Given the original HTML and a map of { ref → inlined content }, replace
 * each resolvable <link> and <script src> with an inline <style>/<script> block.
 */
function inlineAssets(html, inlinedMap) {
  // Replace <link rel="stylesheet" href="ref"> with <style>content</style>
  let result = html.replace(
    /(<link\b[^>]*\brel=["']stylesheet["'][^>]*\bhref=["'])([^"']+)(["'][^>]*>)|(<link\b[^>]*\bhref=["'])([^"']+)(["'][^>]*\brel=["']stylesheet["'][^>]*>)/gi,
    (match, p1, ref1, p3, p4, ref2) => {
      const ref = ref1 ?? ref2;
      if (inlinedMap.has(ref)) {
        return `<style>/* inlined: ${ref} */\n${inlinedMap.get(ref)}\n</style>`;
      }
      return match; // leave unchanged if we couldn't resolve it
    }
  );

  // Replace <script src="ref"></script> with <script>content</script>
  result = result.replace(
    /<script\b([^>]*)\bsrc=["']([^"']+)["']([^>]*)>(\s*<\/script>)?/gi,
    (match, before, ref, after) => {
      if (inlinedMap.has(ref)) {
        return `<script${before}${after}>/* inlined: ${ref} */\n${inlinedMap.get(ref)}\n</script>`;
      }
      return match;
    }
  );

  return result;
}

// ── Srcdoc builders ───────────────────────────────────────────────────────────

function buildMarkdownSrcdoc(content) {
  const rawHtml  = marked.parse(content ?? '');
  const safeHtml = DOMPurify.sanitize(rawHtml, {
    USE_PROFILES: { html: true },
    ADD_ATTR: ['target'],
  });
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<style>${MD_STYLES}</style>
</head>
<body>${safeHtml}</body>
</html>`;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function PreviewPanel({
  language,
  content,
  dark         = false,
  files        = [],   // FileListItem[] — IDE only
  tabs         = [],   // Tab[] from EditorContext — IDE only
  htmlFilePath = '',   // path of the active HTML file — IDE only
}) {
  const iframeRef   = useRef(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // srcdoc is built asynchronously because resolving linked files may require
  // API fetches. We keep it in state and update it via an effect.
  const [srcdoc, setSrcdoc] = useState('');

  // ── Build srcdoc whenever inputs change ────────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    async function build() {
      if (language === 'markdown') {
        if (!cancelled) setSrcdoc(buildMarkdownSrcdoc(content));
        return;
      }

      if (language !== 'html') return;

      const html = content ?? '';

      // If no file list provided (standalone CodeEditorPage), render as-is
      if (!files.length) {
        if (!cancelled) setSrcdoc(html);
        return;
      }

      // 1. Collect all resolvable asset references
      const assetRefs = collectAssetRefs(html, htmlFilePath, files);

      if (!assetRefs.length) {
        if (!cancelled) setSrcdoc(html);
        return;
      }

      // 2. Fetch content for each asset — prefer open tab, then API
      const inlinedMap = new Map();

      await Promise.all(assetRefs.map(async ({ ref, fileId }) => {
        if (!fileId) return; // can't resolve — leave the original tag

        // Check open tabs first (has unsaved edits)
        const tabContent = getContentFromTab(tabs, fileId);
        if (tabContent !== null) {
          inlinedMap.set(ref, tabContent);
          return;
        }

        // Fall back to fetching from the API
        try {
          const file = await ideFilesApi.getFile(fileId);
          if (!cancelled) inlinedMap.set(ref, file.content ?? '');
        } catch {
          // Silently skip — leave the original <link>/<script> tag unchanged
        }
      }));

      if (!cancelled) setSrcdoc(inlineAssets(html, inlinedMap));
    }

    build();
    return () => { cancelled = true; };

  // refreshKey is intentionally included so the Refresh button forces a rebuild
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language, content, files, tabs, htmlFilePath, refreshKey]);

  // ── Write srcdoc to the iframe DOM directly ────────────────────────────────
  // Avoids React's diffing quirks that can cause full iframe reloads.
  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe || !srcdoc) return;
    if (iframe.getAttribute('srcdoc') !== srcdoc) {
      iframe.setAttribute('srcdoc', srcdoc);
    }
  }, [srcdoc]);

  const handleRefresh = useCallback(() => {
    setRefreshKey(k => k + 1);
  }, []);

  // ── Chrome styles (dark = IDE panel, light = CodeEditorPage) ─────────────
  const chrome = dark
    ? {
        wrap:    'flex flex-col h-full bg-[#1e1e1e] border-l border-[#3c3c3c]',
        toolbar: 'flex items-center justify-between px-3 py-1.5 border-b border-[#3c3c3c] shrink-0',
        label:   'text-[11px] font-semibold uppercase tracking-wider text-[#858585]',
        badge:   'text-[10px] px-1.5 py-0.5 rounded bg-[#3c3c3c] text-[#858585] font-mono',
        btn:     'flex items-center gap-1 px-2 py-0.5 text-[11px] rounded text-[#cccccc] hover:bg-[#3c3c3c] transition-colors',
      }
    : {
        wrap:    'flex flex-col h-full bg-white border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden',
        toolbar: 'flex items-center justify-between px-3 py-2 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50 shrink-0',
        label:   'text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider',
        badge:   'text-xs px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 font-mono',
        btn:     'flex items-center gap-1 px-2 py-1 text-xs rounded text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors',
      };

  const langLabel = language === 'html' ? 'HTML Preview' : 'Markdown Preview';

  return (
    <div className={chrome.wrap}>
      {/* ── Toolbar ──────────────────────────────────────────────────────── */}
      <div className={chrome.toolbar}>
        <div className="flex items-center gap-2">
          <span className={chrome.label}>{langLabel}</span>
          <span className={chrome.badge}>{language === 'html' ? '.html' : '.md'}</span>
        </div>
        <button
          onClick={handleRefresh}
          title="Force full refresh"
          className={chrome.btn}
          aria-label="Refresh preview"
        >
          {/* Refresh icon — inline SVG (dynamic, exception per AGENTS.md) */}
          <svg className="w-3 h-3" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
          </svg>
          Refresh
        </button>
      </div>

      {/* ── iframe sandbox ────────────────────────────────────────────────── */}
      {/*
        sandbox:
          allow-scripts      — inline <script> blocks run (needed after inlining)
          allow-same-origin  — scripts can access their own document DOM
        NOT included:
          allow-top-navigation, allow-popups, allow-forms, allow-modals
      */}
      <iframe
        ref={iframeRef}
        title={`${langLabel} — live preview`}
        className="flex-1 w-full border-0 bg-white"
        sandbox="allow-scripts allow-same-origin"
        referrerPolicy="no-referrer"
        aria-label={`${langLabel} — live preview`}
      />
    </div>
  );
}

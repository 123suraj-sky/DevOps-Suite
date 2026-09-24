import { useState, useRef, useEffect, useCallback, useMemo, useId } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '../../utils';
import chevronIcon from '../../assets/47_chevron_down.svg';

/**
 * Select — fully custom listbox that matches the Input component's visual
 * language and renders its option panel via a React portal so it always
 * floats above every ancestor stacking context.
 *
 * API is a drop-in replacement for the previous native-<select> wrapper:
 *
 *   <Select label="Priority" value={val} onChange={handler} indicator="bg-amber-400">
 *     <option value="LOW">Low</option>
 *     <option value="MEDIUM">Medium</option>
 *   </Select>
 *
 *   — or —
 *
 *   <Select options={[{ value: 'LOW', label: 'Low' }]} ... />
 *
 * Props:
 *   label       – field label (uppercase tracking, same as Input)
 *   error       – error string; swaps border to red
 *   options     – array of { value, label, disabled? } — alternative to children
 *   placeholder – first disabled option text (shown when value is "")
 *   className   – extra classes on the trigger button
 *   id          – explicit id; auto-derived from label otherwise
 *   children    – <option> elements (parsed into the same options array)
 *   value       – controlled selected value
 *   onChange    – (e: { target: { value } }) => void  — same as native select
 *   indicator   – Tailwind bg color class for a left dot, e.g. 'bg-amber-400'
 *   disabled    – disables the control
 *
 * Note: colorScheme prop from the previous version is no longer needed — the
 * option panel is fully React-rendered and uses design tokens directly.
 */
export const Select = ({
  label,
  error,
  options: optionsProp = [],
  placeholder,
  className,
  id,
  children,
  value,
  onChange,
  indicator,
  disabled = false,
  // Accept colorScheme silently — no-op, kept for API compat
  // eslint-disable-next-line no-unused-vars
  colorScheme,
  ...rest
}) => {
  const autoId = useId();
  const selectId = id || autoId;

  // ── Parse options from children <option> elements or the options prop ──
  const options = useMemo(() => {
    if (optionsProp.length > 0) return optionsProp;
    const parsed = [];
    if (placeholder) parsed.push({ value: '', label: placeholder, disabled: true });
    // Walk children — support direct <option> elements and fragments
    const walk = (nodes) => {
      if (!nodes) return;
      const arr = Array.isArray(nodes) ? nodes : [nodes];
      arr.forEach((child) => {
        if (!child) return;
        if (child.type === 'option') {
          parsed.push({
            value:    String(child.props.value ?? ''),
            label:    String(child.props.children ?? ''),
            disabled: !!child.props.disabled,
          });
        } else if (child.props?.children) {
          walk(child.props.children);
        }
      });
    };
    walk(children);
    return parsed;
  }, [optionsProp, children, placeholder]);

  // ── Derive selected label from current value ──
  const selectedOption = options.find((o) => String(o.value) === String(value ?? ''));
  const displayLabel = selectedOption?.label ?? placeholder ?? '';

  // ── Open / close state ──
  const [open, setOpen] = useState(false);
  const [panelStyle, setPanelStyle] = useState({});
  const triggerRef = useRef(null);
  const panelRef   = useRef(null);
  const listId = useId();

  // ── Position the panel relative to the trigger ──
  const positionPanel = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const PANEL_MAX_HEIGHT = 240;
    const GUTTER = 8;
    const panelWidth = rect.width;

    // Decide if we open upward or downward
    const spaceBelow = window.innerHeight - rect.bottom - GUTTER;
    const spaceAbove = rect.top - GUTTER;
    const openUpward = spaceBelow < PANEL_MAX_HEIGHT && spaceAbove > spaceBelow;

    let top, maxHeight;
    if (openUpward) {
      maxHeight = Math.min(PANEL_MAX_HEIGHT, spaceAbove);
      top = rect.top - maxHeight - 4;
    } else {
      maxHeight = Math.min(PANEL_MAX_HEIGHT, spaceBelow);
      top = rect.bottom + 4;
    }

    // Clamp left to viewport
    let left = rect.left;
    if (left + panelWidth > window.innerWidth - GUTTER) {
      left = window.innerWidth - panelWidth - GUTTER;
    }
    if (left < GUTTER) left = GUTTER;

    setPanelStyle({
      position:  'fixed',
      zIndex:    9999,
      top:       Math.round(top),
      left:      Math.round(left),
      width:     Math.round(panelWidth),
      maxHeight: Math.round(maxHeight),
    });
  }, []);

  const openPanel = useCallback(() => {
    if (disabled) return;
    positionPanel();
    setOpen(true);
  }, [disabled, positionPanel]);

  const closePanel = useCallback(() => setOpen(false), []);

  const selectValue = useCallback((val) => {
    if (onChange) {
      onChange({ target: { value: val } });
    }
    closePanel();
  }, [onChange, closePanel]);

  // ── Close on outside click or scroll ──
  useEffect(() => {
    if (!open) return;
    const handleMouseDown = (e) => {
      if (
        panelRef.current && !panelRef.current.contains(e.target) &&
        triggerRef.current && !triggerRef.current.contains(e.target)
      ) {
        closePanel();
      }
    };
    const handleScroll = (e) => {
      // Close if something other than the panel itself scrolled
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        closePanel();
      }
    };
    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('scroll', handleScroll, true);
    return () => {
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('scroll', handleScroll, true);
    };
  }, [open, closePanel]);

  // ── Keyboard navigation ──
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e) => {
      const selectableOptions = options.filter((o) => !o.disabled);
      const currentIdx = selectableOptions.findIndex((o) => String(o.value) === String(value ?? ''));

      if (e.key === 'Escape') {
        e.preventDefault();
        closePanel();
        triggerRef.current?.focus();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        const next = selectableOptions[Math.min(currentIdx + 1, selectableOptions.length - 1)];
        if (next) selectValue(next.value);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        const prev = selectableOptions[Math.max(currentIdx - 1, 0)];
        if (prev) selectValue(prev.value);
      } else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        closePanel();
        triggerRef.current?.focus();
      } else if (e.key === 'Tab') {
        closePanel();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, options, value, selectValue, closePanel]);

  // ── Reposition on window resize ──
  useEffect(() => {
    if (!open) return;
    const handleResize = () => positionPanel();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [open, positionPanel]);

  const hasIndicator = indicator != null && indicator !== '';

  // ── Trigger button classes — mirror Input.jsx geometry exactly ──
  const triggerClass = cn(
    'relative flex items-center w-full py-2 text-sm rounded-md border transition-colors duration-150',
    'bg-[var(--surface-sunken)] text-[var(--text-primary)]',
    hasIndicator ? 'pl-7' : 'pl-3',
    'pr-8',
    error
      ? 'border-red-400 dark:border-red-500'
      : open
        ? 'border-[var(--accent)] ring-2 ring-[var(--accent)] ring-opacity-25'
        : 'border-[var(--border-subtle)] hover:border-[var(--border-strong)]',
    disabled
      ? 'opacity-50 cursor-not-allowed'
      : 'cursor-pointer',
    className
  );

  return (
    <div className="w-full">
      {label && (
        <label
          id={`${selectId}-label`}
          htmlFor={selectId}
          className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5 uppercase tracking-wide"
        >
          {label}
        </label>
      )}

      {/* ── Trigger ── */}
      <div className="relative">
        {hasIndicator && (
          <span
            className={cn(
              'absolute left-3 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full shrink-0 pointer-events-none z-10',
              indicator
            )}
            aria-hidden="true"
          />
        )}

        <button
          ref={triggerRef}
          id={selectId}
          type="button"
          role="combobox"
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-labelledby={label ? `${selectId}-label ${selectId}` : undefined}
          aria-controls={open ? listId : undefined}
          disabled={disabled}
          onClick={open ? closePanel : openPanel}
          className={triggerClass}
          {...rest}
        >
          <span className={cn(
            'flex-1 text-left truncate leading-none',
            !selectedOption && placeholder ? 'text-[var(--text-muted)]' : 'text-[var(--text-primary)]'
          )}>
            {displayLabel || <span className="text-[var(--text-muted)]">{placeholder}</span>}
          </span>
        </button>

        {/* Custom chevron */}
        <span
          className={cn(
            'absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none z-10 transition-transform duration-150',
            open && 'rotate-180'
          )}
          aria-hidden="true"
        >
          <img
            src={chevronIcon}
            alt=""
            className="w-3.5 h-3.5 opacity-50 dark:brightness-0 dark:invert dark:opacity-40"
          />
        </span>
      </div>

      {/* ── Portal panel ── */}
      {open && createPortal(
        <ul
          ref={panelRef}
          id={listId}
          role="listbox"
          aria-labelledby={label ? `${selectId}-label` : undefined}
          style={panelStyle}
          className={cn(
            'overflow-y-auto rounded-lg border py-1',
            'bg-[var(--surface-overlay)] border-[var(--border-subtle)]',
            'shadow-[0_8px_32px_rgba(0,0,0,0.5)]',
            'focus:outline-none'
          )}
          tabIndex={-1}
          onMouseDown={(e) => e.preventDefault()} // keep trigger focused
        >
          {options.map((opt) => {
            const isSelected = String(opt.value) === String(value ?? '');
            return (
              <li
                key={opt.value}
                role="option"
                aria-selected={isSelected}
                aria-disabled={opt.disabled}
                onMouseDown={(e) => {
                  e.preventDefault();
                  if (!opt.disabled) selectValue(opt.value);
                }}
                className={cn(
                  'flex items-center gap-2.5 px-3 py-2 text-sm cursor-pointer select-none transition-colors duration-100',
                  opt.disabled
                    ? 'opacity-40 cursor-not-allowed text-[var(--text-muted)]'
                    : isSelected
                      ? 'bg-[var(--accent-subtle)] text-[var(--accent-text)]'
                      : 'text-[var(--text-primary)] hover:bg-[var(--surface-raised)]'
                )}
              >
                {/* Checkmark for selected item */}
                <span className={cn('w-3.5 h-3.5 shrink-0 flex items-center justify-center', isSelected ? 'opacity-100' : 'opacity-0')}>
                  <svg viewBox="0 0 12 12" fill="none" className="w-3 h-3" aria-hidden="true">
                    <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </span>
                {opt.label}
              </li>
            );
          })}
        </ul>,
        document.body
      )}

      {error && (
        <p className="mt-1.5 text-xs text-red-500 dark:text-red-400">{error}</p>
      )}
    </div>
  );
};

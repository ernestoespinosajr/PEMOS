'use client';

/**
 * Shared tooltip style object matching Design-Criteria.md chart tooltip spec:
 * - surface white background
 * - shadow-md
 * - rounded-md (8px)
 * - text-sm
 * - space-2 (8px) padding
 * - 1px border color (#E5E5E5)
 */
export const CHART_TOOLTIP_STYLE: React.CSSProperties = {
  backgroundColor: '#FFFFFF',
  border: '1px solid #E5E5E5',
  borderRadius: '8px',
  padding: '8px',
  boxShadow:
    '0 4px 6px -1px rgba(0, 0, 0, 0.07), 0 2px 4px -2px rgba(0, 0, 0, 0.05)',
  fontSize: '0.875rem',
  lineHeight: '1.25rem',
};

/**
 * Shared tooltip wrapper props for Recharts <Tooltip>.
 * Apply to the Tooltip component using spread:
 *   <Tooltip {...TOOLTIP_PROPS} />
 */
export const TOOLTIP_PROPS = {
  contentStyle: CHART_TOOLTIP_STYLE,
  cursor: { fill: 'rgba(45, 106, 79, 0.05)' },
  labelStyle: {
    color: '#404040',
    fontWeight: 600,
    marginBottom: '4px',
    fontSize: '0.875rem',
  },
  itemStyle: {
    color: '#525252',
    fontSize: '0.875rem',
    padding: '2px 0',
  },
} as const;

// ---------- Chart color constants ----------

export const CHART_COLORS = {
  primary: '#2D6A4F',
  primaryLight: '#40916C',
  primary100: '#B7E4C7',
  primaryTint: '#D8F3DC',
  gridLine: '#E5E5E5',
  axisLabel: '#737373',
} as const;

// ---------- Shared axis tick style ----------

export const AXIS_TICK_STYLE = {
  fontSize: 12,
  fill: '#737373',
  fontFamily:
    "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
} as const;

// ---------- Shared grid style ----------

export const CARTESIAN_GRID_PROPS = {
  strokeDasharray: '4 4',
  stroke: '#E5E5E5',
  vertical: false,
} as const;

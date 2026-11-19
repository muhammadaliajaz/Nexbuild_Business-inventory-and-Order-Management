function parseDate(input?: string | Date | null): Date | null {
  if (!input) return null;
  if (input instanceof Date) return isNaN(input.getTime()) ? null : input;

  const raw = String(input).trim();
  if (!raw) return null;

  const normalized = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/.test(raw)
    ? raw.replace(' ', 'T')
    : raw;

  const parsed = new Date(normalized);
  return isNaN(parsed.getTime()) ? null : parsed;
}

export function formatDate(input?: string | Date | null): string {
  const d = parseDate(input);
  return d
    ? d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    : '—';
}

export function formatTime(input?: string | Date | null): string {
  const d = parseDate(input);
  return d
    ? d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
    : '—';
}

export function formatDateTime(input?: string | Date | null): string {
  const d = parseDate(input);
  return d ? `${formatDate(d)}, ${formatTime(d)}` : '—';
}

export function formatRelativeTime(input?: string | Date | null): string {
  const d = parseDate(input);
  if (!d) return '—';

  const diffSec = Math.floor((Date.now() - d.getTime()) / 1000);
  if (diffSec < 60) return 'Just now';
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;

  return formatDateTime(d);
}

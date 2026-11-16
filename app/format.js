// Small helpers for showing API values, plus a tiny safe Markdown renderer
// for the descriptions and rules the API returns as Markdown text.

/** Text made safe to put inside HTML. */
export function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

/** An API path ('/api/avatars/x.webp') or full URL as an absolute URL. */
export function absUrl(path) {
  if (!path) return '';
  return path.startsWith('/') ? `https://make.fun${path}` : path;
}

/** A dollar amount ('607.00' or 0.5) as '$607' or '$0.50'. */
export function money(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '—';
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: Number.isInteger(n) ? 0 : 2 });
}

/** A count with its noun: plural(182, 'entry') is '182 entries'. */
export function plural(count, noun) {
  const n = Number(count) || 0;
  const word = n === 1 ? noun : /[^aeiou]y$/.test(noun) ? `${noun.slice(0, -1)}ies` : `${noun}s`;
  return `${n.toLocaleString('en-US')} ${word}`;
}

/** An ISO timestamp as a UTC date and time. */
export function date(iso) {
  if (!iso) return '—';
  return `${new Date(iso).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'UTC' })} UTC`;
}

/** Whether a deadline is still ahead: entries close by deadline, not status. */
export function isOpen(deadline) {
  return deadline != null && new Date(deadline).getTime() > Date.now();
}

/** The time until a deadline: '2d 4h left', '35m left', 'closing', or 'ended'. */
export function timeLeft(iso) {
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return 'ended';
  const days = Math.floor(ms / 86400000);
  const hours = Math.floor((ms % 86400000) / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);
  if (days > 0) return `${days}d ${hours}h left`;
  if (hours > 0) return `${hours}h ${minutes}m left`;
  if (minutes > 0) return `${minutes}m left`;
  return 'closing in under a minute';
}

/** A leaderboard win rate in micro-units (949192) as a percent ('94.9%'). */
export function winRate(micro) {
  const n = Number(micro);
  if (!Number.isFinite(n)) return '—';
  return `${(n / 10000).toFixed(1)}%`;
}

/** Inline Markdown on already-escaped text: code, bold, italic, links. */
function inline(text) {
  return text
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>')
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (match, label, url) =>
      /^(https?:\/\/|\/)/.test(url) ? `<a href="${url}" rel="noopener">${label}</a>` : label,
    );
}

/** Render Markdown text to safe HTML: headings, lists, quotes, code blocks. */
export function markdown(source) {
  const lines = esc(source ?? '').split('\n');
  const out = [];
  let list = null; // 'ul' or 'ol' while list items accumulate
  let code = false;
  const closeList = () => {
    if (list) out.push(`</${list}>`);
    list = null;
  };
  for (const line of lines) {
    if (/^```/.test(line)) {
      closeList();
      out.push(code ? '</code></pre>' : '<pre><code>');
      code = !code;
      continue;
    }
    if (code) {
      out.push(line);
      continue;
    }
    const heading = line.match(/^(#{1,4})\s+(.*)$/);
    const item = line.match(/^\s*(?:[-*]|\d+\.)\s+(.*)$/);
    if (heading) {
      closeList();
      const level = Math.min(heading[1].length + 1, 4);
      out.push(`<h${level}>${inline(heading[2])}</h${level}>`);
    } else if (item) {
      const kind = /^\s*\d+\./.test(line) ? 'ol' : 'ul';
      if (list !== kind) {
        closeList();
        list = kind;
        out.push(`<${kind}>`);
      }
      out.push(`<li>${inline(item[1])}</li>`);
    } else if (/^\s*---+\s*$/.test(line)) {
      closeList();
      out.push('<hr>');
    } else if (/^&gt;\s?/.test(line)) {
      closeList();
      out.push(`<blockquote>${inline(line.replace(/^&gt;\s?/, ''))}</blockquote>`);
    } else if (line.trim() === '') {
      closeList();
    } else {
      closeList();
      out.push(`<p>${inline(line)}</p>`);
    }
  }
  closeList();
  if (code) out.push('</code></pre>');
  return out.join('\n');
}

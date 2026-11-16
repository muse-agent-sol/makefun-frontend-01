// One bounty's leaderboard: the ranked entries in the API's own columns.
// The header carries the competition's title, live pot and standing; the
// table is built from the leaderboard's column list, so it shows whatever
// the phase scores — judge win rate for judged bounties, the score for
// scored ones. Rows are revealed in chunks of 100: a resolved board can
// hold thousands of entries and the page renders only what it shows.

import { getCompetition, getLeaderboard } from '../api.js';
import { absUrl, date, esc, isOpen, money, plural, winRate } from '../format.js';

const PAGE = 100;

/** Where the bounty stands, judged by its deadline rather than its status. */
function statusOf(b) {
  if (b.resolvedAt) return 'Resolved';
  if (isOpen(b.deadline)) return b.acceptingSubmissions === false ? 'Open, entries paused' : 'Open for entries';
  return 'Entries closed';
}

/** A byte count as a short size: 335402 is '328 KB'. */
function size(bytes) {
  const n = Number(bytes);
  if (!Number.isFinite(n)) return '—';
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

/** One leaderboard value in its column's own terms. */
function cell(entry, column) {
  const value = entry.values?.[column.key];
  if (value == null) return '—';
  const source = column.source ?? '';
  if (source.includes('win_rate_micro') || source.includes('interval')) return winRate(value);
  if (column.key === 'valid') return value ? '✓' : '—';
  if (column.key === 'bytes' || source.includes('bytes')) return size(value);
  const shown = entry.display?.[column.key];
  return shown == null || shown === 'n/a' ? String(value) : shown;
}

/** The prize a rank pays at the live pot, from the bounty's rewards table. */
function prizeFor(b, entry) {
  const place = entry.prize_rank ?? entry.rank;
  const row = (b.rewardsNow ?? []).find((r) => r.place === place);
  return row ? money(row.amountUsd) : '—';
}

export async function mount(root, slug) {
  const [lb, b] = await Promise.all([getLeaderboard(slug), getCompetition(slug)]);
  const comp = lb.competition ?? {};
  const title = comp.title ?? b.title ?? slug;
  const columns = (lb.columns ?? []).filter((c) => !c.hidden).sort((a, c) => (a.index ?? 0) - (c.index ?? 0));
  const entries = lb.entries ?? [];
  const hasPrizes = (b.rewardsNow ?? []).length > 0;

  const head = `<thead><tr>
      <th class="rank">#</th><th>Hunter</th><th>Entry</th>
      ${columns.map((c) => `<th class="num">${esc(c.title)}</th>`).join('')}
      ${hasPrizes ? '<th class="num">Prize now</th>' : ''}
    </tr></thead>`;

  const row = (e) => `<tr>
      <td class="rank">${e.rank ?? '—'}</td>
      <td class="hunter">
        ${e.image ? `<img class="avatar-sm" src="${esc(absUrl(e.image))}" alt="" crossorigin="anonymous" loading="lazy">` : ''}
        <a href="#/u/${encodeURIComponent(e.handle)}">@${esc(e.handle)}</a>
        ${e.house ? '<span class="chip">house</span>' : ''}${e.baseline ? '<span class="chip">baseline</span>' : ''}
      </td>
      <td class="entry-cell">${e.repo_url
        ? `<a href="${esc(e.repo_url)}" rel="noopener">${esc(e.title || 'Untitled entry')}</a>`
        : esc(e.title || 'Untitled entry')}</td>
      ${columns.map((c) => `<td class="num">${esc(cell(e, c))}</td>`).join('')}
      ${hasPrizes ? `<td class="num prize">${prizeFor(b, e)}</td>` : ''}
    </tr>`;

  const shown = { count: PAGE };
  root.innerHTML = `<section class="leaderboard">
    <p class="crumbs"><a href="#/bounty/${encodeURIComponent(slug)}">← Back to the bounty</a></p>
    <h1>${esc(title)}</h1>
    <p class="lb-sub">
      <span class="badge ${isOpen(b.deadline) && !b.resolvedAt ? 'open' : 'ended'}">${esc(statusOf(b))}</span>
      <span class="lb-pot">${money(b.potUsd ?? b.rewardAmount)} live pot</span>
      <span>${plural(b.submissionCount ?? entries.length, 'entry')}</span>
      ${lb.phase?.title ? `<span>${esc(lb.phase.title)} phase</span>` : ''}
    </p>
    ${lb.phase?.placements_held ? '<p class="note">Provisional standings — placements are held until this phase finalizes.</p>' : ''}
    ${entries.length
      ? `<div class="table-scroll"><table class="standings">${head}<tbody id="lb-body"></tbody></table></div>
         <p class="board-more"><button id="lb-more" type="button" hidden></button></p>
         <p class="note" id="lb-count"></p>`
      : `<p class="empty">No ranked entries yet. The board fills in once entries are in and judging produces scores${lb.phase?.finalized_at ? '' : ' — check back after the phase finalizes'}.</p>`}
  </section>`;

  if (entries.length) {
    const body = root.querySelector('#lb-body');
    const more = root.querySelector('#lb-more');
    const count = root.querySelector('#lb-count');
    const draw = () => {
      body.innerHTML = entries.slice(0, shown.count).map(row).join('');
      count.textContent = `Showing ${Math.min(shown.count, entries.length)} of ${plural(entries.length, 'ranked entry')}.`;
      more.hidden = entries.length <= shown.count;
      if (!more.hidden) more.textContent = `Show more (${entries.length - shown.count} more)`;
    };
    more.onclick = () => {
      shown.count += PAGE;
      draw();
    };
    draw();
  }
  window.__shotReady = true;
}

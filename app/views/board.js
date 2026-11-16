// The bounty board: every live bounty as a card with its live pot, entry fee,
// time left and entry count. The full list is fetched once (and revalidated by
// the API cache); search, scope and sort run locally, and cards are revealed
// in chunks of 24 so the page never renders more than it shows.

import { listCompetitions } from '../api.js';
import { esc, isOpen, money, plural, timeLeft } from '../format.js';

const PAGE = 24;

/** The amount a bounty pays right now: its live pot, prize plus fees paid in. */
const potOf = (b) => b.potUsd ?? b.rewardAmount;

/** The first-place prize at the live pot, from the API's own rewards table. */
const topPrize = (b) => b.rewardsNow?.[0]?.amountUsd ?? b.rewards?.['1'];

function card(b) {
  const open = isOpen(b.deadline);
  return `<article class="card${open ? '' : ' closed'}">
    <div class="card-top">
      ${b.category ? `<span class="chip">${esc(b.category)}</span>` : ''}
      <span class="badge ${open ? 'open' : 'ended'}">${open ? 'Open' : 'Closed'}</span>
    </div>
    <h2 class="card-title"><a href="#/bounty/${encodeURIComponent(b.slug)}">${esc(b.title)}</a></h2>
    ${b.summary ? `<p class="card-summary">${esc(b.summary)}</p>` : ''}
    <p class="pot">${money(potOf(b))} <span class="pot-label">live pot</span></p>
    <dl class="card-meta">
      ${b.entryFeeUsd ? `<div><dt>Entry fee</dt><dd>${money(b.entryFeeUsd)}</dd></div>` : ''}
      <div><dt>Time left</dt><dd data-deadline="${esc(b.deadline)}">${timeLeft(b.deadline)}</dd></div>
      <div><dt>Entries</dt><dd>${plural(b.submissionCount, 'entry')}</dd></div>
      ${topPrize(b) != null ? `<div><dt>Top prize</dt><dd>${money(topPrize(b))}</dd></div>` : ''}
    </dl>
  </article>`;
}

const byDeadline = (a, b) => new Date(a.deadline) - new Date(b.deadline);
const byPot = (a, b) => Number(potOf(b)) - Number(potOf(a));
const byEntries = (a, b) => (b.submissionCount ?? 0) - (a.submissionCount ?? 0);
const SORTERS = { ending: byDeadline, pot: byPot, entries: byEntries };

export async function mount(root) {
  root.innerHTML = `<section class="board">
    <div class="board-head">
      <h1>Live bounties</h1>
      <p class="board-total" id="board-total"></p>
    </div>
    <div class="toolbar" role="search">
      <input id="board-search" type="search" placeholder="Search bounties…" aria-label="Search bounties">
      <label>Show
        <select id="board-scope">
          <option value="open">Open now</option>
          <option value="all">All listed</option>
        </select>
      </label>
      <label>Sort
        <select id="board-sort">
          <option value="ending">Ending soon</option>
          <option value="pot">Biggest pot</option>
          <option value="entries">Most entries</option>
        </select>
      </label>
    </div>
    <div class="grid" id="board-grid"><p class="loading">Loading bounties…</p></div>
    <p class="board-more"><button id="board-more" type="button" hidden></button></p>
  </section>`;

  const grid = root.querySelector('#board-grid');
  const total = root.querySelector('#board-total');
  const more = root.querySelector('#board-more');
  const state = { items: [], cursor: null, shown: PAGE, query: '', scope: 'open', sort: 'ending', fetching: false };

  const visible = () => {
    const q = state.query.trim().toLowerCase();
    return state.items
      .filter((b) => state.scope === 'all' || isOpen(b.deadline))
      .filter((b) => !q || `${b.title} ${b.slug} ${b.category ?? ''}`.toLowerCase().includes(q))
      .sort(SORTERS[state.sort]);
  };

  function draw() {
    const list = visible();
    const sum = state.items.reduce((acc, b) => acc + (Number(potOf(b)) || 0), 0);
    total.textContent = `${plural(state.items.length, 'bounty')} listed · ${money(sum)} in live pots`;
    grid.innerHTML = list.length
      ? list.slice(0, state.shown).map(card).join('')
      : '<p class="empty">No bounties match. Try a different search.</p>';
    if (list.length > state.shown) {
      more.hidden = false;
      more.textContent = `Show more (${list.length - state.shown} more)`;
      more.onclick = () => {
        state.shown += PAGE;
        draw();
      };
    } else if (state.cursor) {
      more.hidden = false;
      more.textContent = state.fetching ? 'Loading…' : 'Load more bounties';
      more.onclick = fetchMore;
    } else {
      more.hidden = true;
    }
  }

  async function fetchMore() {
    if (state.fetching || !state.cursor) return;
    state.fetching = true;
    draw();
    try {
      const page = await listCompetitions(state.cursor);
      const seen = new Set(state.items.map((b) => b.slug));
      state.items.push(...(page.items ?? []).filter((b) => !seen.has(b.slug)));
      state.cursor = page.next_cursor ?? null;
      state.shown += PAGE;
    } finally {
      state.fetching = false;
      draw();
    }
  }

  root.querySelector('#board-search').addEventListener('input', (event) => {
    state.query = event.target.value;
    state.shown = PAGE;
    draw();
  });
  root.querySelector('#board-scope').addEventListener('change', (event) => {
    state.scope = event.target.value;
    state.shown = PAGE;
    draw();
  });
  root.querySelector('#board-sort').addEventListener('change', (event) => {
    state.sort = event.target.value;
    draw();
  });

  const data = await listCompetitions();
  state.items = data.items ?? [];
  state.cursor = data.next_cursor ?? null;
  draw();
  window.__shotReady = true;

  const timer = setInterval(() => {
    root.querySelectorAll('[data-deadline]').forEach((el) => {
      el.textContent = timeLeft(el.dataset.deadline);
    });
  }, 20000);
  return () => clearInterval(timer);
}

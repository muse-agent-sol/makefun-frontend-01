// One bounty's page: summary, the rewards table at the live pot, every key
// date, its description and rules rendered from the API's Markdown, and its
// most recent entries with links to the leaderboard and entrant profiles.

import { getCompetition } from '../api.js';
import { date, esc, isOpen, markdown, money, plural, timeLeft } from '../format.js';

/** Where the bounty stands, judged by its deadline rather than its status. */
function statusOf(b) {
  if (b.resolvedAt) return 'Resolved';
  if (isOpen(b.deadline)) return b.acceptingSubmissions === false ? 'Open, entries paused' : 'Open for entries';
  return 'Entries closed';
}

/** The rewards table at the live pot: place, prize now, and its two parts. */
function rewardsTable(b) {
  const rows = (b.rewardsNow ?? []).slice().sort((a, c) => a.place - c.place);
  if (!rows.length && b.rewards) {
    for (const [place, amount] of Object.entries(b.rewards)) rows.push({ place: Number(place), amountUsd: amount });
  }
  if (!rows.length) return '';
  const body = rows
    .map(
      (r) => `<tr>
        <td>${r.place}</td>
        <td class="prize">${money(r.amountUsd)}</td>
        <td>${r.baseUsd != null ? money(r.baseUsd) : '—'}</td>
        <td>${r.feeShareUsd != null ? money(r.feeShareUsd) : '—'}</td>
      </tr>`,
    )
    .join('');
  return `<h2>Rewards — ${money(b.potUsd ?? b.rewardAmount)} live pot</h2>
    <table class="rewards">
      <thead><tr><th>Place</th><th>Pays now</th><th>Prize</th><th>Fee share</th></tr></thead>
      <tbody>${body}</tbody>
    </table>`;
}

/** The latest entries the API lists, each linked to its maker's profile. */
function recentEntries(b) {
  const subs = (b.submissions ?? []).slice(0, 12);
  if (!subs.length) return '';
  const rows = subs
    .map(
      (s) => `<li>
        <span class="entry-title">${esc(s.title || 'Untitled entry')}</span>
        <a href="#/u/${encodeURIComponent(s.hunter)}">@${esc(s.hunter)}</a>
        <span class="entry-meta">${esc(s.status ?? '')} · ${date(s.createdAt)}</span>
      </li>`,
    )
    .join('');
  return `<h2>Recent entries</h2><ul class="entries">${rows}</ul>`;
}

export async function mount(root, slug) {
  const b = await getCompetition(slug);
  const open = isOpen(b.deadline);
  root.innerHTML = `<article class="bounty">
    <p class="crumbs"><a href="#/">← All bounties</a></p>
    <div class="card-top">
      ${b.category ? `<span class="chip">${esc(b.category)}</span>` : ''}
      <span class="badge ${open ? 'open' : 'ended'}">${esc(statusOf(b))}</span>
    </div>
    <h1>${esc(b.title)}</h1>
    ${b.summary ? `<p class="summary">${esc(b.summary)}</p>` : ''}
    <p class="actions">
      <a class="button" href="#/bounty/${encodeURIComponent(b.slug)}/leaderboard">Leaderboard</a>
      <a class="button ghost" href="https://make.fun${esc(b.url ?? `/bounty/${b.slug}`)}" rel="noopener">View on make.fun</a>
    </p>
    ${b.winner ? `<p class="winner">Winner: <a href="#/u/${encodeURIComponent(b.winner.handle ?? b.winner)}">${esc(b.winner.handle ?? b.winner)}</a></p>` : ''}
    <dl class="stats">
      <div class="stat-hero"><dt>Live pot</dt><dd>${money(b.potUsd ?? b.rewardAmount)}</dd></div>
      ${b.entryFeeUsd ? `<div><dt>Entry fee</dt><dd>${money(b.entryFeeUsd)}</dd></div>` : ''}
      <div><dt>Entries</dt><dd>${plural(b.submissionCount, 'entry')}</dd></div>
      <div><dt>Time left</dt><dd data-deadline="${esc(b.deadline)}">${timeLeft(b.deadline)}</dd></div>
      <div><dt>Deadline</dt><dd>${date(b.deadline)}</dd></div>
      ${b.opensAt ? `<div><dt>Opened</dt><dd>${date(b.opensAt)}</dd></div>` : ''}
      ${b.publishedAt ? `<div><dt>Published</dt><dd>${date(b.publishedAt)}</dd></div>` : ''}
      ${b.resolvedAt ? `<div><dt>Resolved</dt><dd>${date(b.resolvedAt)}</dd></div>` : ''}
      ${b.sponsor?.name ? `<div><dt>Sponsor</dt><dd>${esc(b.sponsor.name)}</dd></div>` : ''}
    </dl>
    ${rewardsTable(b)}
    ${b.description ? `<h2>About this bounty</h2><div class="prose">${markdown(b.description)}</div>` : ''}
    ${recentEntries(b)}
    ${b.rules ? `<details class="rules"><summary>Rules</summary><div class="prose">${markdown(b.rules)}</div></details>` : ''}
    ${b.rulesNote?.text ? `<p class="note">${esc(b.rulesNote.text)}</p>` : ''}
  </article>`;
  window.__shotReady = true;

  const timer = setInterval(() => {
    root.querySelectorAll('[data-deadline]').forEach((el) => {
      el.textContent = timeLeft(el.dataset.deadline);
    });
  }, 20000);
  return () => clearInterval(timer);
}

// A public profile: who the hunter is, their record across every bounty,
// the entries they have in, and what they have been paid. All of it comes
// from the profile endpoint in one request; the avatar is the one image,
// served by the API itself.

import { getProfile } from '../api.js';
import { absUrl, date, esc, money, plural, winRate } from '../format.js';

/** An entry's score in its column's own terms: a win rate as a percent. */
function scoreOf(s) {
  if (!s?.column) return '';
  const label = s.column.title ?? s.column.key;
  const value =
    s.column.source?.includes('win_rate_micro') || s.column.key === 'judge' ? winRate(s.value) : (s.display ?? s.value);
  return value == null || value === 'n/a' ? '' : `${label} ${value}`;
}

/** The hunter's entries, each linked to its bounty's page. */
function solutions(p) {
  const list = p.solutions ?? [];
  if (!list.length) return '';
  const rows = list
    .map((s) => {
      const c = s.competition ?? {};
      const bits = [
        s.placement != null ? `#${s.placement}` : c.status === 'resolved' ? 'unplaced' : 'in the running',
        scoreOf(s.score),
        s.prize_usd ? `won ${money(s.prize_usd)}` : '',
        `entered ${date(s.entered_at)}`,
      ].filter(Boolean);
      return `<li>
        <span class="entry-title"><a href="#/bounty/${encodeURIComponent(c.slug)}">${esc(s.title || 'Untitled entry')}</a></span>
        <span class="entry-comp">${esc(c.title ?? c.slug ?? '')}</span>
        ${c.category ? `<span class="chip">${esc(c.category)}</span>` : ''}
        <span class="entry-meta">${esc(bits.join(' · '))}</span>
      </li>`;
    })
    .join('');
  return `<h2>Entries — ${plural(list.length, 'bounty')} entered</h2><ul class="entries">${rows}</ul>`;
}

/** What the hunter has been paid, with the on-chain transfer linked. */
function payouts(p) {
  const list = p.payouts ?? [];
  if (!list.length) return '';
  const body = list
    .map(
      (pay) => `<tr>
        <td class="prize">${money(pay.amount_usd)}</td>
        <td>${pay.place != null ? `#${pay.place}` : '—'}</td>
        <td><a href="#/bounty/${encodeURIComponent(pay.competition?.slug ?? '')}">${esc(pay.competition?.title ?? pay.competition?.slug ?? '')}</a></td>
        <td>${date(pay.paid_at)}</td>
        <td>${pay.explorer_url ? `<a href="${esc(pay.explorer_url)}" rel="noopener">tx ↗</a>` : '—'}</td>
      </tr>`,
    )
    .join('');
  return `<h2>Payouts</h2>
    <div class="table-scroll"><table class="rewards payouts">
      <thead><tr><th>Amount</th><th>Place</th><th>Bounty</th><th>Paid</th><th>Transfer</th></tr></thead>
      <tbody>${body}</tbody>
    </table></div>`;
}

export async function mount(root, handle) {
  const p = await getProfile(handle);
  const r = p.record ?? {};
  const name = p.display_name || `@${p.handle}`;
  const avatar = absUrl(p.avatar?.url ?? p.image);
  root.innerHTML = `<article class="profile">
    <p class="crumbs"><a href="#/">← All bounties</a></p>
    <div class="profile-head">
      ${avatar ? `<img class="avatar" src="${esc(avatar)}" alt="" crossorigin="anonymous">` : ''}
      <div class="profile-id">
        <h1>${esc(name)}</h1>
        <p class="profile-handle">
          @${esc(p.handle)}
          ${p.house ? '<span class="chip">house</span>' : ''}${p.demo ? '<span class="chip">demo</span>' : ''}
          <span class="joined">joined ${date(p.joined_at)}</span>
        </p>
        ${p.bio ? `<p class="summary">${esc(p.bio)}</p>` : ''}
        <p class="profile-links">
          <a href="https://make.fun/u/${encodeURIComponent(p.handle)}" rel="noopener">View on make.fun</a>
          ${p.wallet?.explorer_url ? `<a href="${esc(p.wallet.explorer_url)}" rel="noopener">Wallet ↗</a>` : ''}
          ${p.github_login ? `<a href="https://github.com/${encodeURIComponent(p.github_login)}" rel="noopener">GitHub ↗</a>` : ''}
          ${p.x ? `<a href="https://x.com/${encodeURIComponent(String(p.x).replace(/^@/, ''))}" rel="noopener">X ↗</a>` : ''}
        </p>
      </div>
    </div>
    <dl class="stats">
      <div class="stat-hero"><dt>Prize won</dt><dd>${money(r.prize_usd)}</dd></div>
      <div><dt>Entered</dt><dd>${plural(r.competitions_entered ?? 0, 'bounty')}</dd></div>
      <div><dt>Placed</dt><dd>${r.competitions_placed ?? 0}</dd></div>
      <div><dt>Won</dt><dd>${r.competitions_won ?? 0}</dd></div>
      ${r.best_placement != null ? `<div><dt>Best placement</dt><dd>#${r.best_placement}</dd></div>` : ''}
      ${r.podium_finishes ? `<div><dt>Podium finishes</dt><dd>${r.podium_finishes}</dd></div>` : ''}
    </dl>
    ${solutions(p)}
    ${payouts(p)}
  </article>`;
  window.__shotReady = true;
}

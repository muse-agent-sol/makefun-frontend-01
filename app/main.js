// The router: a hash route per surface, each view a lazily loaded module, so
// the first load is this file alone. window.__shotReady is false while a route
// loads and true once its data is on screen, for screenshot scripts.
//
//   #/                              the bounty board
//   #/bounty/<slug>                 one bounty's page
//   #/bounty/<slug>/leaderboard     its leaderboard
//   #/u/<handle>                    a public profile

const app = document.getElementById('app');

let cleanup = null; // the mounted view's teardown (timers, listeners)
let sequence = 0; // only the newest route may finish rendering

const routes = [
  { pattern: /^\/$/, load: () => import('./views/board.js'), title: () => 'make.fun bounties' },
  { pattern: /^\/bounty\/([^/]+)$/, load: () => import('./views/bounty.js'), title: (slug) => `${slug} | make.fun bounties` },
  { pattern: /^\/bounty\/([^/]+)\/leaderboard$/, load: () => import('./views/leaderboard.js'), title: (slug) => `Leaderboard | ${slug}` },
  { pattern: /^\/u\/([^/]+)$/, load: () => import('./views/profile.js'), title: (handle) => `@${handle} | make.fun` },
];

/** Text made safe to put inside HTML (main.js imports nothing at first load). */
const escText = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

function showError(error) {
  app.innerHTML = `<section class="notice error">
    <h1>Something went wrong</h1>
    <p>${escText(error?.message ?? error)}</p>
    <p><a href="#/">Back to the board</a></p>
  </section>`;
  window.__shotReady = true;
}

async function render() {
  const mine = ++sequence;
  window.__shotReady = false;
  if (cleanup) {
    cleanup();
    cleanup = null;
  }
  const path = location.hash.replace(/^#/, '') || '/';
  const route = routes.find((r) => r.pattern.test(path));
  if (!route) {
    document.title = 'Not found | make.fun bounties';
    app.innerHTML = `<section class="notice">
      <h1>Page not found</h1>
      <p>No surface lives at <code>${escText(path)}</code>.</p>
      <p><a href="#/">Back to the board</a></p>
    </section>`;
    window.__shotReady = true;
    return;
  }
  const param = decodeURIComponent(path.match(route.pattern)[1] ?? '');
  document.title = route.title(param);
  if (!route.load) {
    // Reserved surface: its view module lands in the next build session.
    app.innerHTML = '<p class="loading">Loading…</p>';
    window.__shotReady = true;
    return;
  }
  app.innerHTML = '<p class="loading">Loading…</p>';
  try {
    const view = await route.load();
    if (mine !== sequence) return; // a newer route took over
    cleanup = (await view.mount(app, param)) ?? null;
    if (mine !== sequence && cleanup) {
      cleanup();
      cleanup = null;
    }
  } catch (error) {
    if (mine === sequence) showError(error);
  }
  window.scrollTo(0, 0);
}

window.addEventListener('hashchange', render);
render();

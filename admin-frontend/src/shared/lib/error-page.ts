export function renderErrorPage(): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>QuickPress Admin — Updating...</title>
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <script>
      (function() {
        if ('caches' in window) {
          caches.keys().then(function(names) {
            for (var i = 0; i < names.length; i++) caches.delete(names[i]);
          });
        }
        if (navigator.serviceWorker) {
          navigator.serviceWorker.getRegistrations().then(function(regs) {
            for (var i = 0; i < regs.length; i++) regs[i].unregister();
          });
        }
        sessionStorage.clear();
      })();
    </script>
    <style>
      body { font-family: system-ui, -apple-system, sans-serif; background: #09090b; color: #fff; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
      .card { text-align: center; padding: 2rem; max-width: 320px; }
      .spinner { width: 36px; height: 36px; border: 3px solid #10b981; border-top-color: transparent; border-radius: 50%; animation: spin 0.8s linear infinite; margin: 0 auto 1.25rem; }
      h1 { font-size: 1.1rem; font-weight: 800; margin: 0; letter-spacing: -0.02em; }
      p { color: #a1a1aa; font-size: 0.8rem; margin: 0.5rem 0 1.5rem; }
      button { background: #059669; color: #fff; border: none; padding: 0.6rem 1.2rem; font-size: 0.8rem; font-weight: 800; border-radius: 0.75rem; cursor: pointer; }
      button:hover { background: #10b981; }
      @keyframes spin { to { transform: rotate(360deg); } }
    </style>
  </head>
  <body>
    <div class="card">
      <div class="spinner"></div>
      <h1>Loading Latest QuickPress Version...</h1>
      <p>Updating static resources from CDN edge.</p>
      <button onclick="if('caches' in window){caches.keys().then(function(n){for(var i=0;i<n.length;i++)caches.delete(n[i]);});}sessionStorage.clear();window.location.href='/';">Reload App</button>
    </div>
  </body>
</html>`;
}


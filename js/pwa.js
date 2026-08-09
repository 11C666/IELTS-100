(function () {
  'use strict';
  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (refreshing) return;
      refreshing = true;
      location.reload();
    });
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('./service-worker.js', { updateViaCache: 'none' })
        .then(registration => registration.update())
        .catch(() => {
          /* The site remains fully usable if registration is blocked. */
        });
    });
  }
})();

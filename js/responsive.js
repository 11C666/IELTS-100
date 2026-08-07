(function () {
  'use strict';

  function addDayNavigation() {
    const stack = document.querySelector('.study-stack');
    const match = location.hash.match(/^#day-(\d{3})/);
    if (!stack || !match || stack.querySelector('.day-navigation')) return;
    const current = Number(match[1]);
    const nav = document.createElement('nav');
    nav.className = 'day-navigation';
    nav.setAttribute('aria-label', 'Day navigation');
    nav.innerHTML = `
      <button type="button" class="ghost" data-go-day="${current - 1}" ${current <= 1 ? 'disabled' : ''}>← Previous</button>
      <button type="button" class="ghost" data-route-topics>Topic Map</button>
      <button type="button" class="primary" data-go-day="${current + 1}" ${current >= 100 ? 'disabled' : ''}>Next →</button>`;
    stack.append(nav);
  }

  document.addEventListener('click', event => {
    const dayButton = event.target.closest('[data-go-day]');
    if (dayButton && !dayButton.disabled) {
      location.hash = `#day-${String(dayButton.dataset.goDay).padStart(3, '0')}`;
      window.scrollTo(0, 0);
      return;
    }
    if (event.target.closest('[data-route-topics]')) location.hash = '#topics';
  });

  const observer = new MutationObserver(addDayNavigation);
  observer.observe(document.getElementById('app'), { childList: true, subtree: true });
  addDayNavigation();
})();

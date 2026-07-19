document.addEventListener('DOMContentLoaded', () => {
  const toggle = document.querySelector('.menu-toggle');
  const nav = document.querySelector('.topnav');
  const demoButton = document.getElementById('demo-btn');
  const livePosts = document.getElementById('live-posts');
  const currentDate = document.getElementById('current-date');

  if (toggle && nav) {
    toggle.addEventListener('click', () => {
      document.body.classList.toggle('nav-open');
    });
  }

  if (demoButton) {
    demoButton.addEventListener('click', () => {
      document.body.classList.toggle('demo-mode');
      demoButton.textContent = document.body.classList.contains('demo-mode')
        ? 'Preview mode on'
        : 'Preview mode';
    });
  }

  if (livePosts) {
    livePosts.textContent = '12';
  }

  if (currentDate) {
    currentDate.textContent = new Date().toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }
});

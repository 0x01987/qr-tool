document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('[data-year]').forEach(el => {
    el.textContent = new Date().getFullYear();
  });
});

window.InstantQR = {
  copyText: async (text) => {
    await navigator.clipboard.writeText(text || '');
  },
  roundTo: (value, decimals = 2) => {
    if (!Number.isFinite(value)) return '';
    const factor = 10 ** decimals;
    return (Math.round(value * factor) / factor).toFixed(decimals);
  }
};

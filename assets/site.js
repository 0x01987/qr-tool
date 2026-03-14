document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('[data-year]').forEach((el) => {
    el.textContent = new Date().getFullYear();
  });
});

window.InstantQR = {
  copyText: async function (text) {
    if (!navigator.clipboard || !navigator.clipboard.writeText) {
      throw new Error('Clipboard not supported');
    }
    await navigator.clipboard.writeText(String(text || ''));
  },

  roundTo: function (value, decimals) {
    const d = Number.isInteger(decimals) ? decimals : 2;
    if (!Number.isFinite(value)) return '';
    const factor = Math.pow(10, d);
    return (Math.round(value * factor) / factor).toFixed(d);
  }
};

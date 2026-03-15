document.addEventListener('DOMContentLoaded', () => {
  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();
});

window.InstantQR = {
  copyText: async function (text) {
    const value = String(text || '');
    if (!navigator.clipboard || !navigator.clipboard.writeText) {
      throw new Error('Clipboard API not supported');
    }
    await navigator.clipboard.writeText(value);
  },

  roundTo: function (value, decimals) {
    const d = Number.isInteger(decimals) ? decimals : 2;
    if (!Number.isFinite(value)) return '';
    const factor = Math.pow(10, d);
    return (Math.round(value * factor) / factor).toFixed(d);
  },

  escapeHtml: function (str) {
    return String(str)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;');
  }
};

document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('[data-year]').forEach(el => {
    el.textContent = new Date().getFullYear();
  });

  const toolName = document.querySelector('meta[name="tool-name"]')?.content?.trim();
  const toolUrl = document.querySelector('meta[name="tool-url"]')?.content?.trim();
  const description = document.querySelector('meta[name="description"]')?.content?.trim();

  if (toolName) {
    document.querySelectorAll('[data-tool-title]').forEach(el => {
      el.textContent = toolName;
    });

    const ogTitle = document.querySelector('meta[property="og:title"]');
    const twitterTitle = document.querySelector('meta[name="twitter:title"]');
    if (ogTitle) ogTitle.setAttribute('content', `${toolName} | InstantQR`);
    if (twitterTitle) twitterTitle.setAttribute('content', `${toolName} | InstantQR`);
  }

  if (description) {
    document.querySelectorAll('[data-tool-description]').forEach(el => {
      el.textContent = description;
    });

    const ogDesc = document.querySelector('meta[property="og:description"]');
    const twitterDesc = document.querySelector('meta[name="twitter:description"]');
    if (ogDesc) ogDesc.setAttribute('content', description);
    if (twitterDesc) twitterDesc.setAttribute('content', description);
  }

  if (toolUrl) {
    const ogUrl = document.querySelector('meta[property="og:url"]');
    if (ogUrl) ogUrl.setAttribute('content', toolUrl);

    const breadcrumbScript = document.getElementById('breadcrumbSchema');
    if (breadcrumbScript && toolName) {
      try {
        const data = JSON.parse(breadcrumbScript.textContent);
        if (data.itemListElement?.length) {
          const last = data.itemListElement[data.itemListElement.length - 1];
          last.name = toolName;
          last.item = toolUrl;
          breadcrumbScript.textContent = JSON.stringify(data);
        }
      } catch (e) {}
    }
  }
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

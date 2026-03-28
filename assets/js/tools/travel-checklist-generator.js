(function () {
  'use strict';

  const tripTypeEl = document.getElementById('tripType');
  const travelStyleEl = document.getElementById('travelStyle');
  const tripLengthEl = document.getElementById('tripLength');
  const bagTypeEl = document.getElementById('bagType');
  const weatherTypeEl = document.getElementById('weatherType');
  const specialNotesEl = document.getElementById('specialNotes');
  const resultsEl = document.getElementById('checklistResults');

  const generateBtn = document.getElementById('generateChecklistBtn');
  const printBtn = document.getElementById('printChecklistBtn');
  const copyBtn = document.getElementById('copyChecklistBtn');
  const clearBtn = document.getElementById('clearChecklistBtn');

  const BASE_GROUPS = {
    documents: ['Government ID', 'Wallet', 'Payment cards', 'Travel itinerary', 'Emergency contacts'],
    clothing: ['Shirts / tops', 'Pants / shorts', 'Underwear', 'Socks', 'Sleepwear', 'Comfortable shoes'],
    toiletries: ['Toothbrush', 'Toothpaste', 'Deodorant', 'Hair brush / comb', 'Skincare basics'],
    tech: ['Phone', 'Phone charger', 'Power bank', 'Headphones'],
    health: ['Medications', 'Bandages / basic first aid', 'Hand sanitizer'],
    extras: ['Snacks', 'Water bottle', 'Reusable bag']
  };

  function unique(items) {
    return [...new Set(items)];
  }

  function buildChecklist() {
    const tripType = tripTypeEl.value;
    const style = travelStyleEl.value;
    const length = tripLengthEl.value;
    const bagType = bagTypeEl.value;
    const weather = weatherTypeEl.value;
    const specialNotes = specialNotesEl.value.trim();

    const groups = {
      documents: [...BASE_GROUPS.documents],
      clothing: [...BASE_GROUPS.clothing],
      toiletries: [...BASE_GROUPS.toiletries],
      tech: [...BASE_GROUPS.tech],
      health: [...BASE_GROUPS.health],
      extras: [...BASE_GROUPS.extras]
    };

    if (tripType === 'international') {
      groups.documents.push(
        'Passport',
        'Passport validity check',
        'Visa / entry requirement check',
        'Travel insurance details',
        'Hotel address and reservation info'
      );
      groups.tech.push('Universal power adapter');
    }

    if (style === 'business') {
      groups.clothing.push('Business outfit', 'Dress shoes', 'Belt', 'Light blazer / jacket');
      groups.tech.push('Laptop', 'Laptop charger');
      groups.documents.push('Meeting notes / confirmations');
    }

    if (style === 'family') {
      groups.extras.push('Kids essentials', 'Wipes', 'Extra snacks', 'Entertainment for children');
      groups.health.push('Child medications');
    }

    if (style === 'beach') {
      groups.clothing.push('Swimwear', 'Sandals', 'Light cover-up');
      groups.extras.push('Sunscreen', 'Beach towel', 'Sunglasses');
    }

    if (style === 'cold') {
      groups.clothing.push('Coat / jacket', 'Sweater', 'Gloves', 'Warm socks', 'Beanie');
      groups.health.push('Lip balm');
    }

    if (weather === 'hot') {
      groups.clothing.push('Lightweight clothes', 'Breathable shirts');
      groups.extras.push('Sunglasses', 'Sun hat', 'Sunscreen');
    }

    if (weather === 'cold') {
      groups.clothing.push('Thermal layers', 'Warm jacket', 'Scarf');
      groups.extras.push('Moisturizer');
    }

    if (weather === 'rain') {
      groups.clothing.push('Rain jacket');
      groups.extras.push('Umbrella', 'Water-resistant bag cover');
    }

    if (length === 'medium') {
      groups.clothing.push('Extra outfits');
      groups.toiletries.push('Travel laundry items');
    }

    if (length === 'long') {
      groups.clothing.push('More outfits', 'Laundry bag');
      groups.toiletries.push('Full toiletries kit');
      groups.tech.push('Extra charging cable');
    }

    if (bagType === 'carryon') {
      groups.extras.push('Compact packing cubes');
    } else {
      groups.extras.push('Checked bag tags');
      groups.toiletries.push('Liquids bag organization');
    }

    if (specialNotes) {
      groups.extras.push(`Special note: ${specialNotes}`);
    }

    Object.keys(groups).forEach((key) => {
      groups[key] = unique(groups[key]);
    });

    return groups;
  }

  function titleCase(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  function renderChecklist() {
    const groups = buildChecklist();
    const titles = {
      documents: 'Travel Documents',
      clothing: 'Clothing',
      toiletries: 'Toiletries',
      tech: 'Tech',
      health: 'Health',
      extras: 'Extras'
    };

    resultsEl.innerHTML = Object.keys(groups).map((key) => `
      <section class="listGroup">
        <div class="groupTitle">${titles[key] || titleCase(key)}</div>
        <div class="checklist">
          ${groups[key].map((item, index) => `
            <label class="checkItem">
              <input type="checkbox" aria-label="${item}">
              <span>${item}</span>
            </label>
          `).join('')}
        </div>
      </section>
    `).join('');
  }

  function extractChecklistText() {
    const sections = [...resultsEl.querySelectorAll('.listGroup')];
    if (!sections.length) return '';

    return sections.map((section) => {
      const title = section.querySelector('.groupTitle')?.textContent?.trim() || 'Checklist';
      const items = [...section.querySelectorAll('.checkItem span')].map((el) => `- ${el.textContent.trim()}`);
      return `${title}\n${items.join('\n')}`;
    }).join('\n\n');
  }

  generateBtn?.addEventListener('click', renderChecklist);

  printBtn?.addEventListener('click', function () {
    window.print();
  });

  copyBtn?.addEventListener('click', async function () {
    const text = extractChecklistText();
    if (!text) {
      alert('Generate a checklist first.');
      return;
    }

    try {
      await navigator.clipboard.writeText(text);
      copyBtn.textContent = 'Copied';
      setTimeout(() => {
        copyBtn.textContent = 'Copy';
      }, 1400);
    } catch (error) {
      alert('Unable to copy the checklist.');
    }
  });

  clearBtn?.addEventListener('click', function () {
    tripTypeEl.value = 'domestic';
    travelStyleEl.value = 'solo';
    tripLengthEl.value = 'short';
    bagTypeEl.value = 'carryon';
    weatherTypeEl.value = 'mild';
    specialNotesEl.value = '';
    resultsEl.innerHTML = '<div class="emptyState">Choose your trip settings and generate a customized travel checklist.</div>';
  });
})();

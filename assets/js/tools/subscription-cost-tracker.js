document.addEventListener("DOMContentLoaded", function () {
  "use strict";

  const STORAGE_KEY = "instantqr_subscription_cost_tracker_v1";

  const el = {
    form: document.getElementById("subscriptionForm"),
    editId: document.getElementById("editId"),
    serviceName: document.getElementById("serviceName"),
    price: document.getElementById("price"),
    billingCycle: document.getElementById("billingCycle"),
    category: document.getElementById("category"),
    saveBtn: document.getElementById("saveBtn"),
    resetBtn: document.getElementById("resetBtn"),
    clearAllBtn: document.getElementById("clearAllBtn"),
    exportBtn: document.getElementById("exportBtn"),
    subscriptionsList: document.getElementById("subscriptionsList"),
    subscriptionCount: document.getElementById("subscriptionCount"),
    monthlyTotal: document.getElementById("monthlyTotal"),
    yearlyTotal: document.getElementById("yearlyTotal"),
    monthlyAverage: document.getElementById("monthlyAverage"),
    yearlyEstimate: document.getElementById("yearlyEstimate"),
    insights: document.getElementById("insights"),
    presetButtons: Array.from(document.querySelectorAll("[data-preset]"))
  };

  if (!el.form) return;

  let subscriptions = load();

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.filter(isValidRecord) : [];
    } catch {
      return [];
    }
  }

  function save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(subscriptions));
  }

  function isValidRecord(item) {
    return (
      item &&
      typeof item.id === "string" &&
      typeof item.name === "string" &&
      typeof item.category === "string" &&
      typeof item.cycle === "string" &&
      typeof item.price === "number" &&
      Number.isFinite(item.price) &&
      item.price >= 0
    );
  }

  function uid() {
    return "sub_" + Math.random().toString(36).slice(2, 11) + Date.now().toString(36);
  }

  function toMonthly(price, cycle) {
    switch (cycle) {
      case "yearly":
        return price / 12;
      case "quarterly":
        return price / 3;
      case "weekly":
        return (price * 52) / 12;
      case "monthly":
      default:
        return price;
    }
  }

  function toYearly(price, cycle) {
    switch (cycle) {
      case "yearly":
        return price;
      case "quarterly":
        return price * 4;
      case "weekly":
        return price * 52;
      case "monthly":
      default:
        return price * 12;
    }
  }

  function formatCurrency(value) {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 2
    }).format(value || 0);
  }

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, function (m) {
      return {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
      }[m];
    });
  }

  function normalizeName(name) {
    return name.trim().replace(/\s+/g, " ");
  }

  function capitalize(text) {
    if (!text) return "";
    return text.charAt(0).toUpperCase() + text.slice(1);
  }

  function cycleLabel(cycle) {
    switch (cycle) {
      case "yearly":
        return "year";
      case "quarterly":
        return "quarter";
      case "weekly":
        return "week";
      case "monthly":
      default:
        return "month";
    }
  }

  function setForm(record) {
    el.editId.value = record?.id || "";
    el.serviceName.value = record?.name || "";
    el.price.value = typeof record?.price === "number" ? String(record.price) : "";
    el.billingCycle.value = record?.cycle || "monthly";
    el.category.value = record?.category || "Streaming";
    el.saveBtn.textContent = record ? "Update subscription" : "Add subscription";

    if (record) {
      const tracker = document.getElementById("tracker");
      if (tracker) {
        window.scrollTo({
          top: tracker.offsetTop - 12,
          behavior: "smooth"
        });
      }
      el.serviceName.focus();
    }
  }

  function resetForm() {
    el.form.reset();
    el.editId.value = "";
    el.billingCycle.value = "monthly";
    el.category.value = "Streaming";
    el.saveBtn.textContent = "Add subscription";
  }

  function getSortedSubs() {
    return [...subscriptions].sort(function (a, b) {
      return toMonthly(b.price, b.cycle) - toMonthly(a.price, a.cycle);
    });
  }

  function render() {
    const items = getSortedSubs();
    const count = items.length;

    const totalMonthly = items.reduce(function (sum, item) {
      return sum + toMonthly(item.price, item.cycle);
    }, 0);

    const totalYearly = items.reduce(function (sum, item) {
      return sum + toYearly(item.price, item.cycle);
    }, 0);

    const averageMonthly = count ? totalMonthly / count : 0;

    el.monthlyTotal.textContent = formatCurrency(totalMonthly);
    el.yearlyTotal.textContent = formatCurrency(totalYearly);
    el.monthlyAverage.textContent = count
      ? "Average " + formatCurrency(averageMonthly) + " per subscription"
      : "Across 0 subscriptions";
    el.yearlyEstimate.textContent = count
      ? formatCurrency(totalYearly / 12) + " monthly equivalent"
      : "Equivalent annual spend";

    el.subscriptionCount.textContent = count + " " + (count === 1 ? "item" : "items");

    renderInsights(items, totalMonthly, totalYearly);
    renderList(items);
  }

  function renderInsights(items, totalMonthly, totalYearly) {
    if (!items.length) {
      el.insights.innerHTML =
        '<div class="insight"><strong>No subscriptions yet.</strong> Add your first service to see totals, highest cost items and budget insights.</div>';
      return;
    }

    const highest = items[0];
    const highestMonthly = toMonthly(highest.price, highest.cycle);
    const topThree = items.slice(0, 3).reduce(function (sum, item) {
      return sum + toMonthly(item.price, item.cycle);
    }, 0);
    const topShare = totalMonthly > 0 ? (topThree / totalMonthly) * 100 : 0;

    const insights = [
      '<div class="insight"><strong>Highest monthly cost:</strong> ' +
        escapeHtml(highest.name) + " at " + formatCurrency(highestMonthly) + "/month.</div>",
      '<div class="insight"><strong>Yearly impact:</strong> your recurring subscriptions total about ' +
        formatCurrency(totalYearly) + " per year.</div>",
      '<div class="insight"><strong>Concentration:</strong> your top 3 subscriptions make up about ' +
        Math.round(topShare) + "% of your monthly subscription spend.</div>"
    ];

    if (totalMonthly >= 100) {
      insights.push(
        '<div class="insight"><strong>Budget alert:</strong> you are above ' +
          formatCurrency(100) +
          "/month in recurring subscriptions. Review unused or low-value services.</div>"
      );
    } else if (totalMonthly >= 50) {
      insights.push(
        '<div class="insight"><strong>Moderate subscription load:</strong> your total is currently ' +
          formatCurrency(totalMonthly) +
          "/month. A quick audit could still uncover savings.</div>"
      );
    } else {
      insights.push(
        '<div class="insight"><strong>Lean stack:</strong> your subscriptions are relatively controlled at ' +
          formatCurrency(totalMonthly) +
          "/month.</div>"
      );
    }

    el.insights.innerHTML = insights.join("");
  }

  function renderList(items) {
    if (!items.length) {
      el.subscriptionsList.innerHTML =
        '<div class="empty-state"><strong>No subscriptions tracked yet.</strong><br />Start with Netflix, HBO Max, Spotify, Prime, Disney+ or any other recurring bill. Everything is saved locally in your browser for quick future access.</div>';
      return;
    }

    el.subscriptionsList.innerHTML = items
      .map(function (item) {
        const monthly = toMonthly(item.price, item.cycle);
        const yearly = toYearly(item.price, item.cycle);

        return (
          '<article class="sub-item" data-id="' + escapeHtml(item.id) + '">' +
            "<div>" +
              '<div class="sub-top">' +
                "<div>" +
                  '<h3 class="sub-name">' + escapeHtml(item.name) + "</h3>" +
                  '<div class="sub-meta">' +
                    '<span class="pill">' + escapeHtml(capitalize(item.category)) + "</span>" +
                    '<span class="pill">' + escapeHtml(capitalize(item.cycle)) + " billing</span>" +
                    '<span class="pill">Added locally</span>' +
                  "</div>" +
                "</div>" +
              "</div>" +
              '<div class="sub-actions">' +
                '<button type="button" class="icon-btn" data-action="edit" data-id="' + escapeHtml(item.id) + '">Edit</button>' +
                '<button type="button" class="icon-btn" data-action="delete" data-id="' + escapeHtml(item.id) + '">Delete</button>' +
              "</div>" +
            "</div>" +
            '<div class="sub-prices">' +
              '<div class="main">' + formatCurrency(item.price) + " / " + escapeHtml(cycleLabel(item.cycle)) + "</div>" +
              '<div class="minor">≈ ' + formatCurrency(monthly) + "/month</div>" +
              '<div class="minor">≈ ' + formatCurrency(yearly) + "/year</div>" +
            "</div>" +
          "</article>"
        );
      })
      .join("");
  }

  function addOrUpdateSubscription(evt) {
    evt.preventDefault();

    const name = normalizeName(el.serviceName.value);
    const price = parseFloat(el.price.value);
    const cycle = el.billingCycle.value;
    const category = el.category.value;

    if (!name) {
      el.serviceName.focus();
      return;
    }

    if (!Number.isFinite(price) || price < 0) {
      el.price.focus();
      return;
    }

    const record = {
      id: el.editId.value || uid(),
      name: name,
      price: Number(price.toFixed(2)),
      cycle: cycle,
      category: category
    };

    const editIndex = subscriptions.findIndex(function (item) {
      return item.id === record.id;
    });

    if (editIndex >= 0) {
      subscriptions[editIndex] = record;
    } else {
      subscriptions.push(record);
    }

    save();
    render();
    resetForm();
  }

  function editSubscription(id) {
    const found = subscriptions.find(function (item) {
      return item.id === id;
    });
    if (!found) return;
    setForm(found);
  }

  function deleteSubscription(id) {
    const found = subscriptions.find(function (item) {
      return item.id === id;
    });
    if (!found) return;

    const ok = confirm('Delete "' + found.name + '" from your tracker?');
    if (!ok) return;

    subscriptions = subscriptions.filter(function (item) {
      return item.id !== id;
    });

    save();
    render();

    if (el.editId.value === id) {
      resetForm();
    }
  }

  function clearAll() {
    if (!subscriptions.length) return;

    const ok = confirm("Clear all saved subscriptions from this browser?");
    if (!ok) return;

    subscriptions = [];
    save();
    render();
    resetForm();
  }

  function exportJson() {
    const data = {
      exportedAt: new Date().toISOString(),
      itemCount: subscriptions.length,
      totals: {
        monthly: Number(
          subscriptions.reduce(function (sum, item) {
            return sum + toMonthly(item.price, item.cycle);
          }, 0).toFixed(2)
        ),
        yearly: Number(
          subscriptions.reduce(function (sum, item) {
            return sum + toYearly(item.price, item.cycle);
          }, 0).toFixed(2)
        )
      },
      subscriptions: getSortedSubs()
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json"
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "subscription-cost-tracker-export.json";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  el.form.addEventListener("submit", addOrUpdateSubscription);
  el.resetBtn.addEventListener("click", resetForm);
  el.clearAllBtn.addEventListener("click", clearAll);
  el.exportBtn.addEventListener("click", exportJson);

  el.subscriptionsList.addEventListener("click", function (event) {
    const btn = event.target.closest("[data-action]");
    if (!btn) return;

    const action = btn.getAttribute("data-action");
    const id = btn.getAttribute("data-id");
    if (!id) return;

    if (action === "edit") editSubscription(id);
    if (action === "delete") deleteSubscription(id);
  });

  el.presetButtons.forEach(function (btn) {
    btn.addEventListener("click", function () {
      try {
        const preset = JSON.parse(btn.getAttribute("data-preset"));
        setForm({
          id: "",
          name: preset.name || "",
          price: parseFloat(preset.price || "0"),
          cycle: preset.cycle || "monthly",
          category: preset.category || "Other"
        });
      } catch (err) {
        console.error("Preset parse error:", err);
      }
    });
  });

  render();
});
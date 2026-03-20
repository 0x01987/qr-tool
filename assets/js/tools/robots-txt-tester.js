document.addEventListener("DOMContentLoaded", function () {
  "use strict";

  const els = {
    userAgent: document.getElementById("userAgent"),
    customAgentWrap: document.getElementById("customAgentWrap"),
    customAgent: document.getElementById("customAgent"),
    testUrl: document.getElementById("testUrl"),
    robotsInput: document.getElementById("robotsInput"),
    lineCount: document.getElementById("lineCount"),
    testBtn: document.getElementById("testBtn"),
    sampleBtn: document.getElementById("sampleBtn"),
    clearBtn: document.getElementById("clearBtn"),
    activeAgent: document.getElementById("activeAgent"),
    decisionText: document.getElementById("decisionText"),
    decisionPill: document.getElementById("decisionPill"),
    testedPath: document.getElementById("testedPath"),
    winningRule: document.getElementById("winningRule"),
    matchedGroup: document.getElementById("matchedGroup"),
    ruleCount: document.getElementById("ruleCount"),
    allowCount: document.getElementById("allowCount"),
    disallowCount: document.getElementById("disallowCount"),
    rulesList: document.getElementById("rulesList"),
    sitemapList: document.getElementById("sitemapList"),
    statusBox: document.getElementById("statusBox")
  };

  if (!els.userAgent || !els.robotsInput || !els.testBtn) {
    return;
  }

  const SAMPLE = `# Example robots.txt
User-agent: *
Disallow: /admin/
Disallow: /private/
Allow: /private/help/
Allow: /images/public/
Sitemap: https://example.com/sitemap.xml

User-agent: Googlebot
Allow: /private/google-access/
Disallow: /tmp/
`;

  const quickFillButtons = document.querySelectorAll("[data-fill]");

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, function (m) {
      return ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
      })[m];
    });
  }

  function updateLineCount() {
    const value = els.robotsInput.value || "";
    const lines = value === "" ? 0 : value.split(/\r?\n/).length;
    els.lineCount.textContent = String(lines);
  }

  function getSelectedAgent() {
    const selected = els.userAgent.value;
    if (selected === "__custom__") {
      const custom = (els.customAgent.value || "").trim();
      return custom || "*";
    }
    return selected || "*";
  }

  function toggleCustomAgent() {
    const show = els.userAgent.value === "__custom__";
    if (els.customAgentWrap) {
      els.customAgentWrap.hidden = !show;
    }
    if (show && els.customAgent) {
      els.customAgent.focus();
    }
    updateAgentLabel();
  }

  function updateAgentLabel() {
    if (els.activeAgent) {
      els.activeAgent.textContent = "Agent: " + getSelectedAgent();
    }
  }

  function normalizeTestPath(input) {
    const raw = (input || "").trim();
    if (!raw) return "/";

    try {
      if (/^https?:\/\//i.test(raw)) {
        const url = new URL(raw);
        return (url.pathname || "/") + (url.search || "");
      }
    } catch (e) {
      // keep raw value
    }

    if (!raw.startsWith("/")) {
      return "/" + raw;
    }
    return raw;
  }

  function stripComment(line) {
    const hashIndex = line.indexOf("#");
    if (hashIndex === -1) return line;
    return line.slice(0, hashIndex);
  }

  function parseRobots(content) {
    const lines = String(content || "").split(/\r?\n/);
    const groups = [];
    const sitemaps = [];
    let currentGroup = null;

    function ensureGroup() {
      if (!currentGroup) {
        currentGroup = {
          userAgents: [],
          rules: []
        };
        groups.push(currentGroup);
      }
    }

    for (let i = 0; i < lines.length; i++) {
      let line = stripComment(lines[i]).trim();
      if (!line) continue;

      const colonIndex = line.indexOf(":");
      if (colonIndex === -1) continue;

      const field = line.slice(0, colonIndex).trim().toLowerCase();
      const value = line.slice(colonIndex + 1).trim();

      if (field === "user-agent") {
        const prevHasRules = currentGroup && currentGroup.rules.length > 0;
        if (!currentGroup || prevHasRules) {
          currentGroup = {
            userAgents: [],
            rules: []
          };
          groups.push(currentGroup);
        }
        currentGroup.userAgents.push(value);
      } else if (field === "allow" || field === "disallow") {
        ensureGroup();
        currentGroup.rules.push({
          type: field,
          path: value,
          line: i + 1
        });
      } else if (field === "sitemap") {
        sitemaps.push(value);
      }
    }

    return { groups, sitemaps };
  }

  function agentMatches(groupAgent, selectedAgent) {
    const ga = String(groupAgent || "").trim().toLowerCase();
    const sa = String(selectedAgent || "").trim().toLowerCase();

    if (!ga) return false;
    if (ga === "*") return true;

    return sa === ga || sa.includes(ga);
  }

  function groupSpecificity(group, selectedAgent) {
    let best = -1;

    for (const ua of group.userAgents) {
      const groupUa = String(ua || "").trim().toLowerCase();
      if (!groupUa) continue;

      if (groupUa === "*") {
        best = Math.max(best, 1);
      } else if (agentMatches(groupUa, selectedAgent)) {
        best = Math.max(best, groupUa.length + 10);
      }
    }

    return best;
  }

  function chooseGroup(groups, selectedAgent) {
    let bestGroup = null;
    let bestScore = -1;

    for (const group of groups) {
      const score = groupSpecificity(group, selectedAgent);
      if (score > bestScore) {
        bestScore = score;
        bestGroup = group;
      }
    }

    return bestGroup;
  }

  function escapeRegex(str) {
    return String(str).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  function rulePatternToRegex(pathRule) {
    const original = String(pathRule || "");
    const anchoredToEnd = original.endsWith("$");
    const raw = anchoredToEnd ? original.slice(0, -1) : original;

    let pattern = escapeRegex(raw).replace(/\\\*/g, ".*");
    pattern = "^" + pattern + (anchoredToEnd ? "$" : "");
    return new RegExp(pattern);
  }

  function matchRule(rulePath, testPath) {
    const rule = String(rulePath || "");

    if (rule === "") {
      return {
        matched: false,
        length: 0
      };
    }

    try {
      const regex = rulePatternToRegex(rule);
      const matched = regex.test(testPath);

      return {
        matched: matched,
        length: matched ? rule.replace(/\*/g, "").replace(/\$/g, "").length : 0
      };
    } catch (e) {
      return {
        matched: false,
        length: 0
      };
    }
  }

  function evaluateRules(group, testPath) {
    const rules = Array.isArray(group && group.rules) ? group.rules : [];
    const matchedRules = [];

    for (const rule of rules) {
      const result = matchRule(rule.path, testPath);
      if (result.matched) {
        matchedRules.push({
          type: rule.type,
          path: rule.path,
          line: rule.line,
          matchLength: result.length
        });
      }
    }

    matchedRules.sort(function (a, b) {
      if (b.matchLength !== a.matchLength) return b.matchLength - a.matchLength;
      if (a.type !== b.type) return a.type === "allow" ? -1 : 1;
      return a.line - b.line;
    });

    let decision = "allow";
    let winner = null;

    if (matchedRules.length > 0) {
      winner = matchedRules[0];
      decision = winner.type === "disallow" ? "disallow" : "allow";
    }

    return {
      decision: decision,
      winner: winner,
      matchedRules: matchedRules
    };
  }

  function renderRules(matchedRules) {
    if (!els.rulesList) return;

    if (!matchedRules || !matchedRules.length) {
      els.rulesList.innerHTML = '<div class="empty-state">No matching rules found for this path. Default behavior is treated as allowed.</div>';
      return;
    }

    els.rulesList.innerHTML = matchedRules.map(function (rule) {
      const badgeClass = rule.type === "allow" ? "rule-allow" : "rule-disallow";
      const badgeLabel = rule.type === "allow" ? "Allow" : "Disallow";

      return `
        <div class="rule-item">
          <div class="rule-head">
            <span class="rule-badge ${badgeClass}">${badgeLabel}</span>
            <span class="rule-meta">Line ${rule.line} • Match length ${rule.matchLength}</span>
          </div>
          <div class="rule-path mono">${escapeHtml(rule.path || "(empty)")}</div>
        </div>
      `;
    }).join("");
  }

  function renderSitemaps(sitemaps) {
    if (!els.sitemapList) return;

    if (!sitemaps || !sitemaps.length) {
      els.sitemapList.innerHTML = '<div class="empty-state">No sitemap directives found in this robots.txt.</div>';
      return;
    }

    els.sitemapList.innerHTML = sitemaps.map(function (url) {
      return `
        <div class="sitemap-item">
          <div class="rule-path mono">${escapeHtml(url)}</div>
        </div>
      `;
    }).join("");
  }

  function setDecisionUI(decision, winner, testPath) {
    if (els.testedPath) {
      els.testedPath.textContent = testPath || "—";
    }

    if (!winner) {
      if (els.decisionText) els.decisionText.textContent = "Allowed";
      if (els.decisionPill) {
        els.decisionPill.className = "pill-result pill-neutral";
        els.decisionPill.textContent = "No matching rule";
      }
      if (els.winningRule) {
        els.winningRule.textContent = "None";
      }
      return;
    }

    if (els.winningRule) {
      els.winningRule.textContent = winner.type + ": " + (winner.path || "(empty)");
    }

    if (decision === "disallow") {
      if (els.decisionText) els.decisionText.textContent = "Blocked";
      if (els.decisionPill) {
        els.decisionPill.className = "pill-result pill-disallow";
        els.decisionPill.textContent = "Disallow wins";
      }
    } else {
      if (els.decisionText) els.decisionText.textContent = "Allowed";
      if (els.decisionPill) {
        els.decisionPill.className = "pill-result pill-allow";
        els.decisionPill.textContent = "Allow wins";
      }
    }
  }

  function runTest() {
    const robots = (els.robotsInput.value || "").trim();
    const selectedAgent = getSelectedAgent();
    const testPath = normalizeTestPath(els.testUrl.value);

    updateAgentLabel();

    if (!robots) {
      if (els.statusBox) {
        els.statusBox.innerHTML = "<strong>Missing robots.txt.</strong><br>Paste robots.txt content first.";
      }
      if (els.decisionText) els.decisionText.textContent = "Missing Input";
      if (els.decisionPill) {
        els.decisionPill.className = "pill-result pill-neutral";
        els.decisionPill.textContent = "Paste robots.txt";
      }
      if (els.testedPath) els.testedPath.textContent = testPath || "—";
      if (els.winningRule) els.winningRule.textContent = "—";
      if (els.matchedGroup) els.matchedGroup.textContent = "—";
      if (els.ruleCount) els.ruleCount.textContent = "0";
      if (els.allowCount) els.allowCount.textContent = "0";
      if (els.disallowCount) els.disallowCount.textContent = "0";
      renderRules([]);
      renderSitemaps([]);
      return;
    }

    const parsed = parseRobots(robots);
    const group = chooseGroup(parsed.groups, selectedAgent);

    renderSitemaps(parsed.sitemaps);

    if (!group) {
      if (els.statusBox) {
        els.statusBox.innerHTML = "<strong>No valid user-agent groups found.</strong><br>Please check your robots.txt formatting.";
      }
      if (els.decisionText) els.decisionText.textContent = "No Group";
      if (els.decisionPill) {
        els.decisionPill.className = "pill-result pill-neutral";
        els.decisionPill.textContent = "Parsing issue";
      }
      if (els.matchedGroup) els.matchedGroup.textContent = "—";
      if (els.ruleCount) els.ruleCount.textContent = "0";
      if (els.allowCount) els.allowCount.textContent = "0";
      if (els.disallowCount) els.disallowCount.textContent = "0";
      renderRules([]);
      return;
    }

    const evalResult = evaluateRules(group, testPath);
    const allowCount = group.rules.filter(function (r) { return r.type === "allow"; }).length;
    const disallowCount = group.rules.filter(function (r) { return r.type === "disallow"; }).length;
    const matchedAgents = (group.userAgents && group.userAgents.length) ? group.userAgents.join(", ") : "*";

    if (els.matchedGroup) els.matchedGroup.textContent = matchedAgents;
    if (els.ruleCount) els.ruleCount.textContent = String(group.rules.length);
    if (els.allowCount) els.allowCount.textContent = String(allowCount);
    if (els.disallowCount) els.disallowCount.textContent = String(disallowCount);

    setDecisionUI(evalResult.decision, evalResult.winner, testPath);
    renderRules(evalResult.matchedRules);

    if (els.statusBox) {
      if (evalResult.winner) {
        els.statusBox.innerHTML =
          `<strong>Test complete.</strong><br>` +
          `The path <span class="mono">${escapeHtml(testPath)}</span> was evaluated against the group ` +
          `<span class="mono">${escapeHtml(matchedAgents)}</span>. ` +
          `Winning rule: <span class="mono">${escapeHtml(evalResult.winner.type + ": " + evalResult.winner.path)}</span>.`;
      } else {
        els.statusBox.innerHTML =
          `<strong>Test complete.</strong><br>` +
          `No matching Allow or Disallow rule was found for ` +
          `<span class="mono">${escapeHtml(testPath)}</span> in group ` +
          `<span class="mono">${escapeHtml(matchedAgents)}</span>. Default behavior is treated as allowed.`;
      }
    }
  }

  function loadSample() {
    els.robotsInput.value = SAMPLE;
    els.testUrl.value = "/private/help/";
    els.userAgent.value = "Googlebot";
    if (els.customAgent) {
      els.customAgent.value = "";
    }
    toggleCustomAgent();
    updateLineCount();
    runTest();
  }

  function clearAll() {
    els.robotsInput.value = "";
    els.testUrl.value = "";
    els.userAgent.value = "Googlebot";
    if (els.customAgent) {
      els.customAgent.value = "";
    }

    toggleCustomAgent();
    updateLineCount();

    if (els.activeAgent) els.activeAgent.textContent = "Agent: Googlebot";
    if (els.decisionText) els.decisionText.textContent = "Ready";
    if (els.decisionPill) {
      els.decisionPill.className = "pill-result pill-neutral";
      els.decisionPill.textContent = "No test yet";
    }
    if (els.testedPath) els.testedPath.textContent = "—";
    if (els.winningRule) els.winningRule.textContent = "—";
    if (els.matchedGroup) els.matchedGroup.textContent = "—";
    if (els.ruleCount) els.ruleCount.textContent = "0";
    if (els.allowCount) els.allowCount.textContent = "0";
    if (els.disallowCount) els.disallowCount.textContent = "0";
    if (els.rulesList) {
      els.rulesList.innerHTML = '<div class="empty-state">Run a test to see matching Allow and Disallow rules.</div>';
    }
    if (els.sitemapList) {
      els.sitemapList.innerHTML = '<div class="empty-state">No sitemaps parsed yet.</div>';
    }
    if (els.statusBox) {
      els.statusBox.innerHTML = "<strong>Ready.</strong><br>Paste a robots.txt file, enter a path, then click <b>Test Rules</b>.";
    }
  }

  els.userAgent.addEventListener("change", toggleCustomAgent);

  if (els.customAgent) {
    els.customAgent.addEventListener("input", updateAgentLabel);
  }

  els.robotsInput.addEventListener("input", updateLineCount);
  els.testBtn.addEventListener("click", runTest);

  if (els.sampleBtn) {
    els.sampleBtn.addEventListener("click", loadSample);
  }

  if (els.clearBtn) {
    els.clearBtn.addEventListener("click", clearAll);
  }

  quickFillButtons.forEach(function (btn) {
    btn.addEventListener("click", function () {
      const value = btn.getAttribute("data-fill") || "/";
      els.testUrl.value = value;
      els.testUrl.focus();
    });
  });

  updateLineCount();
  toggleCustomAgent();
});

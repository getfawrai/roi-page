(function () {
  "use strict";

  /* ---------------- Access gate ---------------- */
  var ACCESS_CODE = "getfawrai";
  var gate = document.getElementById("roi-gate");
  var pwInput = document.getElementById("gate-pw");
  var pwError = document.getElementById("gate-error");
  var gateSubmit = document.getElementById("gate-submit");

  function tryUnlock() {
    if (pwInput.value === ACCESS_CODE) {
      gate.classList.add("unlocked");
      setTimeout(function () { gate.style.display = "none"; }, 320);
    } else {
      pwError.style.display = "block";
      pwInput.classList.remove("shake");
      void pwInput.offsetWidth;
      pwInput.classList.add("shake");
    }
  }

  gateSubmit.addEventListener("click", tryUnlock);
  pwInput.addEventListener("keydown", function (e) {
    if (e.key === "Enter") tryUnlock();
  });
  pwInput.addEventListener("input", function () {
    pwError.style.display = "none";
  });

  /* ---------------- Calculator ---------------- */
  var state = { leads: 120, atv: 2000, tier: "own", breakdownOpen: false };

  var FEES = {
    convert: { small: 3000, mid: 4500, large: 7000 },
    own:     { small: 4500, mid: 6500, large: 9500 }
  };
  function feeBand(leads) {
    if (leads <= 100) return "small";
    if (leads <= 200) return "mid";
    return "large";
  }
  function feeFor(tier, leads) {
    return FEES[tier][feeBand(leads)];
  }

  var els = {
    leadsSlider: document.getElementById("leadsSlider"),
    atvSlider: document.getElementById("atvSlider"),
    leadsValue: document.getElementById("leadsValue"),
    leadsLabel: document.getElementById("leadsLabel"),
    atvValue: document.getElementById("atvValue"),
    tierConvert: document.getElementById("tierConvert"),
    tierOwn: document.getElementById("tierOwn"),
    tierConvertPrice: document.getElementById("tierConvertPrice"),
    tierOwnPrice: document.getElementById("tierOwnPrice"),
    netGain: document.getElementById("netGain"),
    breakeven: document.getElementById("breakeven"),
    beforeBookings: document.getElementById("beforeBookings"),
    afterBookings: document.getElementById("afterBookings"),
    beforeRevenue: document.getElementById("beforeRevenue"),
    afterRevenue: document.getElementById("afterRevenue"),
    bdConversion: document.getElementById("bdConversion"),
    bdGhost: document.getElementById("bdGhost"),
    bdNoshow: document.getElementById("bdNoshow"),
    bdRetention: document.getElementById("bdRetention"),
    bdReputation: document.getElementById("bdReputation"),
    ownRows: document.getElementById("ownRows"),
    ownNote: document.getElementById("ownNote"),
    breakdownToggle: document.getElementById("breakdownToggle"),
    breakdownPanel: document.getElementById("breakdownPanel"),
    breakdownLabel: document.getElementById("breakdownLabel")
  };

  var leadsLabels = { 30: "small clinic", 100: "growing", 200: "established", 400: "high volume", 600: "enterprise" };

  function fmt(n) {
    return Math.round(n).toLocaleString("en-AE");
  }

  function calc() {
    var leads = state.leads, atv = state.atv, tier = state.tier;
    var fee = feeFor(tier, leads);
    var convBefore = Math.round(leads * 0.15);
    var convAfter = Math.round(leads * 0.28);
    var ghost = Math.round(leads * 0.15 * 0.30);
    var noshow = Math.round(convAfter * 0.08);
    var retention = tier === "own" ? Math.round(leads * 0.06) : 0;
    var reputation = tier === "own" ? Math.round(leads * 0.03) : 0;
    var totalAfter = convAfter + ghost + noshow + retention + reputation;
    var revBefore = convBefore * atv;
    var revAfter = totalAfter * atv;
    var net = revAfter - revBefore - fee;
    var breakeven = Math.ceil(fee / atv);
    return {
      convBefore: convBefore, convAfter: convAfter, ghost: ghost, noshow: noshow,
      retention: retention, reputation: reputation, totalAfter: totalAfter,
      revBefore: revBefore, revAfter: revAfter, net: net, breakeven: breakeven
    };
  }

  var animTimers = {};
  function animateNumber(el, target) {
    if (!el) return;
    var current = parseInt((el.textContent || "0").replace(/,/g, ""), 10);
    if (isNaN(current)) current = 0;
    if (current === target) return;
    if (animTimers[el.id]) cancelAnimationFrame(animTimers[el.id]);
    var start = performance.now();
    var duration = 260;
    function step(now) {
      var t = Math.min(1, (now - start) / duration);
      var eased = 1 - Math.pow(1 - t, 3);
      var val = Math.round(current + (target - current) * eased);
      el.textContent = fmt(val);
      if (t < 1) {
        animTimers[el.id] = requestAnimationFrame(step);
      } else {
        el.textContent = fmt(target);
        el.classList.add("pulse");
        setTimeout(function () { el.classList.remove("pulse"); }, 320);
      }
    }
    animTimers[el.id] = requestAnimationFrame(step);
  }

  function render() {
    var leads = state.leads, atv = state.atv, tier = state.tier;
    var c = calc();
    var isOwn = tier === "own";

    els.leadsValue.textContent = leads;
    els.atvValue.textContent = fmt(atv);

    var closest = Object.keys(leadsLabels).reduce(function (a, b) {
      return Math.abs(b - leads) < Math.abs(a - leads) ? b : a;
    });
    els.leadsLabel.textContent = leadsLabels[closest] || "";

    els.tierConvert.classList.toggle("active", !isOwn);
    els.tierOwn.classList.toggle("active", isOwn);
    animateNumber(els.tierConvertPrice, feeFor("convert", leads));
    animateNumber(els.tierOwnPrice, feeFor("own", leads));

    animateNumber(els.netGain, Math.max(0, c.net));
    els.breakeven.textContent = c.breakeven;
    animateNumber(els.beforeBookings, c.convBefore);
    animateNumber(els.afterBookings, c.totalAfter);
    animateNumber(els.beforeRevenue, c.revBefore);
    animateNumber(els.afterRevenue, c.revAfter);
    animateNumber(els.bdConversion, c.convAfter - c.convBefore);
    animateNumber(els.bdGhost, c.ghost);
    animateNumber(els.bdNoshow, c.noshow);
    animateNumber(els.bdRetention, c.retention);
    animateNumber(els.bdReputation, c.reputation);

    if (isOwn) {
      els.ownRows.hidden = false;
      requestAnimationFrame(function () { els.ownRows.classList.add("open"); });
      els.ownNote.hidden = false;
      requestAnimationFrame(function () { els.ownNote.classList.add("show"); });
    } else {
      els.ownRows.classList.remove("open");
      els.ownNote.classList.remove("show");
      setTimeout(function () {
        if (state.tier !== "own") { els.ownRows.hidden = true; els.ownNote.hidden = true; }
      }, 380);
    }
  }

  els.leadsSlider.addEventListener("input", function (e) { state.leads = +e.target.value; render(); });
  els.atvSlider.addEventListener("input", function (e) { state.atv = +e.target.value; render(); });
  els.tierConvert.addEventListener("click", function () { state.tier = "convert"; render(); });
  els.tierOwn.addEventListener("click", function () { state.tier = "own"; render(); });

  els.breakdownToggle.addEventListener("click", function () {
    state.breakdownOpen = !state.breakdownOpen;
    els.breakdownPanel.classList.toggle("open", state.breakdownOpen);
    els.breakdownLabel.textContent = state.breakdownOpen ? "Hide" : "Show";
  });

  render();
})();

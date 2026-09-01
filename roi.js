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

  /* ---------------- Pricing engine ---------------- */
  var P = {
    own:     { setup: [3000, 3500, 4500, 6000], monthly: [3500, 5000, 7000, 9500] },
    convert: { setup: [2000, 2500, 3500, 4500], monthly: [2500, 3500, 5000, 6500] }
  };
  var TIER_LABELS = ["Tier 1", "Tier 2", "Tier 3", "Tier 4"];
  var TIER_RANGES = ["0–200", "201–400", "401–600", "601+"];

  function getTier(leads) {
    return leads <= 200 ? 0 : leads <= 400 ? 1 : leads <= 600 ? 2 : 3;
  }

  var HEALTHY_LOW = 0.25;
  var HEALTHY_HIGH = 0.40;

  function calc(leads, booked, price, product) {
    var ti = getTier(leads);

    var gap = Math.max(0, leads - booked);
    var s1bk = Math.round(gap * 0.20);
    var s1rev = s1bk * price;

    var noShows = Math.round(booked * 0.20);
    var s2bk = Math.round(noShows * 0.35);
    var s2rev = s2bk * price;

    var attended = Math.max(0, booked - noShows);
    var s3bk = Math.round(attended * 0.10);
    var s3rev = s3bk * price;

    var revWithout = booked * price;
    var recoveredBk = product === "own" ? s1bk + s2bk + s3bk : s1bk + s2bk;
    var recoveredRev = product === "own" ? s1rev + s2rev + s3rev : s1rev + s2rev;
    var revWith = revWithout + recoveredRev;

    var mo = P[product].monthly[ti];
    var setup = P[product].setup[ti];
    var roi = mo > 0 && recoveredRev > 0 ? Math.round(recoveredRev / mo) : 0;

    var paybackBookings = price > 0 ? Math.ceil(mo / price) : 0;
    var surplusBookings = recoveredBk - paybackBookings;

    return {
      tier: ti,
      gap: gap, s1bk: s1bk, s1rev: s1rev,
      noShows: noShows, s2bk: s2bk, s2rev: s2rev,
      attended: attended, s3bk: s3bk, s3rev: s3rev,
      revWithout: revWithout, recoveredBk: recoveredBk, recoveredRev: recoveredRev, revWith: revWith,
      mo: mo, setup: setup, roi: roi,
      paybackBookings: paybackBookings, surplusBookings: surplusBookings
    };
  }

  /* ---------------- State + DOM ---------------- */
  var state = { leads: 200, booked: 60, price: 1500, tier: "own", breakdownOpen: false, convertOpen: false };

  var els = {
    leadsSlider: document.getElementById("leadsSlider"),
    bookedSlider: document.getElementById("bookedSlider"),
    priceSlider: document.getElementById("priceSlider"),
    leadsValue: document.getElementById("leadsValue"),
    bookedValue: document.getElementById("bookedValue"),
    priceValue: document.getElementById("priceValue"),
    tierBadge: document.getElementById("tierBadge"),
    healthyBadge: document.getElementById("healthyBadge"),
    healthyRate: document.getElementById("healthyRate"),
    healthyLabel: document.getElementById("healthyLabel"),
    tierConvert: document.getElementById("tierConvert"),
    tierOwn: document.getElementById("tierOwn"),
    tierConvertPrice: document.getElementById("tierConvertPrice"),
    tierOwnPrice: document.getElementById("tierOwnPrice"),
    tierConvertSetup: document.getElementById("tierConvertSetup"),
    tierOwnSetup: document.getElementById("tierOwnSetup"),
    convertToggle: document.getElementById("convertToggle"),
    convertPanel: document.getElementById("convertPanel"),
    netGain: document.getElementById("netGain"),
    breakeven: document.getElementById("breakeven"),
    surplusNote: document.getElementById("surplusNote"),
    roiMultiple: document.getElementById("roiMultiple"),
    beforeBookings: document.getElementById("beforeBookings"),
    afterBookings: document.getElementById("afterBookings"),
    beforeRevenue: document.getElementById("beforeRevenue"),
    afterRevenue: document.getElementById("afterRevenue"),
    bdGap: document.getElementById("bdGap"),
    bdNoshow: document.getElementById("bdNoshow"),
    bdRetention: document.getElementById("bdRetention"),
    ownRows: document.getElementById("ownRows"),
    ownNote: document.getElementById("ownNote"),
    feeSetup: document.getElementById("feeSetup"),
    feeMonthly: document.getElementById("feeMonthly"),
    breakdownToggle: document.getElementById("breakdownToggle"),
    breakdownPanel: document.getElementById("breakdownPanel"),
    breakdownLabel: document.getElementById("breakdownLabel")
  };

  function fmt(n) {
    return Math.round(n).toLocaleString("en-AE");
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
    var leads = state.leads, booked = state.booked, price = state.price, tier = state.tier;
    var isOwn = tier === "own";
    var c = calc(leads, booked, price, tier);

    els.leadsValue.textContent = leads;
    els.bookedValue.textContent = booked;
    els.priceValue.textContent = fmt(price);

    els.tierBadge.textContent = TIER_LABELS[c.tier] + " · " + TIER_RANGES[c.tier];

    var rate = leads > 0 ? booked / leads : 0;
    els.healthyRate.textContent = Math.round(rate * 100) + "%";
    els.healthyBadge.classList.remove("low", "healthy", "strong");
    if (leads === 0) {
      els.healthyLabel.textContent = "add leads to see your booking rate";
      els.healthyBadge.classList.add("healthy");
    } else if (rate < HEALTHY_LOW) {
      els.healthyLabel.textContent = "below the healthy range — large recovery opportunity";
      els.healthyBadge.classList.add("low");
    } else if (rate <= HEALTHY_HIGH) {
      els.healthyLabel.textContent = "within the healthy range";
      els.healthyBadge.classList.add("healthy");
    } else {
      els.healthyLabel.textContent = "a strong performer already — FawrAI still protects the experience for everyone who books, not just the leads you'd otherwise lose";
      els.healthyBadge.classList.add("strong");
    }

    var convertAtTier = calc(leads, booked, price, "convert");
    var ownAtTier = calc(leads, booked, price, "own");
    animateNumber(els.tierConvertPrice, convertAtTier.mo);
    animateNumber(els.tierOwnPrice, ownAtTier.mo);
    animateNumber(els.tierConvertSetup, convertAtTier.setup);
    animateNumber(els.tierOwnSetup, ownAtTier.setup);
    els.tierConvert.classList.toggle("active", !isOwn);
    els.tierOwn.classList.toggle("active", isOwn);

    var netGain = c.recoveredRev - c.mo;

    animateNumber(els.netGain, Math.max(0, netGain));
    els.breakeven.textContent = c.paybackBookings;
    els.surplusNote.textContent = c.surplusBookings >= 0
      ? " — you're recovering " + c.surplusBookings + " more."
      : ".";
    els.roiMultiple.textContent = c.roi + "×";

    animateNumber(els.beforeBookings, booked);
    animateNumber(els.afterBookings, booked + c.recoveredBk);
    animateNumber(els.beforeRevenue, c.revWithout);
    animateNumber(els.afterRevenue, c.revWith);

    animateNumber(els.bdGap, c.s1bk);
    animateNumber(els.bdNoshow, c.s2bk);
    animateNumber(els.bdRetention, c.s3bk);

    animateNumber(els.feeSetup, c.setup);
    animateNumber(els.feeMonthly, c.mo);

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

  function setConvertOpen(open) {
    state.convertOpen = open;
    els.convertPanel.classList.toggle("open", open);
    els.convertToggle.classList.toggle("open", open);
  }

  els.leadsSlider.addEventListener("input", function (e) { state.leads = +e.target.value; render(); });
  els.bookedSlider.addEventListener("input", function (e) { state.booked = +e.target.value; render(); });
  els.priceSlider.addEventListener("input", function (e) { state.price = +e.target.value; render(); });
  els.tierConvert.addEventListener("click", function () { state.tier = "convert"; render(); });
  els.tierOwn.addEventListener("click", function () { state.tier = "own"; render(); setConvertOpen(false); });
  els.convertToggle.addEventListener("click", function () { setConvertOpen(!state.convertOpen); });

  els.breakdownToggle.addEventListener("click", function () {
    state.breakdownOpen = !state.breakdownOpen;
    els.breakdownPanel.classList.toggle("open", state.breakdownOpen);
    els.breakdownLabel.textContent = state.breakdownOpen ? "Hide" : "Show";
  });

  render();
})();

// script.js
// Currency conversion and budget longevity utilities for Vietnam (VND)
// Provides:
//  - fetchExchangeRate(fromCurrency) -> number (VND per unit)
//  - convertToVND(amount, rate)
//  - calculateLongevity(budgetVND, monthlyExpenseVND)
//  - formatVND(amount)
// Also exposes a small UI wiring helper `attachBudgetUI(opts)` that will
// bind to common element IDs if present (optional).

const BudgetUtils = (function () {
  // Default base for live rates (uses exchangerate.host)
  const API_BASE = 'https://api.exchangerate.host/latest';

  async function fetchExchangeRate(fromCurrency = 'USD') {
    // Returns the exchange rate: 1 fromCurrency == X VND
    try {
      const url = `${API_BASE}?base=${encodeURIComponent(fromCurrency)}&symbols=VND`;
      const resp = await fetch(url);
      if (!resp.ok) throw new Error('Network error');
      const data = await resp.json();
      if (data && data.rates && typeof data.rates.VND === 'number') {
        return data.rates.VND;
      }
      throw new Error('Invalid response');
    } catch (err) {
      // Provide sensible fallback rates (as of a recent snapshot) — you can update these.
      const fallback = {
        USD: 24000,
        EUR: 26000,
        GBP: 30000,
        AUD: 16000,
        CAD: 17000,
      };
      return fallback[fromCurrency.toUpperCase()] || 24000;
    }
  }

  function convertToVND(amount, rate) {
    const n = Number(amount);
    const r = Number(rate);
    if (!isFinite(n) || !isFinite(r)) return 0;
    return Math.round(n * r);
  }

  function calculateLongevity(budgetVND, monthlyExpenseVND) {
    // budgetVND and monthlyExpenseVND should be integer amounts in VND
    const budget = Number(budgetVND);
    const monthly = Number(monthlyExpenseVND);
    if (!isFinite(budget) || !isFinite(monthly) || monthly <= 0) {
      return { months: 0, years: 0, remainderVND: budget, daysApprox: 0 };
    }
    const monthsFloat = budget / monthly;
    const months = Math.floor(monthsFloat);
    const years = Math.floor(months / 12);
    const remainderVND = Math.round(budget - months * monthly);
    const dailyExpense = monthly / 30; // rough
    const daysApprox = Math.floor(remainderVND / (dailyExpense || 1));
    return { months, years, remainderVND, daysApprox };
  }

  function formatVND(amount) {
    const n = Number(amount) || 0;
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n);
  }

  // Optional helper to wire a basic UI if the developer used these IDs.
  // Elements (optional):
  //  - #currencySelect (select with currency codes)
  //  - #rateInput (input where user can override rate)
  //  - #amountInput (amount in foreign currency)
  //  - #convertBtn (button to convert)
  //  - #vndResult (element to show converted VND)
  //  - #budgetInput (initial budget in foreign currency or VND)
  //  - #monthlyInput (monthly expense in VND)
  //  - #longevityResult (element to show months/years)
  function attachBudgetUI(opts = {}) {
    // find elements
    const qs = (sel) => document.querySelector(sel);
    const currencySelect = qs(opts.currencySelect || '#currencySelect');
    const rateInput = qs(opts.rateInput || '#rateInput');
    const amountInput = qs(opts.amountInput || '#amountInput');
    const convertBtn = qs(opts.convertBtn || '#convertBtn');
    const vndResult = qs(opts.vndResult || '#vndResult');

    const budgetInput = qs(opts.budgetInput || '#budgetInput');
    const monthlyInput = qs(opts.monthlyInput || '#monthlyInput');
    const longevityResult = qs(opts.longevityResult || '#longevityResult');

    async function doConvert() {
      if (!amountInput) return;
      const amount = Number(amountInput.value || 0);
      const currency = (currencySelect && currencySelect.value) || 'USD';
      let rate = rateInput ? Number(rateInput.value) : NaN;
      if (!isFinite(rate) || rate <= 0) {
        rate = await fetchExchangeRate(currency);
        if (rateInput) rateInput.value = Math.round(rate);
      }
      const vnd = convertToVND(amount, rate);
      if (vndResult) vndResult.textContent = formatVND(vnd);
      return vnd;
    }

    async function doLongevity() {
      if (!budgetInput || !monthlyInput || !longevityResult) return;
      // Accept budget either as VND (if has trailing 'VND') or number in selected currency
      const budgetRaw = budgetInput.value || '';
      const monthlyRaw = monthlyInput.value || '';

      // parse monthly in VND
      const monthlyVND = Number(monthlyRaw.replace(/[\D]/g, '')) || Number(monthlyRaw) || 0;

      // detect if budget appears to be VND (contains non-digit) otherwise treat as foreign currency
      const hasNonDigits = /[^0-9.,]/.test(budgetRaw);
      let budgetVND = Number(budgetRaw.replace(/[^0-9.-]/g, '')) || 0;
      if (!hasNonDigits && (opts.treatBudgetAsForeign || !opts.budgetIsVND)) {
        // treat as foreign currency -> convert using selected currency
        const currency = (currencySelect && currencySelect.value) || 'USD';
        let rate = rateInput ? Number(rateInput.value) : NaN;
        if (!isFinite(rate) || rate <= 0) {
          rate = await fetchExchangeRate(currency);
        }
        budgetVND = convertToVND(Number(budgetRaw), rate);
      }

      const res = calculateLongevity(budgetVND, monthlyVND);
      longevityResult.innerHTML = `Estimated: <strong>${res.months} months</strong> (~${res.years} years) <br> Remainder: ${formatVND(res.remainderVND)} (~${res.daysApprox} days at current monthly burn)`;
      return res;
    }

    if (convertBtn) convertBtn.addEventListener('click', (e) => { e.preventDefault(); doConvert(); });
    if (amountInput) amountInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') doConvert(); });

    // longevity bindings
    if (budgetInput) budgetInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') doLongevity(); });
    if (monthlyInput) monthlyInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') doLongevity(); });

    // expose small interface
    return { doConvert, doLongevity };
  }

  return {
    fetchExchangeRate,
    convertToVND,
    calculateLongevity,
    formatVND,
    attachBudgetUI,
  };
})();

// Expose globally for debugging/console use
window.BudgetUtils = BudgetUtils;

// Auto-attach UI logic customized for NomadFlow
document.addEventListener('DOMContentLoaded', () => {
    const ui = BudgetUtils.attachBudgetUI({
      convertBtn: '#convertBtn'
    });

    const btn = document.querySelector('#convertBtn');
    if (btn) {
        btn.addEventListener('click', async () => {
            // 1. Convert savings to VND
            const vndAmount = await ui.doConvert();

            // 2. Calculate longevity using converted VND amount
            const monthlyInput = document.querySelector('#monthlyInput');
            const longevityResult = document.querySelector('#longevityResult');
            const fill = document.querySelector('#fill');

            const monthlyVND = Number((monthlyInput?.value || '').replace(/[^0-9]/g, '')) || 0;

            // Validation: if monthly is 0 or empty, show ---
            if (monthlyVND <= 0 || !vndAmount) {
                if (longevityResult) longevityResult.innerHTML = '---';
                if (fill) {
                    fill.style.width = '0%';
                    fill.style.background = '#ff3b30';
                }
                return;
            }

            // Calculate longevity
            const res = BudgetUtils.calculateLongevity(vndAmount, monthlyVND);

            // Update longevity result
            if (longevityResult) {
                longevityResult.innerHTML = `Estimated: <strong>${res.months} months</strong> (~${res.years} years)<br>Remainder: ${BudgetUtils.formatVND(res.remainderVND)} (~${res.daysApprox} days)`;
            }

            // 3. Animate progress bar (6 months = 100% safe)
            if (fill) {
                const safetyScore = Math.min((res.months / 6) * 100, 100);
                fill.style.width = safetyScore + '%';

                if (safetyScore >= 100) fill.style.background = '#34c759'; // Green
                else if (safetyScore >= 50) fill.style.background = '#ffcc00'; // Yellow
                else fill.style.background = '#ff3b30'; // Red
            }
        });
    }

    // Regional Preset Tags - auto-fill monthly spending and trigger calculation
    const presetTags = document.querySelectorAll('.preset-tag');
    const monthlyInput = document.querySelector('#monthlyInput');

    presetTags.forEach(tag => {
        tag.addEventListener('click', () => {
            // Remove active class from all tags
            presetTags.forEach(t => t.classList.remove('active'));
            // Add active to clicked tag
            tag.classList.add('active');

            // Fill the monthly input with preset value
            const amount = tag.dataset.amount;
            if (monthlyInput && amount) {
                monthlyInput.value = amount;
                
                // Auto-trigger calculation if savings input has a value
                const amountInput = document.querySelector('#amountInput');
                if (amountInput && amountInput.value && btn) {
                    btn.click();
                }
            }
        });
    });
});
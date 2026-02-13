// script.js
// NomadFlow - Multi-Country Nomad Budget Calculator with Lifestyle Toggle
// Supports: Vietnam, Thailand, Philippines, Indonesia, Japan, South Korea

// Lifestyle Pricing Matrix (monthly costs in local currency)
const LIFESTYLE_MATRIX = {
    VN: { budget: 12000000, standard: 25000000, highlife: 60000000 },
    TH: { budget: 25000, standard: 50000, highlife: 120000 },
    PH: { budget: 35000, standard: 60000, highlife: 150000 },
    ID: { budget: 10000000, standard: 20000000, highlife: 50000000 },
    JP: { budget: 180000, standard: 350000, highlife: 800000 },
    KR: { budget: 1500000, standard: 2500000, highlife: 5500000 }
};

// Country configuration with currencies and regional presets
const COUNTRY_CONFIG = {
    VN: {
        name: 'Vietnam',
        flag: '🇻🇳',
        currency: 'VND',
        currencyName: 'Vietnamese Dong',
        locale: 'vi-VN',
        presets: [
            { name: '🏙️ HCMC Premium', amount: 30000000 },
            { name: '🌊 Da Nang', amount: 20000000 },
            { name: '🏯 Hanoi', amount: 18000000 },
            { name: '🌿 Rural/Hoi An', amount: 12000000 }
        ],
        fallbackRate: { USD: 24500, EUR: 26500, GBP: 31000, AUD: 16000, CAD: 18000, RON: 5300 }
    },
    TH: {
        name: 'Thailand',
        flag: '🇹🇭',
        currency: 'THB',
        currencyName: 'Thai Baht',
        locale: 'th-TH',
        presets: [
            { name: '🏙️ Bangkok Premium', amount: 80000 },
            { name: '🌸 Chiang Mai', amount: 45000 },
            { name: '🏝️ Phuket', amount: 70000 },
            { name: '🌴 Pai/Rural', amount: 30000 }
        ],
        fallbackRate: { USD: 35, EUR: 38, GBP: 44, AUD: 23, CAD: 26, RON: 7.5 }
    },
    PH: {
        name: 'Philippines',
        flag: '🇵🇭',
        currency: 'PHP',
        currencyName: 'Philippine Peso',
        locale: 'en-PH',
        presets: [
            { name: '🏙️ Manila/Makati', amount: 80000 },
            { name: '🏝️ Cebu', amount: 55000 },
            { name: '🏄 Siargao', amount: 45000 },
            { name: '🌿 Provincial', amount: 35000 }
        ],
        fallbackRate: { USD: 56, EUR: 61, GBP: 71, AUD: 37, CAD: 41, RON: 12 }
    },
    ID: {
        name: 'Indonesia',
        flag: '🇮🇩',
        currency: 'IDR',
        currencyName: 'Indonesian Rupiah',
        locale: 'id-ID',
        presets: [
            { name: '🏝️ Bali (Canggu)', amount: 25000000 },
            { name: '🏙️ Jakarta', amount: 20000000 },
            { name: '🌋 Yogyakarta', amount: 12000000 },
            { name: '🌿 Lombok/Rural', amount: 10000000 }
        ],
        fallbackRate: { USD: 15700, EUR: 17000, GBP: 19800, AUD: 10300, CAD: 11500, RON: 3400 }
    },
    JP: {
        name: 'Japan',
        flag: '🇯🇵',
        currency: 'JPY',
        currencyName: 'Japanese Yen',
        locale: 'ja-JP',
        presets: [
            { name: '🗼 Tokyo', amount: 350000 },
            { name: '🏯 Osaka', amount: 280000 },
            { name: '🌸 Fukuoka', amount: 220000 },
            { name: '🏔️ Rural Japan', amount: 180000 }
        ],
        fallbackRate: { USD: 149, EUR: 162, GBP: 188, AUD: 98, CAD: 109, RON: 32 }
    },
    KR: {
        name: 'South Korea',
        flag: '🇰🇷',
        currency: 'KRW',
        currencyName: 'Korean Won',
        locale: 'ko-KR',
        presets: [
            { name: '🏙️ Seoul (Gangnam)', amount: 3500000 },
            { name: '🌆 Seoul (Standard)', amount: 2500000 },
            { name: '🏖️ Busan', amount: 2000000 },
            { name: '🌿 Jeju/Rural', amount: 1800000 }
        ],
        fallbackRate: { USD: 1320, EUR: 1430, GBP: 1670, AUD: 870, CAD: 970, RON: 285 }
    }
};

// Global state
let currentCountry = 'VN';
let currentLifestyle = 'standard';

const NomadFlow = (function () {
    const API_BASE = 'https://api.exchangerate.host/latest';

    // Fetch exchange rate from user's currency to destination country's currency
    async function fetchExchangeRate(fromCurrency, toCurrency) {
        try {
            const url = `${API_BASE}?base=${encodeURIComponent(fromCurrency)}&symbols=${encodeURIComponent(toCurrency)}`;
            const resp = await fetch(url);
            if (!resp.ok) throw new Error('Network error');
            const data = await resp.json();
            if (data && data.rates && typeof data.rates[toCurrency] === 'number') {
                return data.rates[toCurrency];
            }
            throw new Error('Invalid response');
        } catch (err) {
            // Use fallback rates
            const config = COUNTRY_CONFIG[currentCountry];
            return config.fallbackRate[fromCurrency.toUpperCase()] || config.fallbackRate.USD;
        }
    }

    // Convert amount using rate
    function convertAmount(amount, rate) {
        const n = Number(amount);
        const r = Number(rate);
        if (!isFinite(n) || !isFinite(r)) return 0;
        return Math.round(n * r);
    }

    // Calculate longevity
    function calculateLongevity(budgetLocal, monthlyExpense) {
        const budget = Number(budgetLocal);
        const monthly = Number(monthlyExpense);
        if (!isFinite(budget) || !isFinite(monthly) || monthly <= 0) {
            return { months: 0, years: 0, remainder: budget, daysApprox: 0 };
        }
        const monthsFloat = budget / monthly;
        const months = Math.floor(monthsFloat);
        const years = Math.floor(months / 12);
        const remainder = Math.round(budget - months * monthly);
        const dailyExpense = monthly / 30;
        const daysApprox = Math.floor(remainder / (dailyExpense || 1));
        return { months, years, remainder, daysApprox };
    }

    // Format currency based on country config
    function formatCurrency(amount, countryCode) {
        const config = COUNTRY_CONFIG[countryCode];
        const n = Number(amount) || 0;
        try {
            return new Intl.NumberFormat(config.locale, { 
                style: 'currency', 
                currency: config.currency,
                maximumFractionDigits: 0
            }).format(n);
        } catch {
            return `${config.currency} ${n.toLocaleString()}`;
        }
    }

    // Get lifestyle amount for current country
    function getLifestyleAmount(countryCode, lifestyle) {
        return LIFESTYLE_MATRIX[countryCode]?.[lifestyle] || LIFESTYLE_MATRIX[countryCode]?.standard || 0;
    }

    return {
        fetchExchangeRate,
        convertAmount,
        calculateLongevity,
        formatCurrency,
        getLifestyleAmount
    };
})();

// Expose globally
window.NomadFlow = NomadFlow;

// UI Logic
document.addEventListener('DOMContentLoaded', () => {
    const countrySelect = document.getElementById('countrySelect');
    const currencySelect = document.getElementById('currencySelect');
    const amountInput = document.getElementById('amountInput');
    const monthlyInput = document.getElementById('monthlyInput');
    const convertBtn = document.getElementById('convertBtn');
    const rateInput = document.getElementById('rateInput');
    const presetContainer = document.getElementById('presetContainer');
    const localResult = document.getElementById('localResult');
    const longevityResult = document.getElementById('longevityResult');
    const fill = document.getElementById('fill');
    const equivalentLabel = document.getElementById('equivalentLabel');
    const monthlyLabel = document.getElementById('monthlyLabel');
    const monthlyHint = document.getElementById('monthlyHint');
    const headerSubtitle = document.getElementById('headerSubtitle');
    const lifestyleControl = document.getElementById('lifestyleControl');
    const lifestyleBtns = lifestyleControl?.querySelectorAll('.segment-btn');

    // Update monthly input based on lifestyle
    function updateMonthlyFromLifestyle() {
        const amount = NomadFlow.getLifestyleAmount(currentCountry, currentLifestyle);
        monthlyInput.value = amount;
        
        // Auto-calculate if savings entered
        if (amountInput.value) {
            runCalculation();
        }
    }

    // Update UI for selected country
    function updateCountryUI() {
        const config = COUNTRY_CONFIG[currentCountry];
        
        // Update header
        headerSubtitle.textContent = `Calculate your freedom in ${config.name} ${config.flag}`;
        
        // Update labels
        equivalentLabel.textContent = `${config.currency} Equivalent`;
        monthlyLabel.textContent = `Est. Monthly Spending (${config.currency})`;
        monthlyHint.textContent = `Enter amount in ${config.currencyName}`;
        
        // Clear rate cache
        if (rateInput) rateInput.value = '';
        
        // Reset results
        localResult.textContent = '0';
        longevityResult.innerHTML = '---';
        fill.style.width = '0%';
        
        // Update presets
        renderPresets();
        
        // Reset lifestyle to standard and update monthly
        currentLifestyle = 'standard';
        lifestyleBtns?.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.lifestyle === 'standard');
        });
        updateMonthlyFromLifestyle();
    }

    // Render preset buttons for current country
    function renderPresets() {
        const config = COUNTRY_CONFIG[currentCountry];
        presetContainer.innerHTML = '';
        
        config.presets.forEach(preset => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'preset-tag';
            btn.dataset.amount = preset.amount;
            btn.textContent = preset.name;
            presetContainer.appendChild(btn);
        });
        
        // Re-attach preset click handlers
        attachPresetHandlers();
    }

    // Attach click handlers to preset buttons
    function attachPresetHandlers() {
        const presetTags = document.querySelectorAll('.preset-tag');
        
        presetTags.forEach(tag => {
            tag.addEventListener('click', () => {
                // Remove active from all presets
                presetTags.forEach(t => t.classList.remove('active'));
                // Add to clicked
                tag.classList.add('active');
                
                // Clear lifestyle active state (manual override)
                lifestyleBtns?.forEach(btn => btn.classList.remove('active'));
                
                // Fill monthly input
                const amount = tag.dataset.amount;
                if (amount) {
                    monthlyInput.value = amount;
                    
                    // Auto-calculate if savings entered
                    if (amountInput.value) {
                        runCalculation();
                    }
                }
            });
        });
    }

    // Main calculation
    async function runCalculation() {
        const config = COUNTRY_CONFIG[currentCountry];
        const fromCurrency = currencySelect.value;
        const toCurrency = config.currency;
        const amount = Number(amountInput.value) || 0;
        const monthlyExpense = Number((monthlyInput.value || '').replace(/[^0-9]/g, '')) || 0;

        // Get exchange rate
        let rate = Number(rateInput.value);
        if (!isFinite(rate) || rate <= 0) {
            rate = await NomadFlow.fetchExchangeRate(fromCurrency, toCurrency);
            rateInput.value = rate;
        }

        // Convert to local currency
        const localAmount = NomadFlow.convertAmount(amount, rate);
        localResult.textContent = NomadFlow.formatCurrency(localAmount, currentCountry);

        // Validation
        if (monthlyExpense <= 0 || localAmount <= 0) {
            longevityResult.innerHTML = '---';
            fill.style.width = '0%';
            fill.style.background = '#ff3b30';
            return;
        }

        // Calculate longevity
        const res = NomadFlow.calculateLongevity(localAmount, monthlyExpense);

        // Update longevity result
        longevityResult.innerHTML = `Estimated: <strong>${res.months} months</strong> (~${res.years} years)<br>Remainder: ${NomadFlow.formatCurrency(res.remainder, currentCountry)} (~${res.daysApprox} days)`;

        // Animate progress bar (6 months = 100% safe)
        const safetyScore = Math.min((res.months / 6) * 100, 100);
        fill.style.width = safetyScore + '%';

        if (safetyScore >= 100) fill.style.background = '#34c759';
        else if (safetyScore >= 50) fill.style.background = '#ffcc00';
        else fill.style.background = '#ff3b30';
    }

    // Event listeners
    countrySelect.addEventListener('change', () => {
        currentCountry = countrySelect.value;
        updateCountryUI();
    });

    convertBtn.addEventListener('click', (e) => {
        e.preventDefault();
        runCalculation();
    });

    // Clear rate when currency changes (to force re-fetch)
    currencySelect.addEventListener('change', () => {
        rateInput.value = '';
    });

    // Lifestyle toggle handlers
    lifestyleBtns?.forEach(btn => {
        btn.addEventListener('click', () => {
            // Update active state
            lifestyleBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            // Clear preset active state
            document.querySelectorAll('.preset-tag').forEach(t => t.classList.remove('active'));
            
            // Update lifestyle and monthly
            currentLifestyle = btn.dataset.lifestyle;
            updateMonthlyFromLifestyle();
        });
    });

    // Initialize UI
    currentCountry = countrySelect.value;
    updateCountryUI();
});

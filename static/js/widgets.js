// widgets.js – dynamic live data for widget cards

function initWidgets() {
    updateWeatherWidget();
    updateStocksWidget();
    updateCalendarWidget();

    // Refresh every 5 minutes
    setInterval(updateWeatherWidget, 300000);
    setInterval(updateStocksWidget, 300000);
    setInterval(updateCalendarWidget, 60000);
}

function updateWeatherWidget() {
    const tempEl = document.querySelector('.weather-temp');
    const descEl = document.querySelector('.weather-desc');
    const iconEl = document.querySelector('.weather-icon');
    if (!tempEl || !descEl) return;

    const temps = [68, 72, 75, 70, 78, 65, 80, 82, 69, 73];
    const conditions = ['Sunny', 'Partly Cloudy', 'Cloudy', 'Light Rain', 'Clear'];
    const cities = ['New York', 'London', 'Tokyo', 'Dubai', 'Mumbai'];

    const randTemp = temps[Math.floor(Math.random() * temps.length)];
    const randCond = conditions[Math.floor(Math.random() * conditions.length)];
    const randCity = cities[Math.floor(Math.random() * cities.length)];

    tempEl.textContent = randTemp + '°F';
    descEl.textContent = randCond + ' · ' + randCity;

    if (iconEl) {
        const icons = {
            'Sunny': '☀️', 'Partly Cloudy': '⛅', 'Cloudy': '☁️',
            'Light Rain': '🌧️', 'Clear': '🌙'
        };
        iconEl.textContent = icons[randCond] || '☀️';
    }
}

function updateStocksWidget() {
    const stockEl = document.querySelector('.stock-val');
    if (!stockEl) return;

    const change = (Math.random() * 4 - 1).toFixed(2);
    const sign = change >= 0 ? '▲' : '▼';
    const color = change >= 0 ? '#34d399' : '#ef4444';
    stockEl.innerHTML = `<span style="color:${color}">${sign} S&P 500 ${change}%</span>`;
}

function updateCalendarWidget() {
    const calEl = document.querySelector('.cal-text');
    if (!calEl) return;
    const now = new Date();
    calEl.textContent = now.toLocaleDateString('en-US', {
        weekday: 'long', month: 'long', day: 'numeric'
    });
}
// ======================
//  BASIC CONFIG
// ======================
const API_KEY = "d9a10cd5acdf1e664b8054bc117a9a7f";
const API_URL = "https://api.openweathermap.org/data/2.5/weather";
const FORECAST_URL = "https://api.openweathermap.org/data/2.5/forecast";
const AIR_URL = "https://api.openweathermap.org/data/2.5/air_pollution";
const GEO_URL = "https://api.openweathermap.org/geo/1.0/direct";

// ======================
let currentUnit = localStorage.getItem("unit") || "metric";
let currentCity = null;
let todaysRainChance = null;
let todaysUV = null;


// ======================
// DOM
// ======================
const searchForm = document.querySelector(".search-form");
const searchInput = document.querySelector(".search-input");
const cityName = document.querySelector(".city-name");
const regionName = document.querySelector(".city-region");
const temperatureDisplay = document.querySelector(".temperature-display");
const conditionEl = document.querySelector(".condition");
const tempExtra = document.querySelector(".temp-extra");
const weatherIconEl = document.querySelector(".weather-icon");
const humidityEl = document.querySelector(".humidity");
const windEl = document.querySelector(".wind");
const pressureEl = document.querySelector(".pressure");
const sunriseEl = document.querySelector(".sunrise");
const sunsetEl = document.querySelector(".sunset");
const hourlyBox = document.querySelector(".hourly-list");
const aqiRow = document.getElementById("aqiRow");
const uvRow = document.getElementById("uvRow");
const rainRow = document.getElementById("rainRow");
const tipsText = document.querySelector(".tips-card p");
const errorBox = document.getElementById("errorBox");
const loadingEl = document.getElementById("loadingSpinner");
const lastUpdatedEl = document.querySelector(".last-updated");
const favBtn = document.querySelector(".fav-btn");
const retryBtn = document.querySelector(".retry-btn");
const suggestionsBox = document.querySelector(".suggestions");

// ======================
// ICON MAP
// ======================
const iconMap = {
  Clear: "sun.png",
  Clouds: "cloudy.png",
  Rain: "rain.png",
  Drizzle: "rain.png",
  Thunderstorm: "storm.png",
  Snow: "snow.png",
  Mist: "Fog.png",
  Smoke: "Fog.png",
  Haze: "Fog.png",
  Fog: "Fog.png",
  Dust: "Fog.png",
  Tornado: "storm.png",
};

// ======================
// SEARCH CITY
// ======================
searchForm.addEventListener("submit", (e) => {
  e.preventDefault();
  if (!searchInput.value.trim()) return;
  fetchWeather(searchInput.value.trim());
  searchInput.value = "";
});

// ======================
// AUTOCOMPLETE
// ======================
let debounceTimer;

searchInput.addEventListener("input", () => {
  clearTimeout(debounceTimer);
  const q = searchInput.value.trim();
  if (q.length < 3) {
    suggestionsBox.innerHTML = "";
    return;
  }

  debounceTimer = setTimeout(async () => {
    try {
      const res = await fetch(
        `${GEO_URL}?q=${q}&limit=5&appid=${API_KEY}`
      );
      const cities = await res.json();
      showSuggestions(cities);
    } catch (err) {
  console.error("Autocomplete error:", err);
}

  }, 300);
});

function showSuggestions(list) {
  const box = document.querySelector(".suggestions");
  box.innerHTML = "";

  list.forEach((c) => {
    const li = document.createElement("li");
    li.textContent = `${c.name}, ${c.country}`;
    li.onclick = () => {
      fetchWeather(c.name);
      box.innerHTML = "";
      searchInput.value = "";
    };
    box.appendChild(li);
  });
}

let activeIndex = -1;

searchInput.addEventListener("keydown", (e) => {
  const items = document.querySelectorAll(".suggestions li");
  if (!items.length) return;

  if (e.key === "ArrowDown") {
    e.preventDefault();
    activeIndex = (activeIndex + 1) % items.length;
  } else if (e.key === "ArrowUp") {
    e.preventDefault();
    activeIndex = (activeIndex - 1 + items.length) % items.length;
  } else if (e.key === "Enter") {
    if (activeIndex >= 0) {
      e.preventDefault();
      items[activeIndex].click();
    }
    return;
  } else {
    return;
  }

  items.forEach((li, i) =>
    li.classList.toggle("active", i === activeIndex)
  );
});



// ======================
// FETCH MAIN WEATHER
// ======================
async function fetchWeather(city) {
  const start = Date.now();
  try {
    loadingEl.style.display = "flex";
    errorBox.style.display = "none";

    const res = await fetch(
      `${API_URL}?q=${encodeURIComponent(
        city
      )}&appid=${API_KEY}&units=${currentUnit}`
    );

    if (!res.ok) return showError("City Not Found");

    const data = await res.json();
    updateCurrentWeather(data);
    fetchForecast(data.name);
    fetchAQI(data.coord.lat, data.coord.lon);
    fetchUV(data.coord.lat, data.coord.lon);
  } catch {
    showError("Network Error");
  } finally {
    const elapsed = Date.now() - start;
    setTimeout(
      () => (loadingEl.style.display = "none"),
      Math.max(900 - elapsed, 0)
    );
  }
}

// ======================
// UPDATE CURRENT WEATHER
// ======================
function updateCurrentWeather(data) {
  currentCity = data.name;

  cityName.textContent = data.name;
  regionName.textContent = `${data.sys.country} • ${new Date(
    data.dt * 1000
  ).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  })}`;

  const condition = data.weather[0].main;
  weatherIconEl.src = `images/${iconMap[condition] || "cloudy.png"}`;
  temperatureDisplay.textContent = `${Math.round(data.main.temp)}°`;
  conditionEl.textContent = condition;

  tempExtra.textContent = `Feels like ${Math.round(
    data.main.feels_like
  )}° — H: ${Math.round(data.main.temp_max)}° / L: ${Math.round(
    data.main.temp_min
  )}°`;

  humidityEl.textContent = `${data.main.humidity}%`;
  pressureEl.textContent = `${data.main.pressure} hPa`;

  const now = new Date();
lastUpdatedEl.textContent = `Updated at ${now.toLocaleTimeString([], {
  hour: "2-digit",
  minute: "2-digit"
})}`;

const fav = localStorage.getItem("favorite");
favBtn.classList.toggle("active", fav === data.name);


  // 🔥 WIND SPEED + ARROW / DIRECTION
  const speed =
    currentUnit === "metric"
      ? `${(data.wind.speed * 3.6).toFixed(1)} km/h`
      : `${(data.wind.speed * 2.237).toFixed(1)} mph`;
  windEl.textContent = speed;

  const deg = data.wind.deg;
  const dirs = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  const label = dirs[Math.round(deg / 45) % 8];
  document.querySelector(
    ".wind-dir"
  ).innerHTML = `<span class="wind-arrow" style="transform: rotate(${deg}deg)">↑</span> ${label}`;

  sunriseEl.textContent = new Date(data.sys.sunrise * 1000).toLocaleTimeString(
    [],
    { hour: "2-digit", minute: "2-digit" }
  );
  sunsetEl.textContent = new Date(data.sys.sunset * 1000).toLocaleTimeString(
    [],
    { hour: "2-digit", minute: "2-digit" }
  );

  smartWeatherTips(data);
  saveToHistory(data.name);
}

// ======================
// 5-DAY FORECAST
// ======================
async function fetchForecast(city) {
  const res = await fetch(
    `${FORECAST_URL}?q=${encodeURIComponent(
      city
    )}&appid=${API_KEY}&units=${currentUnit}`
  );
  const data = await res.json();

  const container = document.querySelector(".forecast-list");
  container.innerHTML = "";

  for (let i = 0; i < 5; i++) {
    const item = data.list[i * 8];
    if (!item) continue;
    const cond = item.weather[0].main;

    const div = document.createElement("div");
    div.className = "forecast-item";
    div.innerHTML = `
      <p>${new Date(item.dt * 1000).toLocaleDateString("en-US", {
        weekday: "short",
      })}</p>
      <img class="forecast-icon" src="images/${iconMap[cond] || "cloudy.png"}">
      <p class="forecast-temp">${Math.round(item.main.temp)}°</p>
    `;
    container.appendChild(div);
  }

  const slot = data.list[12] || data.list[4];
  // Calculate chance of rain for the next 24 hours (today)
  // === Chance of rain for TODAY (next 24h) ===
  let totalPop = 0;
  let count = 0;

  // first 8 entries = next 24h
  data.list.slice(0, 8).forEach((item) => {
    if (typeof item.pop === "number") {
      totalPop += item.pop;
      count++;
    }
  });

  let rainProb = count > 0 ? Math.round((totalPop / count) * 100) : 0;

  // Fallbacks if pop is missing but it's clearly rainy
  if (rainProb === 0) {
    const rainy = data.list
      .slice(0, 8)
      .some((i) => i.weather[0].main.toLowerCase().includes("rain"));
    if (rainy) rainProb = 70;
  }

  todaysRainChance = rainProb;
  rainRow.textContent = `Chance of Rain: ${rainProb}%`;

  updateHourly(data);
}

// ======================
// HOURLY FORECAST
// ======================
function updateHourly(data) {
  hourlyBox.innerHTML = "";
  data.list.slice(0, 8).forEach((item) => {
    const div = document.createElement("div");
    div.className = "hourly-item";
    div.innerHTML = `
      <p>${new Date(item.dt * 1000).toLocaleTimeString([], {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      })}</p>
      <img src="images/${iconMap[item.weather[0].main] || "cloudy.png"}">
      <p>${Math.round(item.main.temp)}°</p>
    `;
    hourlyBox.appendChild(div);
  });
}

// ======================
// AQI
// ======================
async function fetchAQI(lat, lon) {
  aqiRow.textContent = "AQI Loading…";
  try {
    const res = await fetch(
      `${AIR_URL}?lat=${lat}&lon=${lon}&appid=${API_KEY}`
    );
    const data = await res.json();
    const aqi = data.list[0].main.aqi;
    const level = ["Good", "Fair", "Moderate", "Poor", "Very Poor"][aqi - 1];
    aqiRow.textContent = `AQI: ${aqi} — ${level}`;
  } catch {
    aqiRow.textContent = "AQI not available";
  }
}

// ====================
// UV DETAILS
// =====================

async function fetchUV(lat, lon) {
  uvRow.textContent = "UV: Loading…";

  try {
    const res = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=uv_index_max&timezone=auto`
    );
    const data = await res.json();

    const uv =
      data.daily &&
      data.daily.uv_index_max &&
      typeof data.daily.uv_index_max[0] === "number"
        ? data.daily.uv_index_max[0]
        : null;

    todaysUV = uv;
    uvRow.textContent = uv !== null ? `UV: ${uv.toFixed(1)}` : "UV: —";
  } catch {
    todaysUV = null;
    uvRow.textContent = "UV: —";
  }
}

// ======================
// SMART TIPS
// ======================
function smartWeatherTips(data) {
  // Normalize to °C for logic
  const tempC =
    currentUnit === "metric" ? data.main.temp : ((data.main.temp - 32) * 5) / 9;

  // Wind in km/h (OpenWeather gives m/s)
  const windKmh = data.wind.speed * 3.6;
  const cond = data.weather[0].main.toLowerCase();

  let parts = [];

  // --- Base clothing by temperature ---
  if (tempC <= -5) {
    parts.push("🥶 Heavy winter coat, gloves, scarf & hat needed.");
  } else if (tempC <= 5) {
    parts.push("🧥 Very cold — wear a thick jacket, layers and closed shoes.");
  } else if (tempC <= 12) {
    parts.push("🧣 Cool — a jacket or warm sweater is recommended.");
  } else if (tempC <= 20) {
    parts.push("🧥 Mild — light jacket or long sleeves should be enough.");
  } else if (tempC <= 28) {
    parts.push("👕 Comfortable — T-shirt and light clothing are fine.");
  } else {
    parts.push("🔥 Hot — wear light, breathable clothes and stay hydrated.");
  }

  // --- Rain-related accessories ---
  if (todaysRainChance !== null) {
    if (todaysRainChance >= 70) {
      parts.push("☂ High chance of rain — carry an umbrella or raincoat.");
    } else if (todaysRainChance >= 40) {
      parts.push("🌦 Possible showers — keep a small umbrella handy.");
    }
  } else if (cond.includes("rain") || cond.includes("drizzle")) {
    parts.push("☂ It’s rainy — use a raincoat or umbrella outside.");
  }

  // --- Wind-related suggestions ---
  if (windKmh >= 35) {
    parts.push(
      "💨 Strong winds — a windproof jacket or hoodie is a good idea."
    );
  } else if (windKmh >= 20) {
    parts.push("🌬 Slightly breezy — a light layer will feel more comfortable.");
  }

  // --- UV-based sun protection ---
  if (todaysUV !== null) {
    if (todaysUV >= 8) {
      parts.push("😎 UV is very high — use sunscreen, sunglasses and a hat.");
    } else if (todaysUV >= 5) {
      parts.push(
        "🧴 UV is moderate — consider sunscreen if you'll be outside for long."
      );
    }
  }

  // --- Fallback if somehow nothing was added ---
  if (parts.length === 0) {
    parts.push(
      "🌤 Weather looks okay — dress comfortably and check back for changes."
    );
  }

  tipsText.textContent = parts.join(" ");
}


// ======================
// ERROR POPUP
// ======================
function showError(msg) {
  loadingEl.style.display = "none";
  errorBox.style.display = "flex";
  errorBox.querySelector("h3").textContent = msg;

  if (!navigator.onLine) {
    offlineMsg.style.display = "block";
  }

  setTimeout(() => {
    errorBox.style.display = "none";
  }, 3200);
}


// ======================
// SEARCH HISTORY
// ======================
function saveToHistory(city) {
  let list = JSON.parse(localStorage.getItem("history") || "[]");
  list = list.filter((n) => n.toLowerCase() !== city.toLowerCase());
  list.unshift(city);
  list = list.slice(0, 5);
  localStorage.setItem("history", JSON.stringify(list));
  renderHistory();
}

function renderHistory() {
  const hist = JSON.parse(localStorage.getItem("history") || "[]");
  const box = document.querySelector(".history-list");
  box.innerHTML = "";
  hist.forEach((city) => {
    const li = document.createElement("li");
    li.className = "history-item";
    li.textContent = city;
    li.onclick = () => fetchWeather(city);
    box.appendChild(li);
  });
}
renderHistory();

// ======================
// UNIT TOGGLE
// ======================
document.querySelectorAll(".unit-btn").forEach((btn) =>
  btn.addEventListener("click", () => {
    if (btn.dataset.unit === currentUnit) return;
    currentUnit = btn.dataset.unit;
    localStorage.setItem("unit", currentUnit);
    document
      .querySelectorAll(".unit-btn")
      .forEach((b) =>
        b.classList.toggle("active", b.dataset.unit === currentUnit)
      );
    if (currentCity) fetchWeather(currentCity);
  })
);

// ======================
// USE MY LOCATION
// ======================
document.querySelector(".location-btn").addEventListener("click", () => {
  if (!navigator.geolocation) return showError("Geolocation not supported");

  navigator.geolocation.getCurrentPosition(
    async (pos) => {
      const start = Date.now();
      loadingEl.style.display = "flex";
      try {
        const { latitude, longitude } = pos.coords;
        const res = await fetch(
          `${API_URL}?lat=${latitude}&lon=${longitude}&appid=${API_KEY}&units=${currentUnit}`
        );
        const d = await res.json();
        updateCurrentWeather(d);
        fetchForecast(d.name);
        fetchAQI(latitude, longitude);
        fetchUV(latitude, longitude);
      } catch {
        showError("Network Error");
      } finally {
        const elapsed = Date.now() - start;
        setTimeout(
          () => (loadingEl.style.display = "none"),
          Math.max(900 - elapsed, 0)
        );
      }
    },
    () => showError("Location access denied")
  );
});

// DEFAULT LOAD
fetchWeather(localStorage.getItem("favorite") || "San Francisco");

//CLEAR BUTTON 
document.querySelector(".clear-history").addEventListener("click", () => {
  localStorage.removeItem("history");
  renderHistory();
});

//FAVOURITE BUTTON
favBtn.addEventListener("click", () => {
  if (!currentCity) return;

  const fav = localStorage.getItem("favorite");
  if (fav === currentCity) {
    localStorage.removeItem("favorite");
    favBtn.classList.remove("active");
  } else {
    localStorage.setItem("favorite", currentCity);
    favBtn.classList.add("active");
  }
});

//OFFLINE MESSAGE
const offlineMsg = document.getElementById("offlineMsg");

window.addEventListener("offline", () => {
  offlineMsg.style.display = "block";
});

window.addEventListener("online", () => {
  offlineMsg.style.display = "none";
});

//RETRY BUTTON
retryBtn.addEventListener("click", () => {
  errorBox.style.display = "none";
  if (currentCity) {
    fetchWeather(currentCity);
  }
});

//SUGGESTIONS CLOSE
document.addEventListener("click", (e) => {
  const suggestions = document.querySelector(".suggestions");
  const searchForm = document.querySelector(".search-form");

  if (!searchForm.contains(e.target) && !suggestions.contains(e.target)) {
    suggestions.innerHTML = "";
  }
});

// ======================
// DARK MODE
// ======================
const themeBtn = document.querySelector(".theme-btn");

// load saved theme
if (localStorage.getItem("theme") === "dark") {
  document.body.classList.add("dark");
  themeBtn.textContent = "☀️";
}

themeBtn.addEventListener("click", () => {
  document.body.classList.toggle("dark");
  const isDark = document.body.classList.contains("dark");
  localStorage.setItem("theme", isDark ? "dark" : "light");
  themeBtn.textContent = isDark ? "☀️" : "🌙";
});





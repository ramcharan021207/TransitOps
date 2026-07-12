/**
 * dashboard.js — TransitOps ERP
 * Handles sidebar navigation, dropdowns, live clock, KPI cards,
 * and all dashboard data panels loaded from the API.
 *
 * UI behaviour (preserved from original):
 *   - Sidebar open / close / toggle
 *   - Active navigation menu item
 *   - Notification dropdown + badge + mark-read
 *   - Profile dropdown
 *   - Live clock
 *   - Logout
 *
 * API data (new):
 *   - GET /api/reports/dashboard          → KPI cards
 *   - GET /api/reports/recent-trips       → Recent trips panel
 *   - GET /api/reports/recent-maintenance → Recent maintenance panel
 *   - GET /api/reports/recent-fuel        → Recent fuel panel
 *   - Auto-refresh every 30 seconds
 *
 * Rules:
 *   - Fetch API only (async / await / try-catch)
 *   - No dummy data for API sections
 *   - If backend unavailable, display error banner
 */

"use strict";

/* ═══════════════════════════════════════════════════════════════════
   API BASE URL
   Single constant for all report endpoint calls.
═══════════════════════════════════════════════════════════════════ */
const DASH_API_BASE = "/api";

/* ═══════════════════════════════════════════════════════════════════
   AUTO-REFRESH INTERVAL
   Dashboard data is re-fetched every 30 seconds.
   The interval id is stored so it can be cleared if needed.
═══════════════════════════════════════════════════════════════════ */
const REFRESH_INTERVAL_MS = 30000; // 30 seconds
let refreshIntervalId = null;

/* ═══════════════════════════════════════════════════════════════════
   STATIC UI DATA (preserved)
   NOTIFICATIONS, CURRENT_USER, NAV_ITEMS are frontend-only and
   remain hardcoded until the auth/notifications API is connected.
═══════════════════════════════════════════════════════════════════ */

/* ─── KPI Card Definitions ──────────────────────────────────────── */
/* Structure only — values are loaded from GET /api/reports/dashboard */
const DASHBOARD_CARDS = [
  { id: "card-active-vehicles",        title: "Active Vehicles",        apiKey: "active_vehicles",        icon: "🚌", color: "green"  },
  { id: "card-available-vehicles",     title: "Available Vehicles",     apiKey: "available_vehicles",     icon: "✅", color: "blue"   },
  { id: "card-vehicles-in-maintenance",title: "Vehicles In Maintenance",apiKey: "vehicles_in_maintenance",icon: "🔧", color: "orange" },
  { id: "card-active-trips",           title: "Active Trips",           apiKey: "active_trips",           icon: "🛣️", color: "purple" },
  { id: "card-pending-trips",          title: "Pending Trips",          apiKey: "pending_trips",          icon: "⏳", color: "yellow" },
  { id: "card-drivers-on-duty",        title: "Drivers On Duty",        apiKey: "drivers_on_duty",        icon: "👤", color: "teal"   },
  { id: "card-fleet-utilization",      title: "Fleet Utilization",      apiKey: "fleet_utilization",      icon: "📊", color: "red"    },
];

/* ─── Notifications Data ────────────────────────────────────────── */
const NOTIFICATIONS = [
  {
    id: "notif-1",
    icon: "🚨",
    title: "Route 22 Delayed",
    message: "Route 22 is running 15 minutes behind schedule.",
    time: "2 min ago",
    unread: true,
  },
  {
    id: "notif-2",
    icon: "🔧",
    title: "Vehicle Maintenance Due",
    message: "Bus #TN-0441 is due for scheduled maintenance.",
    time: "18 min ago",
    unread: true,
  },
  {
    id: "notif-3",
    icon: "✅",
    title: "Driver Check-In Complete",
    message: "All drivers have completed their morning check-in.",
    time: "1 hr ago",
    unread: false,
  },
  {
    id: "notif-4",
    icon: "📋",
    title: "New Dispatch Request",
    message: "Dispatch #D-2041 assigned to Fleet Zone B.",
    time: "3 hr ago",
    unread: false,
  },
];

/* ─── Profile / User Data ──────────────────────────────────────── */
const CURRENT_USER = {
  name: "Alex Johnson",
  role: "Fleet Manager",
  email: "manager@transitops.com",
  avatar: "AJ",
  status: "Online",
};

/* ─── Sidebar Navigation Items ─────────────────────────────────── */
const NAV_ITEMS = [
  { id: "nav-dashboard", label: "Dashboard", icon: "📊", href: "dashboard.html" },
  { id: "nav-routes",    label: "Routes",    icon: "🛣️", href: "#routes"    },
  { id: "nav-vehicles",  label: "Vehicles",  icon: "🚌", href: "fleet.html"  },
  { id: "nav-drivers",   label: "Drivers",   icon: "👤", href: "drivers.html"    },
  { id: "nav-dispatch",  label: "Dispatch",  icon: "📋", href: "trips.html"   },
  { id: "nav-maintenance", label: "Maintenance", icon: "🔧", href: "maintenance.html" },
  { id: "nav-fuel",      label: "Fuel Logs", icon: "⛽", href: "fuel.html"      },
];

/* ═══════════════════════════════════════════════════════════════════
   DOM REFERENCES — LAYOUT
   Made let so they can be queries defensively by ID or class.
═══════════════════════════════════════════════════════════════════ */
let sidebar          = null;
let sidebarToggleBtn = null;
let sidebarCloseBtn  = null;
let mainContent      = null;
let overlay          = null;

let notifToggleBtn   = null;
let notifDropdown    = null;
let notifBadge       = null;
let notifList        = null;
let markAllReadBtn   = null;

let profileToggleBtn = null;
let profileDropdown  = null;
let profileName      = null;
let profileRole      = null;
let profileAvatar    = null;

let navMenu          = null;
let cardsContainer   = null;
let logoutBtn        = null;
let currentDateTime  = null;
let pageTitle        = null;

/* ═══════════════════════════════════════════════════════════════════
   DOM REFERENCES — API DATA PANELS
   These elements receive live data loaded from the report APIs.
   If missing in static HTML, they are dynamically created.
═══════════════════════════════════════════════════════════════════ */
let dashErrorBanner   = null;
let dashErrorMsg      = null;

// ── Recent Trips panel
let recentTripsBody   = null;
let recentTripsEmpty  = null;

// ── Recent Maintenance panel
let recentMaintBody   = null;
let recentMaintEmpty  = null;

// ── Recent Fuel panel
let recentFuelBody    = null;
let recentFuelEmpty   = null;

// ── Last-refreshed timestamp display
let lastRefreshedEl   = null;

/* ═══════════════════════════════════════════════════════════════════
   DYNAMIC DOM INITIALIZATION
   Since dashboard.html might not contain tables for recent items or
   error banners statically, this function builds them dynamically.
═══════════════════════════════════════════════════════════════════ */
function ensureDomElementsExist() {
  const dashboardView = document.querySelector(".dashboard-view");
  if (!dashboardView) return;

  // ── 1. Error Banner
  let errorBanner = document.getElementById("dash-error-banner");
  if (!errorBanner) {
    errorBanner = document.createElement("div");
    errorBanner.id = "dash-error-banner";
    errorBanner.className = "hidden";
    errorBanner.style.cssText = "display: none; background: rgba(239, 68, 68, 0.1); color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.2); padding: 1rem; border-radius: 8px; margin-bottom: 1.5rem; font-weight: 500;";
    
    const errMsg = document.createElement("span");
    errMsg.id = "dash-error-message";
    errorBanner.appendChild(errMsg);
    
    dashboardView.insertBefore(errorBanner, dashboardView.firstChild);
  }

  // ── 2. Last Refreshed Text in header
  const pageHeader = document.querySelector(".page-header");
  if (pageHeader && !document.getElementById("last-refreshed")) {
    const refreshed = document.createElement("div");
    refreshed.id = "last-refreshed";
    refreshed.style.cssText = "font-size: 0.85rem; color: var(--text-secondary); margin-top: 0.5rem;";
    refreshed.textContent = "Loading...";
    pageHeader.appendChild(refreshed);
  }

  // ── 3. Live clock container in header (if not already there)
  if (pageHeader && !document.getElementById("current-datetime")) {
    const clockDiv = document.createElement("div");
    clockDiv.id = "current-datetime";
    clockDiv.style.cssText = "font-size: 0.9rem; color: var(--text-secondary); margin-top: 0.25rem; font-weight: 500;";
    pageHeader.appendChild(clockDiv);
  }

  // ── 4. Tables details sections
  let detailsGrid = document.getElementById("dashboard-details-grid");
  if (!detailsGrid) {
    detailsGrid = document.createElement("div");
    detailsGrid.id = "dashboard-details-grid";
    detailsGrid.style.cssText = "display: flex; flex-direction: column; gap: 2rem; margin-top: 2rem;";

    // Recent Trips section
    const tripsSection = document.createElement("div");
    tripsSection.className = "details-section";
    tripsSection.innerHTML = `
      <h2 class="section-title" style="margin-bottom: 1rem;">Recent Trips</h2>
      <div class="table-container">
        <table class="table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Vehicle</th>
              <th>Route</th>
              <th>Driver</th>
              <th>Date</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody id="recent-trips-body"></tbody>
        </table>
      </div>
      <div id="recent-trips-empty" class="hidden" style="display: none; text-align: center; padding: 2rem; color: var(--text-secondary);">No recent trips found.</div>
    `;
    detailsGrid.appendChild(tripsSection);

    // Double columns for Maintenance and Fuel
    const splitGrid = document.createElement("div");
    splitGrid.style.cssText = "display: grid; grid-template-columns: repeat(auto-fit, minmax(450px, 1fr)); gap: 1.5rem;";

    // Recent Maintenance section
    const maintSection = document.createElement("div");
    maintSection.className = "details-section";
    maintSection.innerHTML = `
      <h2 class="section-title" style="margin-bottom: 1rem;">Recent Maintenance</h2>
      <div class="table-container">
        <table class="table">
          <thead>
            <tr>
              <th>Vehicle</th>
              <th>Type</th>
              <th>Scheduled</th>
              <th>Technician</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody id="recent-maint-body"></tbody>
        </table>
      </div>
      <div id="recent-maint-empty" class="hidden" style="display: none; text-align: center; padding: 2rem; color: var(--text-secondary);">No maintenance records found.</div>
    `;
    splitGrid.appendChild(maintSection);

    // Recent Fuel logs section
    const fuelSection = document.createElement("div");
    fuelSection.className = "details-section";
    fuelSection.innerHTML = `
      <h2 class="section-title" style="margin-bottom: 1rem;">Recent Fuel Logs</h2>
      <div class="table-container">
        <table class="table">
          <thead>
            <tr>
              <th>Vehicle</th>
              <th>Type</th>
              <th>Litres</th>
              <th>Cost</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody id="recent-fuel-body"></tbody>
        </table>
      </div>
      <div id="recent-fuel-empty" class="hidden" style="display: none; text-align: center; padding: 2rem; color: var(--text-secondary);">No recent fuel logs found.</div>
    `;
    splitGrid.appendChild(fuelSection);

    detailsGrid.appendChild(splitGrid);
    dashboardView.appendChild(detailsGrid);
  }

  // ── Populate DOM References
  sidebar            = document.querySelector(".sidebar") || document.getElementById("sidebar");
  sidebarToggleBtn   = document.getElementById("sidebar-toggle");
  sidebarCloseBtn    = document.getElementById("sidebar-close");
  mainContent        = document.querySelector(".main-content") || document.getElementById("main-content");
  overlay            = document.getElementById("sidebar-overlay");

  notifToggleBtn     = document.getElementById("notif-toggle") || document.querySelector(".icon-btn"); // Fallback to first icon-btn
  notifDropdown      = document.getElementById("notif-dropdown");
  notifBadge         = document.getElementById("notif-badge") || (notifToggleBtn ? notifToggleBtn.querySelector(".badge") : null);
  notifList          = document.getElementById("notif-list");
  markAllReadBtn     = document.getElementById("mark-all-read");

  profileToggleBtn   = document.getElementById("profile-toggle") || document.querySelector(".profile-dropdown");
  profileDropdown    = document.getElementById("profile-dropdown");
  profileName        = document.getElementById("profile-name") || (profileToggleBtn ? profileToggleBtn.querySelector(".profile-name") : null);
  profileRole        = document.getElementById("profile-role");
  profileAvatar      = document.getElementById("profile-avatar") || (profileToggleBtn ? profileToggleBtn.querySelector(".profile-avatar") : null);

  navMenu            = document.getElementById("nav-menu") || (sidebar ? sidebar.querySelector(".sidebar-nav") : null);
  cardsContainer     = document.getElementById("dashboard-cards") || document.querySelector(".cards-grid");
  logoutBtn          = document.getElementById("logout-btn");
  currentDateTime    = document.getElementById("current-datetime");
  pageTitle          = document.getElementById("page-title") || document.querySelector(".page-title");

  dashErrorBanner   = document.getElementById("dash-error-banner");
  dashErrorMsg      = document.getElementById("dash-error-message");

  recentTripsBody   = document.getElementById("recent-trips-body");
  recentTripsEmpty  = document.getElementById("recent-trips-empty");

  recentMaintBody   = document.getElementById("recent-maint-body");
  recentMaintEmpty  = document.getElementById("recent-maint-empty");

  recentFuelBody    = document.getElementById("recent-fuel-body");
  recentFuelEmpty   = document.getElementById("recent-fuel-empty");

  lastRefreshedEl   = document.getElementById("last-refreshed");
}

/* ═══════════════════════════════════════════════════════════════════
   ████████████████████████████████████████████████████████████████
   API — DASHBOARD DATA
   ████████████████████████████████████████████████████████████████
═══════════════════════════════════════════════════════════════════ */

/* ═══════════════════════════════════════════════════════════════════
   SHOW DASHBOARD ERROR BANNER
   Displays the page-level API error banner with a message.
   Hides automatically after 6 seconds.

   @param {string} msg — error text to display
═══════════════════════════════════════════════════════════════════ */
function showDashError(msg) {
  if (typeof showToast === "function") {
    showToast(msg, "error");
  }
  if (!dashErrorBanner || !dashErrorMsg) return;

  dashErrorMsg.textContent = msg;
  dashErrorBanner.classList.add("visible");
  dashErrorBanner.style.display = "block";

  // Auto-dismiss after 6 seconds
  setTimeout(function () {
    dashErrorBanner.classList.remove("visible");
    dashErrorBanner.style.display = "none";
  }, 6000);
}

/* ═══════════════════════════════════════════════════════════════════
   SHOW CARD LOADING STATE
   Fills every KPI card value with a loading indicator.
═══════════════════════════════════════════════════════════════════ */
function showCardsLoading() {
  const cards = document.querySelectorAll(".cards-grid .dash-card");
  if (cards && cards.length > 0) {
    cards.forEach(function (card) {
      const valueEl = card.querySelector(".card-value");
      if (valueEl) {
        valueEl.textContent = "…";
        valueEl.classList.add("loading");
      }
    });
  } else if (DASHBOARD_CARDS) {
    DASHBOARD_CARDS.forEach(function (card) {
      const cardEl = document.getElementById(card.id);
      if (!cardEl) return;
      const valueEl = cardEl.querySelector(".card-value");
      if (valueEl) {
        valueEl.textContent = "…";
        valueEl.classList.add("loading");
      }
    });
  }
}

/* ═══════════════════════════════════════════════════════════════════
   LOAD DASHBOARD KPI CARDS
   Fetches summary metrics from GET /api/reports/dashboard and
   updates each KPI card.
═══════════════════════════════════════════════════════════════════ */
async function loadDashboardCards() {
  // Show loading indicators before the request starts
  showCardsLoading();

  try {
    const response = await fetch(DASH_API_BASE + "/reports/dashboard");

    if (!response.ok) {
      throw new Error("Server returned status " + response.status);
    }

    const resBody = await response.json();
    const data = resBody.data || resBody;

    // Try to update static card elements inside .cards-grid
    const cards = document.querySelectorAll(".cards-grid .dash-card");
    if (cards && cards.length > 0) {
      cards.forEach(function (card) {
        const titleEl = card.querySelector("h3") || card.querySelector(".card-title");
        const valueEl = card.querySelector(".card-value");
        if (titleEl && valueEl) {
          const titleText = titleEl.textContent.trim().toLowerCase();
          let value = "--";
          if (titleText.includes("active vehicles")) {
            value = data.active_vehicles;
          } else if (titleText.includes("available vehicles")) {
            value = data.available_vehicles;
          } else if (titleText.includes("maintenance")) {
            value = data.vehicles_in_maintenance;
          } else if (titleText.includes("active trips")) {
            value = data.active_trips;
          } else if (titleText.includes("pending trips")) {
            value = data.pending_trips;
          } else if (titleText.includes("drivers")) {
            value = data.drivers_on_duty;
          } else if (titleText.includes("utilization")) {
            value = data.fleet_utilization;
          }

          valueEl.textContent = (value !== null && value !== undefined)
            ? String(value)
            : "--";
          valueEl.classList.remove("loading");
        }
      });
    } else {
      // Fallback: update elements by ID
      DASHBOARD_CARDS.forEach(function (card) {
        const cardEl = document.getElementById(card.id);
        if (!cardEl) return;

        const valueEl = cardEl.querySelector(".card-value");
        if (!valueEl) return;

        const rawValue = data[card.apiKey];
        valueEl.textContent = (rawValue !== null && rawValue !== undefined)
          ? String(rawValue)
          : "--";
        valueEl.classList.remove("loading");
      });
    }

  } catch (error) {
    // Reset all cards to "--" on failure
    const cards = document.querySelectorAll(".cards-grid .dash-card");
    if (cards && cards.length > 0) {
      cards.forEach(function (card) {
        const valueEl = card.querySelector(".card-value");
        if (valueEl) {
          valueEl.textContent = "--";
          valueEl.classList.remove("loading");
        }
      });
    } else {
      DASHBOARD_CARDS.forEach(function (card) {
        const cardEl = document.getElementById(card.id);
        if (!cardEl) return;
        const valueEl = cardEl.querySelector(".card-value");
        if (valueEl) {
          valueEl.textContent = "--";
          valueEl.classList.remove("loading");
        }
      });
    }

    showDashError("Unable to connect to backend server.");
    console.error("[dashboard.js] loadDashboardCards error:", error);
  }
}

/* ═══════════════════════════════════════════════════════════════════
   SET TABLE LOADING ROW
   Inserts a single loading row spanning all columns.
═══════════════════════════════════════════════════════════════════ */
function setTableLoading(tbody, colspan) {
  if (!tbody) return;
  tbody.innerHTML =
    '<tr><td colspan="' + colspan + '" class="table-loading" style="text-align: center; color: var(--text-secondary); padding: 2rem;">Loading...</td></tr>';
}

/* ═══════════════════════════════════════════════════════════════════
   LOAD RECENT TRIPS
   Fetches the latest trip records from GET /api/reports/recent-trips.
═══════════════════════════════════════════════════════════════════ */
async function loadRecentTrips() {
  setTableLoading(recentTripsBody, 6);

  try {
    const response = await fetch(DASH_API_BASE + "/reports/recent-trips");

    if (!response.ok) {
      throw new Error("Server returned status " + response.status);
    }

    const resBody = await response.json();
    const trips = resBody.data || resBody || [];

    if (recentTripsBody) recentTripsBody.innerHTML = "";

    if (!trips || trips.length === 0) {
      showEmptyState(recentTripsEmpty, true);
      return;
    }

    showEmptyState(recentTripsEmpty, false);

    trips.forEach(function (trip) {
      if (!recentTripsBody) return;

      const statusClass = getTripStatusClass(trip.status);
      const tr = document.createElement("tr");

      tr.innerHTML =
        "<td>" + escapeHtml(String(trip.trip_id))   + "</td>" +
        "<td>" + escapeHtml(trip.vehicle)            + "</td>" +
        "<td>" + escapeHtml(trip.source) + " → " + escapeHtml(trip.destination) + "</td>" +
        "<td>" + escapeHtml(trip.driver)             + "</td>" +
        "<td>" + formatDate(trip.start_date)         + "</td>" +
        "<td>" +
          '<span class="badge-status ' + statusClass + '">' +
            escapeHtml(trip.status) +
          "</span>" +
        "</td>";

      recentTripsBody.appendChild(tr);
    });

  } catch (error) {
    if (recentTripsBody) {
      recentTripsBody.innerHTML =
        '<tr><td colspan="6" class="table-error" style="text-align: center; color: var(--danger); padding: 2rem;">Unable to load recent trips.</td></tr>';
    }
    console.error("[dashboard.js] loadRecentTrips error:", error);
  }
}

/* ═══════════════════════════════════════════════════════════════════
   LOAD RECENT MAINTENANCE
   Fetches the latest maintenance records.
═══════════════════════════════════════════════════════════════════ */
async function loadRecentMaintenance() {
  setTableLoading(recentMaintBody, 5);

  try {
    const response = await fetch(DASH_API_BASE + "/reports/recent-maintenance");

    if (!response.ok) {
      throw new Error("Server returned status " + response.status);
    }

    const resBody = await response.json();
    const records = resBody.data || resBody || [];

    if (recentMaintBody) recentMaintBody.innerHTML = "";

    if (!records || records.length === 0) {
      showEmptyState(recentMaintEmpty, true);
      return;
    }

    showEmptyState(recentMaintEmpty, false);

    records.forEach(function (record) {
      if (!recentMaintBody) return;

      const statusClass = getMaintStatusClass(record.status);
      const tr = document.createElement("tr");

      tr.innerHTML =
        "<td>" + escapeHtml(record.vehicle)                + "</td>" +
        "<td>" + escapeHtml(record.maintenance_type)       + "</td>" +
        "<td>" + formatDate(record.scheduled_date)         + "</td>" +
        "<td>" + escapeHtml(record.technician || "—")      + "</td>" +
        "<td>" +
          '<span class="badge-status ' + statusClass + '">' +
            escapeHtml(record.status) +
          "</span>" +
        "</td>";

      recentMaintBody.appendChild(tr);
    });

  } catch (error) {
    if (recentMaintBody) {
      recentMaintBody.innerHTML =
        '<tr><td colspan="5" class="table-error" style="text-align: center; color: var(--danger); padding: 2rem;">Unable to load maintenance records.</td></tr>';
    }
    console.error("[dashboard.js] loadRecentMaintenance error:", error);
  }
}

/* ═══════════════════════════════════════════════════════════════════
   LOAD RECENT FUEL
   Fetches the latest fuel logs.
═══════════════════════════════════════════════════════════════════ */
async function loadRecentFuel() {
  setTableLoading(recentFuelBody, 5);

  try {
    const response = await fetch(DASH_API_BASE + "/reports/recent-fuel");

    if (!response.ok) {
      throw new Error("Server returned status " + response.status);
    }

    const resBody = await response.json();
    const logs = resBody.data || resBody || [];

    if (recentFuelBody) recentFuelBody.innerHTML = "";

    if (!logs || logs.length === 0) {
      showEmptyState(recentFuelEmpty, true);
      return;
    }

    showEmptyState(recentFuelEmpty, false);

    logs.forEach(function (log) {
      if (!recentFuelBody) return;

      const tr = document.createElement("tr");

      tr.innerHTML =
        "<td>" + escapeHtml(log.vehicle)             + "</td>" +
        "<td>" + escapeHtml(log.fuel_type)           + "</td>" +
        "<td>" + escapeHtml(String(log.litres)) + " L" + "</td>" +
        "<td>" + formatCurrency(log.cost)            + "</td>" +
        "<td>" + formatDate(log.date)                + "</td>";

      recentFuelBody.appendChild(tr);
    });

  } catch (error) {
    if (recentFuelBody) {
      recentFuelBody.innerHTML =
        '<tr><td colspan="5" class="table-error" style="text-align: center; color: var(--danger); padding: 2rem;">Unable to load fuel logs.</td></tr>';
    }
    console.error("[dashboard.js] loadRecentFuel error:", error);
  }
}

/* ═══════════════════════════════════════════════════════════════════
   REFRESH ALL DASHBOARD DATA
   Fetches all four API endpoints concurrently.
═══════════════════════════════════════════════════════════════════ */
async function refreshDashboard() {
  await Promise.all([
    loadDashboardCards(),
    loadRecentTrips(),
    loadRecentMaintenance(),
    loadRecentFuel(),
  ]);

  updateLastRefreshed();
}

/* ═══════════════════════════════════════════════════════════════════
   UPDATE LAST REFRESHED
   Updates the last refreshed timestamp display.
═══════════════════════════════════════════════════════════════════ */
function updateLastRefreshed() {
  if (!lastRefreshedEl) return;

  const now = new Date();
  lastRefreshedEl.textContent =
    "Last refreshed: " +
    now.toLocaleTimeString("en-IN", {
      hour   : "2-digit",
      minute : "2-digit",
      second : "2-digit",
      hour12 : true,
    });
}

/* ═══════════════════════════════════════════════════════════════════
   START AUTO-REFRESH
   Updates the dashboard values every 30 seconds.
═══════════════════════════════════════════════════════════════════ */
function startAutoRefresh() {
  if (refreshIntervalId !== null) {
    clearInterval(refreshIntervalId);
  }

  refreshIntervalId = setInterval(function () {
    refreshDashboard();
  }, REFRESH_INTERVAL_MS);
}

/* ═══════════════════════════════════════════════════════════════════
   SHOW EMPTY STATE
   Toggles the visibility of empty message containers.
═══════════════════════════════════════════════════════════════════ */
function showEmptyState(el, show) {
  if (!el) return;
  if (show) {
    el.classList.remove("hidden");
    el.style.display = "block";
  } else {
    el.classList.add("hidden");
    el.style.display = "none";
  }
}

/* ═══════════════════════════════════════════════════════════════════
   ████████████████████████████████████████████████████████████████
   UI — SIDEBAR & MENU (preserved from original)
   ████████████████████████████████████████████████████████████████
═══════════════════════════════════════════════════════════════════ */

function openSidebar() {
  if (!sidebar) return;
  sidebar.classList.add("open");
  sidebar.classList.remove("collapsed");

  if (overlay) overlay.classList.add("visible");

  if (sidebarToggleBtn) {
    sidebarToggleBtn.setAttribute("aria-expanded", "true");
  }
  if (mainContent) {
    mainContent.classList.add("sidebar-open");
  }
}

function closeSidebar() {
  if (!sidebar) return;
  sidebar.classList.remove("open");
  sidebar.classList.add("collapsed");

  if (overlay) overlay.classList.remove("visible");

  if (sidebarToggleBtn) {
    sidebarToggleBtn.setAttribute("aria-expanded", "false");
  }
  if (mainContent) {
    mainContent.classList.remove("sidebar-open");
  }
}

function toggleSidebar() {
  if (!sidebar) return;
  const isOpen = sidebar.classList.contains("open");
  if (isOpen) {
    closeSidebar();
  } else {
    openSidebar();
  }
}

function setActiveNavItem(navId, label) {
  const allNavLinks = document.querySelectorAll(".nav-item a, .nav-item");
  allNavLinks.forEach(function (link) {
    link.classList.remove("active");
    link.removeAttribute("aria-current");
  });

  const activeLink = document.getElementById(navId);
  if (activeLink) {
    activeLink.classList.add("active");
    activeLink.setAttribute("aria-current", "page");
  }

  if (pageTitle) {
    pageTitle.textContent = label;
  }
}

function buildSidebarNav() {
  // Let the static HTML sidebar-nav handle page links.
  // We only activate the navigation highlight depending on the current HTML filename.
  const currentPath = window.location.pathname;
  const pageName = currentPath.substring(currentPath.lastIndexOf("/") + 1);

  const allNavLinks = document.querySelectorAll(".sidebar-nav .nav-item a");
  allNavLinks.forEach(function (link) {
    const linkHref = link.getAttribute("href");
    if (linkHref && pageName && linkHref.includes(pageName)) {
      link.classList.add("active");
      link.setAttribute("aria-current", "page");
      
      const labelEl = link.querySelector(".nav-label") || link;
      if (pageTitle && labelEl) {
        pageTitle.textContent = labelEl.textContent.trim();
      }
    } else {
      link.classList.remove("active");
    }
  });
}

/* ═══════════════════════════════════════════════════════════════════
   ████████████████████████████████████████████████████████████████
   UI — NOTIFICATIONS & DROPDOWNS (preserved from original)
   ████████████████████████████████████████████████████████████████
═══════════════════════════════════════════════════════════════════ */

function toggleNotificationDropdown() {
  if (!notifDropdown) return;
  const isOpen = notifDropdown.classList.contains("open");
  closeProfileDropdown();

  if (isOpen) {
    notifDropdown.classList.remove("open");
    if (notifToggleBtn) notifToggleBtn.setAttribute("aria-expanded", "false");
  } else {
    notifDropdown.classList.add("open");
    if (notifToggleBtn) notifToggleBtn.setAttribute("aria-expanded", "true");
  }
}

function closeNotificationDropdown() {
  if (!notifDropdown) return;
  notifDropdown.classList.remove("open");
  if (notifToggleBtn) notifToggleBtn.setAttribute("aria-expanded", "false");
}

function buildNotificationsList() {
  if (!notifList) return;
  notifList.innerHTML = "";
  let unreadCount = 0;

  NOTIFICATIONS.forEach(function (notif) {
    const item = document.createElement("div");
    item.className = "notif-item" + (notif.unread ? " unread" : "");
    item.id = notif.id;
    item.setAttribute("role", "listitem");

    item.innerHTML =
      '<span class="notif-icon" aria-hidden="true">' + notif.icon + '</span>' +
      '<div class="notif-body" style="flex:1; padding-left:10px;">' +
        '<p class="notif-title" style="font-weight:600; font-size:0.875rem;">' + notif.title + '</p>' +
        '<p class="notif-message" style="font-size:0.8rem; color:var(--text-secondary);">' + notif.message + '</p>' +
        '<span class="notif-time" style="font-size:0.75rem; color:var(--text-secondary);">' + notif.time + '</span>' +
      '</div>' +
      (notif.unread ? '<span class="notif-dot" style="width:8px; height:8px; background:var(--danger); border-radius:50%; display:inline-block; margin-left:10px;"></span>' : '');

    item.addEventListener("click", function () {
      markNotificationRead(notif.id, item);
    });

    notifList.appendChild(item);
    if (notif.unread) unreadCount++;
  });

  updateNotifBadge(unreadCount);
}

function updateNotifBadge(count) {
  if (!notifBadge) return;
  if (count > 0) {
    notifBadge.textContent = count > 9 ? "9+" : String(count);
    notifBadge.classList.remove("hidden");
    notifBadge.style.display = "flex";
  } else {
    notifBadge.textContent = "";
    notifBadge.classList.add("hidden");
    notifBadge.style.display = "none";
  }
}

function markNotificationRead(notifId, itemEl) {
  const notif = NOTIFICATIONS.find(function (n) { return n.id === notifId; });
  if (!notif || !notif.unread) return;

  notif.unread = false;
  if (itemEl) {
    itemEl.classList.remove("unread");
    const dot = itemEl.querySelector(".notif-dot") || itemEl.querySelector("span[style*='background:var(--danger)']");
    if (dot) dot.remove();
  }

  const unreadCount = NOTIFICATIONS.filter(function (n) { return n.unread; }).length;
  updateNotifBadge(unreadCount);
}

function markAllNotificationsRead() {
  NOTIFICATIONS.forEach(function (notif) {
    notif.unread = false;
  });

  if (notifList) {
    const unreadItems = notifList.querySelectorAll(".notif-item.unread");
    unreadItems.forEach(function (item) {
      item.classList.remove("unread");
      const dot = item.querySelector(".notif-dot") || item.querySelector("span[style*='background:var(--danger)']");
      if (dot) dot.remove();
    });
  }

  updateNotifBadge(0);
}

/* ═══════════════════════════════════════════════════════════════════
   UI — PROFILE & DROPDOWNS (preserved from original)
═══════════════════════════════════════════════════════════════════ */

function toggleProfileDropdown() {
  if (!profileDropdown) return;
  const isOpen = profileDropdown.classList.contains("open");
  closeNotificationDropdown();

  if (isOpen) {
    profileDropdown.classList.remove("open");
    if (profileToggleBtn) profileToggleBtn.setAttribute("aria-expanded", "false");
  } else {
    profileDropdown.classList.add("open");
    if (profileToggleBtn) profileToggleBtn.setAttribute("aria-expanded", "true");
  }
}

function closeProfileDropdown() {
  if (!profileDropdown) return;
  profileDropdown.classList.remove("open");
  if (profileToggleBtn) profileToggleBtn.setAttribute("aria-expanded", "false");
}

function populateProfileData() {
  const avatarEls = document.querySelectorAll(".profile-avatar, #profile-avatar");
  avatarEls.forEach(function (el) {
    el.textContent = CURRENT_USER.avatar;
  });

  if (profileName) profileName.textContent = CURRENT_USER.name;
  if (profileRole) profileRole.textContent = CURRENT_USER.role;

  const headerNameEl = document.getElementById("header-username");
  if (headerNameEl) headerNameEl.textContent = CURRENT_USER.name;

  const profileEmailEl = document.getElementById("profile-email");
  if (profileEmailEl) profileEmailEl.textContent = CURRENT_USER.email;
}

function buildDashboardCards() {
  // If cardsContainer exists (mock ID) and is empty, build them dynamically
  if (cardsContainer && cardsContainer.id === "dashboard-cards" && cardsContainer.children.length === 0) {
    cardsContainer.innerHTML = "";
    DASHBOARD_CARDS.forEach(function (card) {
      const cardEl = document.createElement("div");
      cardEl.className = "dashboard-card card-" + card.color;
      cardEl.id = card.id;

      cardEl.innerHTML =
        '<div class="card-header">' +
          '<span class="card-icon" aria-hidden="true">' + card.icon + '</span>' +
          '<h3 class="card-title">' + card.title + '</h3>' +
        '</div>' +
        '<div class="card-body">' +
          '<p class="card-value">--</p>' +
        '</div>';

      cardEl.addEventListener("mouseenter", function () {
        cardEl.classList.add("hovered");
      });
      cardEl.addEventListener("mouseleave", function () {
        cardEl.classList.remove("hovered");
      });

      cardsContainer.appendChild(cardEl);
    });
  }
}

function closeAllDropdowns() {
  closeNotificationDropdown();
  closeProfileDropdown();
}

function handleDocumentClick(e) {
  if (
    notifDropdown &&
    notifToggleBtn &&
    !notifDropdown.contains(e.target) &&
    !notifToggleBtn.contains(e.target)
  ) {
    closeNotificationDropdown();
  }

  if (
    profileDropdown &&
    profileToggleBtn &&
    !profileDropdown.contains(e.target) &&
    !profileToggleBtn.contains(e.target)
  ) {
    closeProfileDropdown();
  }

  if (overlay && e.target === overlay) {
    closeSidebar();
  }
}

function updateClock() {
  if (!currentDateTime) return;
  const now = new Date();
  const options = {
    weekday : "long",
    year    : "numeric",
    month   : "short",
    day     : "numeric",
    hour    : "2-digit",
    minute  : "2-digit",
    hour12  : true,
  };
  currentDateTime.textContent = now.toLocaleString("en-IN", options);
}

function handleLogout() {
  closeProfileDropdown();
  window.location.href = "login.html";
}

/* ═══════════════════════════════════════════════════════════════════
   ████████████████████████████████████████████████████████████████
   HELPER FUNCTIONS
   ████████████████████████████████████████████████████████████████
═══════════════════════════════════════════════════════════════════ */

function formatDate(dateStr) {
  if (!dateStr) return "—";
  const parsed = new Date(dateStr);
  if (isNaN(parsed.getTime())) return "—";
  return parsed.toLocaleDateString("en-IN", {
    day   : "2-digit",
    month : "short",
    year  : "numeric",
  });
}

function formatCurrency(value) {
  if (value === null || value === undefined || isNaN(Number(value))) return "—";
  return Number(value).toLocaleString("en-IN", {
    style                : "currency",
    currency             : "INR",
    maximumFractionDigits: 0,
  });
}

function escapeHtml(str) {
  if (!str && str !== 0) return "";
  return String(str)
    .replace(/&/g,  "&amp;")
    .replace(/</g,  "&lt;")
    .replace(/>/g,  "&gt;")
    .replace(/"/g,  "&quot;")
    .replace(/'/g,  "&#39;");
}

function getTripStatusClass(status) {
  switch (status) {
    case "Scheduled":   return "badge-available";
    case "In Progress": return "badge-active";
    case "Completed":   return "badge-completed";
    case "Cancelled":   return "badge-retired";
    case "Delayed":     return "badge-maintenance";
    default:            return "badge-default";
  }
}

function getMaintStatusClass(status) {
  switch (status) {
    case "Scheduled":   return "badge-available";
    case "In Progress": return "badge-active";
    case "Completed":   return "badge-completed";
    case "Cancelled":   return "badge-retired";
    case "On Hold":     return "badge-maintenance";
    default:            return "badge-default";
  }
}

/* ═══════════════════════════════════════════════════════════════════
   ATTACH EVENT LISTENERS
═══════════════════════════════════════════════════════════════════ */
function attachEventListeners() {
  if (sidebarToggleBtn) {
    sidebarToggleBtn.addEventListener("click", toggleSidebar);
  }
  if (sidebarCloseBtn) {
    sidebarCloseBtn.addEventListener("click", closeSidebar);
  }
  if (overlay) {
    overlay.addEventListener("click", closeSidebar);
  }
  if (notifToggleBtn) {
    notifToggleBtn.addEventListener("click", function (e) {
      e.stopPropagation();
      toggleNotificationDropdown();
    });
  }
  if (markAllReadBtn) {
    markAllReadBtn.addEventListener("click", function (e) {
      e.stopPropagation();
      markAllNotificationsRead();
    });
  }
  if (profileToggleBtn) {
    profileToggleBtn.addEventListener("click", function (e) {
      e.stopPropagation();
      toggleProfileDropdown();
    });
  }
  if (logoutBtn) {
    logoutBtn.addEventListener("click", handleLogout);
  }

  document.addEventListener("click", handleDocumentClick);

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") {
      closeAllDropdowns();
      closeSidebar();
    }
  });

  window.addEventListener("resize", function () {
    if (window.innerWidth >= 1024) {
      if (overlay) overlay.classList.remove("visible");
    }
  });
}

/* ═══════════════════════════════════════════════════════════════════
   INIT
═══════════════════════════════════════════════════════════════════ */
async function initialiseDashboard() {
  // Ensure DOM containers exist (trips, maintenance, fuel tables)
  ensureDomElementsExist();

  // Build nav highlight & user mock profiles
  buildSidebarNav();
  buildDashboardCards();
  buildNotificationsList();
  populateProfileData();

  // Attach all UI listeners
  attachEventListeners();

  // Start live clock
  updateClock();
  setInterval(updateClock, 1000);

  // Fetch API report data
  await refreshDashboard();

  // Start the 30 seconds auto refresh
  startAutoRefresh();
}

document.addEventListener("DOMContentLoaded", initialiseDashboard);

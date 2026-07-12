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
 *   - GET /api/reports/dashboard      → KPI cards
 *   - GET /api/reports/recent-trips   → Recent trips panel
 *   - GET /api/reports/recent-maintenance → Recent maintenance panel
 *   - GET /api/reports/recent-fuel    → Recent fuel panel
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
  { id: "nav-dashboard", label: "Dashboard", icon: "📊", href: "#dashboard" },
  { id: "nav-routes",    label: "Routes",    icon: "🛣️", href: "#routes"    },
  { id: "nav-vehicles",  label: "Vehicles",  icon: "🚌", href: "#vehicles"  },
  { id: "nav-drivers",   label: "Drivers",   icon: "👤", href: "#drivers"   },
  { id: "nav-dispatch",  label: "Dispatch",  icon: "📋", href: "#dispatch"  },
  { id: "nav-fuel",      label: "Fuel Logs", icon: "⛽", href: "#fuel"      },
  { id: "nav-reports",   label: "Reports",   icon: "📈", href: "#reports"   },
  { id: "nav-settings",  label: "Settings",  icon: "⚙️", href: "#settings"  },
];

/* ═══════════════════════════════════════════════════════════════════
   DOM REFERENCES — LAYOUT
═══════════════════════════════════════════════════════════════════ */
const sidebar          = document.getElementById("sidebar");
const sidebarToggleBtn = document.getElementById("sidebar-toggle");
const sidebarCloseBtn  = document.getElementById("sidebar-close");
const mainContent      = document.getElementById("main-content");
const overlay          = document.getElementById("sidebar-overlay");

const notifToggleBtn   = document.getElementById("notif-toggle");
const notifDropdown    = document.getElementById("notif-dropdown");
const notifBadge       = document.getElementById("notif-badge");
const notifList        = document.getElementById("notif-list");
const markAllReadBtn   = document.getElementById("mark-all-read");

const profileToggleBtn = document.getElementById("profile-toggle");
const profileDropdown  = document.getElementById("profile-dropdown");
const profileName      = document.getElementById("profile-name");
const profileRole      = document.getElementById("profile-role");
const profileAvatar    = document.getElementById("profile-avatar");

const navMenu          = document.getElementById("nav-menu");
const cardsContainer   = document.getElementById("dashboard-cards");
const logoutBtn        = document.getElementById("logout-btn");
const currentDateTime  = document.getElementById("current-datetime");
const pageTitle        = document.getElementById("page-title");

/* ═══════════════════════════════════════════════════════════════════
   DOM REFERENCES — API DATA PANELS
   These elements receive live data loaded from the report APIs.
═══════════════════════════════════════════════════════════════════ */
const dashErrorBanner   = document.getElementById("dash-error-banner");
const dashErrorMsg      = document.getElementById("dash-error-message");

// ── Recent Trips panel
const recentTripsBody   = document.getElementById("recent-trips-body");
const recentTripsEmpty  = document.getElementById("recent-trips-empty");

// ── Recent Maintenance panel
const recentMaintBody   = document.getElementById("recent-maint-body");
const recentMaintEmpty  = document.getElementById("recent-maint-empty");

// ── Recent Fuel panel
const recentFuelBody    = document.getElementById("recent-fuel-body");
const recentFuelEmpty   = document.getElementById("recent-fuel-empty");

// ── Last-refreshed timestamp display
const lastRefreshedEl   = document.getElementById("last-refreshed");

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
  if (!dashErrorBanner || !dashErrorMsg) return;

  dashErrorMsg.textContent = msg;
  dashErrorBanner.classList.add("visible");
  dashErrorBanner.classList.remove("hidden");

  // Auto-dismiss after 6 seconds
  setTimeout(function () {
    dashErrorBanner.classList.remove("visible");
  }, 6000);
}

/* ═══════════════════════════════════════════════════════════════════
   SHOW CARD LOADING STATE
   Fills every KPI card value with a loading indicator
   while the dashboard API request is in flight.
═══════════════════════════════════════════════════════════════════ */
function showCardsLoading() {
  // Find every rendered card value element and replace with spinner text
  DASHBOARD_CARDS.forEach(function (card) {
    const cardEl = document.getElementById(card.id);
    if (!cardEl) return;
    const valueEl = cardEl.querySelector(".card-value");
    if (valueEl) {
      valueEl.textContent = "…"; // loading indicator
      valueEl.classList.add("loading");
    }
  });
}

/* ═══════════════════════════════════════════════════════════════════
   LOAD DASHBOARD KPI CARDS
   Fetches summary metrics from GET /api/reports/dashboard and
   updates each KPI card with the real value from the API response.

   Expected response shape:
   {
     active_vehicles: 12,
     available_vehicles: 8,
     vehicles_in_maintenance: 3,
     active_trips: 5,
     pending_trips: 7,
     drivers_on_duty: 18,
     fleet_utilization: "72%"
   }

   If the backend is unavailable, cards show "--" and the error
   banner is displayed.
═══════════════════════════════════════════════════════════════════ */
async function loadDashboardCards() {
  // Show loading indicators in all cards before the request fires
  showCardsLoading();

  try {
    const response = await fetch(DASH_API_BASE + "/reports/dashboard");

    if (!response.ok) {
      throw new Error("Server returned status " + response.status);
    }

    // Parse the metrics object
    const data = await response.json();

    // Update each card's value element with the API-provided value
    DASHBOARD_CARDS.forEach(function (card) {
      const cardEl = document.getElementById(card.id);
      if (!cardEl) return;

      const valueEl = cardEl.querySelector(".card-value");
      if (!valueEl) return;

      // Read the matching key from the API response; fall back to "--"
      const rawValue = data[card.apiKey];
      valueEl.textContent = (rawValue !== null && rawValue !== undefined)
        ? String(rawValue)
        : "--";

      // Remove loading class now that real data is shown
      valueEl.classList.remove("loading");
    });

  } catch (error) {
    // Backend unavailable — set every card to "--"
    DASHBOARD_CARDS.forEach(function (card) {
      const cardEl = document.getElementById(card.id);
      if (!cardEl) return;
      const valueEl = cardEl.querySelector(".card-value");
      if (valueEl) {
        valueEl.textContent = "--";
        valueEl.classList.remove("loading");
      }
    });

    showDashError("Unable to connect to backend server.");
    console.error("[dashboard.js] loadDashboardCards error:", error);
  }
}

/* ═══════════════════════════════════════════════════════════════════
   SET TABLE LOADING ROW
   Inserts a single loading row spanning all columns into a
   table body element while an API request is in flight.

   @param {HTMLElement} tbody   — the <tbody> element to update
   @param {number}      colspan — number of columns to span
═══════════════════════════════════════════════════════════════════ */
function setTableLoading(tbody, colspan) {
  if (!tbody) return;
  tbody.innerHTML =
    '<tr><td colspan="' + colspan + '" class="table-loading">Loading...</td></tr>';
}

/* ═══════════════════════════════════════════════════════════════════
   LOAD RECENT TRIPS
   Fetches the latest trip records from GET /api/reports/recent-trips
   and renders them into the recent-trips panel.

   Expected response: Array of trip objects, each containing:
     trip_id, vehicle, driver, source, destination, status, start_date
═══════════════════════════════════════════════════════════════════ */
async function loadRecentTrips() {
  // Show loading row while the request is in flight
  setTableLoading(recentTripsBody, 6);

  try {
    const response = await fetch(DASH_API_BASE + "/reports/recent-trips");

    if (!response.ok) {
      throw new Error("Server returned status " + response.status);
    }

    const trips = await response.json();

    // Clear and render
    if (recentTripsBody) recentTripsBody.innerHTML = "";

    if (!trips || trips.length === 0) {
      // Show empty state
      if (recentTripsEmpty) {
        recentTripsEmpty.classList.remove("hidden");
        recentTripsEmpty.classList.add("visible");
      }
      return;
    }

    // Hide empty state when data is available
    if (recentTripsEmpty) {
      recentTripsEmpty.classList.add("hidden");
      recentTripsEmpty.classList.remove("visible");
    }

    // Build one row per trip
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
          '<span class="status-badge ' + statusClass + '">' +
            escapeHtml(trip.status) +
          "</span>" +
        "</td>";

      recentTripsBody.appendChild(tr);
    });

  } catch (error) {
    if (recentTripsBody) {
      recentTripsBody.innerHTML =
        '<tr><td colspan="6" class="table-error">Unable to load recent trips.</td></tr>';
    }
    console.error("[dashboard.js] loadRecentTrips error:", error);
  }
}

/* ═══════════════════════════════════════════════════════════════════
   LOAD RECENT MAINTENANCE
   Fetches the latest maintenance records from
   GET /api/reports/recent-maintenance and renders them.

   Expected response: Array of maintenance objects, each containing:
     maintenance_id, vehicle, maintenance_type,
     scheduled_date, status, technician
═══════════════════════════════════════════════════════════════════ */
async function loadRecentMaintenance() {
  // Show loading row while the request is in flight
  setTableLoading(recentMaintBody, 5);

  try {
    const response = await fetch(DASH_API_BASE + "/reports/recent-maintenance");

    if (!response.ok) {
      throw new Error("Server returned status " + response.status);
    }

    const records = await response.json();

    // Clear and render
    if (recentMaintBody) recentMaintBody.innerHTML = "";

    if (!records || records.length === 0) {
      // Show empty state
      if (recentMaintEmpty) {
        recentMaintEmpty.classList.remove("hidden");
        recentMaintEmpty.classList.add("visible");
      }
      return;
    }

    // Hide empty state when data is available
    if (recentMaintEmpty) {
      recentMaintEmpty.classList.add("hidden");
      recentMaintEmpty.classList.remove("visible");
    }

    // Build one row per maintenance record
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
          '<span class="status-badge ' + statusClass + '">' +
            escapeHtml(record.status) +
          "</span>" +
        "</td>";

      recentMaintBody.appendChild(tr);
    });

  } catch (error) {
    if (recentMaintBody) {
      recentMaintBody.innerHTML =
        '<tr><td colspan="5" class="table-error">Unable to load maintenance records.</td></tr>';
    }
    console.error("[dashboard.js] loadRecentMaintenance error:", error);
  }
}

/* ═══════════════════════════════════════════════════════════════════
   LOAD RECENT FUEL
   Fetches the latest fuel log entries from
   GET /api/reports/recent-fuel and renders them.

   Expected response: Array of fuel objects, each containing:
     fuel_id, vehicle, fuel_type, litres, cost, date
═══════════════════════════════════════════════════════════════════ */
async function loadRecentFuel() {
  // Show loading row while the request is in flight
  setTableLoading(recentFuelBody, 5);

  try {
    const response = await fetch(DASH_API_BASE + "/reports/recent-fuel");

    if (!response.ok) {
      throw new Error("Server returned status " + response.status);
    }

    const logs = await response.json();

    // Clear and render
    if (recentFuelBody) recentFuelBody.innerHTML = "";

    if (!logs || logs.length === 0) {
      // Show empty state
      if (recentFuelEmpty) {
        recentFuelEmpty.classList.remove("hidden");
        recentFuelEmpty.classList.add("visible");
      }
      return;
    }

    // Hide empty state when data is available
    if (recentFuelEmpty) {
      recentFuelEmpty.classList.add("hidden");
      recentFuelEmpty.classList.remove("visible");
    }

    // Build one row per fuel log
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
        '<tr><td colspan="5" class="table-error">Unable to load fuel logs.</td></tr>';
    }
    console.error("[dashboard.js] loadRecentFuel error:", error);
  }
}

/* ═══════════════════════════════════════════════════════════════════
   REFRESH ALL DASHBOARD DATA
   Fetches all four API endpoints concurrently.
   Called on initial load and every 30 seconds by the auto-refresh
   interval.  Also updates the "Last refreshed" timestamp.
═══════════════════════════════════════════════════════════════════ */
async function refreshDashboard() {
  // Fetch all four data sources in parallel — none blocks another
  await Promise.all([
    loadDashboardCards(),
    loadRecentTrips(),
    loadRecentMaintenance(),
    loadRecentFuel(),
  ]);

  // Update the "last refreshed" display with the current time
  updateLastRefreshed();
}

/* ═══════════════════════════════════════════════════════════════════
   UPDATE LAST REFRESHED
   Writes the current time into the "last-refreshed" element so
   the user knows when the data was last fetched.
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
   Sets up a repeating interval that calls refreshDashboard()
   every REFRESH_INTERVAL_MS milliseconds (30 seconds).
   Stores the interval id so it can be cleared if needed.
═══════════════════════════════════════════════════════════════════ */
function startAutoRefresh() {
  // Clear any existing interval before starting a new one
  if (refreshIntervalId !== null) {
    clearInterval(refreshIntervalId);
  }

  refreshIntervalId = setInterval(function () {
    refreshDashboard();
  }, REFRESH_INTERVAL_MS);
}

/* ═══════════════════════════════════════════════════════════════════
   ████████████████████████████████████████████████████████████████
   UI — SIDEBAR (preserved from original)
   ████████████████████████████████████████████████████████████████
═══════════════════════════════════════════════════════════════════ */

/* ═══════════════════════════════════════════════════════════════════
   SIDEBAR — OPEN
   Opens the sidebar by adding the "open" CSS class.
   Also shows the overlay for mobile backdrop.
═══════════════════════════════════════════════════════════════════ */
function openSidebar() {
  if (!sidebar) return;

  // Add "open" class — CSS handles the slide-in animation
  sidebar.classList.add("open");
  sidebar.classList.remove("collapsed");

  // Show the overlay backdrop on mobile screens
  if (overlay) {
    overlay.classList.add("visible");
  }

  // Update aria-expanded attribute for accessibility
  if (sidebarToggleBtn) {
    sidebarToggleBtn.setAttribute("aria-expanded", "true");
  }

  // Shift main content to the right on desktop (if layout uses margin)
  if (mainContent) {
    mainContent.classList.add("sidebar-open");
  }
}

/* ═══════════════════════════════════════════════════════════════════
   SIDEBAR — CLOSE
   Closes the sidebar by removing the "open" CSS class.
   Also hides the overlay.
═══════════════════════════════════════════════════════════════════ */
function closeSidebar() {
  if (!sidebar) return;

  // Remove "open" class — CSS handles the slide-out animation
  sidebar.classList.remove("open");
  sidebar.classList.add("collapsed");

  // Hide the overlay backdrop
  if (overlay) {
    overlay.classList.remove("visible");
  }

  // Update aria-expanded for accessibility
  if (sidebarToggleBtn) {
    sidebarToggleBtn.setAttribute("aria-expanded", "false");
  }

  // Remove the shifted main content class
  if (mainContent) {
    mainContent.classList.remove("sidebar-open");
  }
}

/* ═══════════════════════════════════════════════════════════════════
   SIDEBAR — TOGGLE
   Checks whether the sidebar is currently open and
   toggles to the opposite state.
═══════════════════════════════════════════════════════════════════ */
function toggleSidebar() {
  if (!sidebar) return;

  // Determine current state from CSS class
  const isOpen = sidebar.classList.contains("open");

  // Toggle accordingly
  if (isOpen) {
    closeSidebar();
  } else {
    openSidebar();
  }
}

/* ═══════════════════════════════════════════════════════════════════
   SIDEBAR — SET ACTIVE MENU ITEM
   Removes "active" class from all nav items, then adds it
   to the clicked item. Also updates the page title.
   @param {string} navId — the id of the nav item to activate
   @param {string} label — the label to display as page title
═══════════════════════════════════════════════════════════════════ */
function setActiveNavItem(navId, label) {
  // Find all nav link elements inside the sidebar
  const allNavLinks = document.querySelectorAll(".nav-item");

  // Remove "active" from every nav item
  allNavLinks.forEach(function (link) {
    link.classList.remove("active");
    link.removeAttribute("aria-current"); // clear aria state
  });

  // Add "active" to the clicked nav item by its id
  const activeLink = document.getElementById(navId);
  if (activeLink) {
    activeLink.classList.add("active");
    activeLink.setAttribute("aria-current", "page"); // set aria state
  }

  // Update the page title heading to reflect the active section
  if (pageTitle) {
    pageTitle.textContent = label;
  }
}

/* ═══════════════════════════════════════════════════════════════════
   BUILD SIDEBAR NAV
   Dynamically builds navigation list items from NAV_ITEMS data.
   Attaches click listeners for active state management.
═══════════════════════════════════════════════════════════════════ */
function buildSidebarNav() {
  if (!navMenu) return;

  // Clear any existing nav items before rebuilding
  navMenu.innerHTML = "";

  // Loop through NAV_ITEMS data array and create each nav link
  NAV_ITEMS.forEach(function (item) {
    // Create the list item wrapper
    const li = document.createElement("li");

    // Create the anchor link element
    const a = document.createElement("a");
    a.id        = item.id;
    a.href      = item.href;
    a.className = "nav-item";
    a.setAttribute("role", "menuitem");

    // Build inner HTML: icon span + label span
    a.innerHTML =
      '<span class="nav-icon" aria-hidden="true">' + item.icon + '</span>' +
      '<span class="nav-label">' + item.label + '</span>';

    // Click listener: set this item as active, close sidebar on mobile
    a.addEventListener("click", function (e) {
      e.preventDefault(); // prevent page anchor jump

      // Mark this item as active and update page title
      setActiveNavItem(item.id, item.label);

      // On small screens, auto-close sidebar after nav selection
      if (window.innerWidth < 768) {
        closeSidebar();
      }
    });

    // Append link into list item, then into nav menu
    li.appendChild(a);
    navMenu.appendChild(li);
  });

  // Set "Dashboard" as the default active item on load
  setActiveNavItem("nav-dashboard", "Dashboard");
}

/* ═══════════════════════════════════════════════════════════════════
   ████████████████████████████████████████████████████████████████
   UI — NOTIFICATIONS (preserved from original)
   ████████████████████████████████████████████████████████████████
═══════════════════════════════════════════════════════════════════ */

/* ═══════════════════════════════════════════════════════════════════
   NOTIFICATION DROPDOWN — TOGGLE
   Opens or closes the notification dropdown panel.
   Closes the profile dropdown if it is also open.
═══════════════════════════════════════════════════════════════════ */
function toggleNotificationDropdown() {
  if (!notifDropdown) return;

  // Check current state
  const isOpen = notifDropdown.classList.contains("open");

  // Always close the profile dropdown first (only one open at a time)
  closeProfileDropdown();

  if (isOpen) {
    // Close notification dropdown
    notifDropdown.classList.remove("open");
    if (notifToggleBtn) notifToggleBtn.setAttribute("aria-expanded", "false");
  } else {
    // Open notification dropdown
    notifDropdown.classList.add("open");
    if (notifToggleBtn) notifToggleBtn.setAttribute("aria-expanded", "true");
  }
}

/* ═══════════════════════════════════════════════════════════════════
   NOTIFICATION DROPDOWN — CLOSE
   Explicitly closes the notification dropdown.
═══════════════════════════════════════════════════════════════════ */
function closeNotificationDropdown() {
  if (!notifDropdown) return;

  // Remove "open" class to trigger CSS hide animation
  notifDropdown.classList.remove("open");

  if (notifToggleBtn) {
    notifToggleBtn.setAttribute("aria-expanded", "false");
  }
}

/* ═══════════════════════════════════════════════════════════════════
   BUILD NOTIFICATIONS LIST
   Renders notification items from NOTIFICATIONS array into the
   notification dropdown list container.
═══════════════════════════════════════════════════════════════════ */
function buildNotificationsList() {
  if (!notifList) return;

  // Clear existing notification items
  notifList.innerHTML = "";

  // Count unread notifications for the badge
  let unreadCount = 0;

  // Loop through each notification and build DOM elements
  NOTIFICATIONS.forEach(function (notif) {
    // Create notification item container
    const item = document.createElement("div");
    item.className = "notif-item" + (notif.unread ? " unread" : "");
    item.id = notif.id;
    item.setAttribute("role", "listitem");

    // Build notification inner content
    item.innerHTML =
      '<span class="notif-icon" aria-hidden="true">' + notif.icon + '</span>' +
      '<div class="notif-body">' +
        '<p class="notif-title">' + notif.title + '</p>' +
        '<p class="notif-message">' + notif.message + '</p>' +
        '<span class="notif-time">' + notif.time + '</span>' +
      '</div>' +
      (notif.unread ? '<span class="notif-dot" aria-label="Unread"></span>' : '');

    // Click listener: mark individual notification as read
    item.addEventListener("click", function () {
      markNotificationRead(notif.id, item);
    });

    notifList.appendChild(item);

    // Count unread for badge
    if (notif.unread) unreadCount++;
  });

  // Update the notification badge count
  updateNotifBadge(unreadCount);
}

/* ═══════════════════════════════════════════════════════════════════
   UPDATE NOTIFICATION BADGE
   Shows or hides the red badge and updates its count.
   @param {number} count — number of unread notifications
═══════════════════════════════════════════════════════════════════ */
function updateNotifBadge(count) {
  if (!notifBadge) return;

  if (count > 0) {
    // Show badge with count (max display: "9+")
    notifBadge.textContent = count > 9 ? "9+" : String(count);
    notifBadge.classList.remove("hidden");
  } else {
    // Hide badge when no unread notifications remain
    notifBadge.textContent = "";
    notifBadge.classList.add("hidden");
  }
}

/* ═══════════════════════════════════════════════════════════════════
   MARK NOTIFICATION AS READ
   Removes the "unread" class from a notification item and
   decrements the badge counter.
   @param {string}      notifId — the id of the notification
   @param {HTMLElement} itemEl  — the notification DOM element
═══════════════════════════════════════════════════════════════════ */
function markNotificationRead(notifId, itemEl) {
  // Find the notification in data array
  const notif = NOTIFICATIONS.find(function (n) { return n.id === notifId; });

  if (!notif || !notif.unread) return; // already read, nothing to do

  // Mark as read in data
  notif.unread = false;

  // Remove "unread" CSS class from element
  if (itemEl) {
    itemEl.classList.remove("unread");
    // Remove the unread dot indicator
    const dot = itemEl.querySelector(".notif-dot");
    if (dot) dot.remove();
  }

  // Recalculate unread count and update badge
  const unreadCount = NOTIFICATIONS.filter(function (n) { return n.unread; }).length;
  updateNotifBadge(unreadCount);
}

/* ═══════════════════════════════════════════════════════════════════
   MARK ALL NOTIFICATIONS AS READ
   Sets all notifications to read state and updates the UI.
═══════════════════════════════════════════════════════════════════ */
function markAllNotificationsRead() {
  // Mark all as read in the data array
  NOTIFICATIONS.forEach(function (notif) {
    notif.unread = false;
  });

  // Remove "unread" class and dot from all rendered items
  if (notifList) {
    const unreadItems = notifList.querySelectorAll(".notif-item.unread");
    unreadItems.forEach(function (item) {
      item.classList.remove("unread");
      const dot = item.querySelector(".notif-dot");
      if (dot) dot.remove();
    });
  }

  // Set badge to zero (hidden)
  updateNotifBadge(0);
}

/* ═══════════════════════════════════════════════════════════════════
   ████████████████████████████████████████████████████████████████
   UI — PROFILE (preserved from original)
   ████████████████████████████████████████████████████████████████
═══════════════════════════════════════════════════════════════════ */

/* ═══════════════════════════════════════════════════════════════════
   PROFILE DROPDOWN — TOGGLE
   Opens or closes the profile dropdown panel.
   Closes the notification dropdown if it is also open.
═══════════════════════════════════════════════════════════════════ */
function toggleProfileDropdown() {
  if (!profileDropdown) return;

  // Check current state
  const isOpen = profileDropdown.classList.contains("open");

  // Always close notification dropdown first
  closeNotificationDropdown();

  if (isOpen) {
    // Close profile dropdown
    profileDropdown.classList.remove("open");
    if (profileToggleBtn) profileToggleBtn.setAttribute("aria-expanded", "false");
  } else {
    // Open profile dropdown
    profileDropdown.classList.add("open");
    if (profileToggleBtn) profileToggleBtn.setAttribute("aria-expanded", "true");
  }
}

/* ═══════════════════════════════════════════════════════════════════
   PROFILE DROPDOWN — CLOSE
   Explicitly closes the profile dropdown.
═══════════════════════════════════════════════════════════════════ */
function closeProfileDropdown() {
  if (!profileDropdown) return;

  // Remove "open" class to hide dropdown via CSS
  profileDropdown.classList.remove("open");

  if (profileToggleBtn) {
    profileToggleBtn.setAttribute("aria-expanded", "false");
  }
}

/* ═══════════════════════════════════════════════════════════════════
   POPULATE PROFILE DATA
   Inserts current user info from CURRENT_USER into the profile
   dropdown and header display elements.
═══════════════════════════════════════════════════════════════════ */
function populateProfileData() {
  // Set avatar initials in all avatar elements
  const avatarEls = document.querySelectorAll(".profile-avatar, #profile-avatar");
  avatarEls.forEach(function (el) {
    el.textContent = CURRENT_USER.avatar;
  });

  // Set user name elements
  if (profileName) {
    profileName.textContent = CURRENT_USER.name;
  }

  // Set user role elements
  if (profileRole) {
    profileRole.textContent = CURRENT_USER.role;
  }

  // Fill any header username display
  const headerNameEl = document.getElementById("header-username");
  if (headerNameEl) {
    headerNameEl.textContent = CURRENT_USER.name;
  }

  // Fill email display inside profile dropdown
  const profileEmailEl = document.getElementById("profile-email");
  if (profileEmailEl) {
    profileEmailEl.textContent = CURRENT_USER.email;
  }
}

/* ═══════════════════════════════════════════════════════════════════
   ████████████████████████████████████████████████████████████████
   UI — KPI CARD SCAFFOLDING
   Builds the card DOM structure first (with "--" values).
   Real values are filled in by loadDashboardCards().
   ████████████████████████████████████████████████████████████████
═══════════════════════════════════════════════════════════════════ */

/* ═══════════════════════════════════════════════════════════════════
   BUILD DASHBOARD CARDS
   Renders KPI card shells from DASHBOARD_CARDS definitions.
   Each card starts with "--" as the value; loadDashboardCards()
   replaces those with real API data immediately after.
═══════════════════════════════════════════════════════════════════ */
function buildDashboardCards() {
  if (!cardsContainer) return;

  // Clear any static placeholder cards
  cardsContainer.innerHTML = "";

  // Loop through each card definition and create the card element
  DASHBOARD_CARDS.forEach(function (card) {
    // Create card wrapper div
    const cardEl = document.createElement("div");
    cardEl.className = "dashboard-card card-" + card.color;
    cardEl.id = card.id;

    // Build card inner HTML — value starts as "--"
    cardEl.innerHTML =
      '<div class="card-header">' +
        '<span class="card-icon" aria-hidden="true">' + card.icon + '</span>' +
        '<h3 class="card-title">' + card.title + '</h3>' +
      '</div>' +
      '<div class="card-body">' +
        '<p class="card-value">--</p>' +
      '</div>';

    // Add hover lift effect via class — animation defined in CSS
    cardEl.addEventListener("mouseenter", function () {
      cardEl.classList.add("hovered");
    });
    cardEl.addEventListener("mouseleave", function () {
      cardEl.classList.remove("hovered");
    });

    cardsContainer.appendChild(cardEl);
  });
}

/* ═══════════════════════════════════════════════════════════════════
   ████████████████████████████████████████████████████████████████
   UI — UTILITY (preserved from original)
   ████████████████████████████████████████████████████████████████
═══════════════════════════════════════════════════════════════════ */

/* ═══════════════════════════════════════════════════════════════════
   CLOSE ALL DROPDOWNS
   Utility to close every open dropdown at once.
   Used when clicking outside any dropdown area.
═══════════════════════════════════════════════════════════════════ */
function closeAllDropdowns() {
  closeNotificationDropdown();
  closeProfileDropdown();
}

/* ═══════════════════════════════════════════════════════════════════
   GLOBAL CLICK OUTSIDE LISTENER
   Closes any open dropdown when the user clicks outside of it.
   @param {MouseEvent} e — the document click event
═══════════════════════════════════════════════════════════════════ */
function handleDocumentClick(e) {
  // ── Notification dropdown ──────────────────────
  // Check if click was outside both the toggle button and the dropdown
  if (
    notifDropdown &&
    notifToggleBtn &&
    !notifDropdown.contains(e.target) &&
    !notifToggleBtn.contains(e.target)
  ) {
    closeNotificationDropdown();
  }

  // ── Profile dropdown ───────────────────────────
  // Check if click was outside both the profile toggle and dropdown
  if (
    profileDropdown &&
    profileToggleBtn &&
    !profileDropdown.contains(e.target) &&
    !profileToggleBtn.contains(e.target)
  ) {
    closeProfileDropdown();
  }

  // ── Sidebar (mobile) ───────────────────────────
  // Close sidebar when clicking the overlay backdrop
  if (overlay && e.target === overlay) {
    closeSidebar();
  }
}

/* ═══════════════════════════════════════════════════════════════════
   LIVE CLOCK
   Updates the current date and time display every second.
═══════════════════════════════════════════════════════════════════ */
function updateClock() {
  if (!currentDateTime) return;

  const now = new Date();

  // Format: "Saturday, 12 Jul 2026  09:39 AM"
  const options = {
    weekday : "long",
    year    : "numeric",
    month   : "short",
    day     : "numeric",
    hour    : "2-digit",
    minute  : "2-digit",
    hour12  : true,
  };

  // Use browser locale formatting
  currentDateTime.textContent = now.toLocaleString("en-IN", options);
}

/* ═══════════════════════════════════════════════════════════════════
   LOGOUT
   Redirects to the login page.
   No authentication logic — purely navigational.
═══════════════════════════════════════════════════════════════════ */
function handleLogout() {
  // Close the profile dropdown first
  closeProfileDropdown();

  // Redirect to login page (no auth logic, no storage clearing)
  window.location.href = "index.html";
}

/* ═══════════════════════════════════════════════════════════════════
   ████████████████████████████████████████████████████████████████
   HELPER FUNCTIONS
   Shared formatters and escape utilities for table rendering.
   ████████████████████████████████████████████████████████████████
═══════════════════════════════════════════════════════════════════ */

/* ═══════════════════════════════════════════════════════════════════
   HELPER — formatDate
   Converts an ISO-8601 date string into a human-readable display.

   @param  {string} dateStr — e.g. "2026-07-12T00:00:00Z"
   @returns {string}         — e.g. "12 Jul 2026" or "—" if invalid
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

/* ═══════════════════════════════════════════════════════════════════
   HELPER — formatCurrency
   Formats a numeric value as INR currency.

   @param  {number} value — monetary value
   @returns {string} formatted string or "—" if invalid
═══════════════════════════════════════════════════════════════════ */
function formatCurrency(value) {
  if (value === null || value === undefined || isNaN(Number(value))) return "—";

  return Number(value).toLocaleString("en-IN", {
    style                : "currency",
    currency             : "INR",
    maximumFractionDigits: 0,
  });
}

/* ═══════════════════════════════════════════════════════════════════
   HELPER — escapeHtml
   Escapes special HTML characters to prevent XSS when inserting
   API data into innerHTML.

   @param  {string|number} str — raw value from the API
   @returns {string} HTML-safe string
═══════════════════════════════════════════════════════════════════ */
function escapeHtml(str) {
  if (!str && str !== 0) return "";
  return String(str)
    .replace(/&/g,  "&amp;")
    .replace(/</g,  "&lt;")
    .replace(/>/g,  "&gt;")
    .replace(/"/g,  "&quot;")
    .replace(/'/g,  "&#39;");
}

/* ═══════════════════════════════════════════════════════════════════
   HELPER — getTripStatusClass
   Maps a trip status string to a CSS badge class.

   @param  {string} status — e.g. "Scheduled", "In Progress"
   @returns {string} CSS class name
═══════════════════════════════════════════════════════════════════ */
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

/* ═══════════════════════════════════════════════════════════════════
   HELPER — getMaintStatusClass
   Maps a maintenance status string to a CSS badge class.

   @param  {string} status — e.g. "Scheduled", "Completed"
   @returns {string} CSS class name
═══════════════════════════════════════════════════════════════════ */
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
   ████████████████████████████████████████████████████████████████
   EVENT LISTENERS
   ████████████████████████████████████████████████████████████████
═══════════════════════════════════════════════════════════════════ */

/* ═══════════════════════════════════════════════════════════════════
   ATTACH EVENT LISTENERS
   Wires all interactive elements to their handler functions.
   Preserved from the original file with no changes.
═══════════════════════════════════════════════════════════════════ */
function attachEventListeners() {
  // ── Sidebar toggle button (hamburger icon in header)
  if (sidebarToggleBtn) {
    sidebarToggleBtn.addEventListener("click", toggleSidebar);
  }

  // ── Sidebar close button (X button inside sidebar)
  if (sidebarCloseBtn) {
    sidebarCloseBtn.addEventListener("click", closeSidebar);
  }

  // ── Overlay click closes sidebar on mobile
  if (overlay) {
    overlay.addEventListener("click", closeSidebar);
  }

  // ── Notification bell icon toggle
  if (notifToggleBtn) {
    notifToggleBtn.addEventListener("click", function (e) {
      e.stopPropagation(); // prevent document click from immediately closing
      toggleNotificationDropdown();
    });
  }

  // ── Mark all notifications as read button
  if (markAllReadBtn) {
    markAllReadBtn.addEventListener("click", function (e) {
      e.stopPropagation(); // keep dropdown open after clicking
      markAllNotificationsRead();
    });
  }

  // ── Profile avatar/name toggle
  if (profileToggleBtn) {
    profileToggleBtn.addEventListener("click", function (e) {
      e.stopPropagation(); // prevent document click from immediately closing
      toggleProfileDropdown();
    });
  }

  // ── Logout button inside profile dropdown
  if (logoutBtn) {
    logoutBtn.addEventListener("click", handleLogout);
  }

  // ── Global click listener: close dropdowns when clicking outside
  document.addEventListener("click", handleDocumentClick);

  // ── Keyboard: close dropdowns and sidebar on Escape key
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") {
      closeAllDropdowns();
      closeSidebar();
    }
  });

  // ── Window resize: auto-close sidebar overlay on desktop
  window.addEventListener("resize", function () {
    if (window.innerWidth >= 1024) {
      if (overlay) overlay.classList.remove("visible");
    }
  });
}

/* ═══════════════════════════════════════════════════════════════════
   ████████████████████████████████████████████████████████████████
   INIT
   ████████████████████████████████████████████████████████████████
═══════════════════════════════════════════════════════════════════ */

/* ═══════════════════════════════════════════════════════════════════
   INIT — initialiseDashboard
   Orchestrates all build, setup, and API fetch functions.
   Order:
   1. Build static UI (sidebar, cards scaffold, notifications, profile)
   2. Attach event listeners
   3. Start live clock
   4. Fetch all API data (initial load)
   5. Start 30-second auto-refresh
═══════════════════════════════════════════════════════════════════ */
async function initialiseDashboard() {
  // ── Step 1: Build static UI elements ──────────────────────────
  buildSidebarNav();         // render sidebar navigation links
  buildDashboardCards();     // render KPI card shells with "--" values
  buildNotificationsList();  // render notification dropdown items
  populateProfileData();     // fill profile name, role, avatar

  // ── Step 2: Attach all interactive event listeners ─────────────
  attachEventListeners();

  // ── Step 3: Start the live clock (updates every second) ────────
  updateClock();
  setInterval(updateClock, 1000);

  // ── Step 4: Open sidebar by default on large screens ──────────
  if (window.innerWidth >= 1024) {
    openSidebar();
  }

  // ── Step 5: Fetch all API data on initial load ─────────────────
  await refreshDashboard();

  // ── Step 6: Start the 30-second auto-refresh interval ─────────
  startAutoRefresh();
}

// Run when the DOM is fully parsed and ready
document.addEventListener("DOMContentLoaded", initialiseDashboard);

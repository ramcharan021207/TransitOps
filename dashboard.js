/**
 * dashboard.js — TransitOps ERP
 * Handles sidebar navigation, dropdowns, and dashboard card data.
 * No backend. No fetch API. No localStorage. No authentication logic.
 * Pure frontend behaviour only.
 */

/* ═══════════════════════════════════════════════════════════════════
   DUMMY DATA
   All data is hardcoded. No API calls, no backend, no storage.
═══════════════════════════════════════════════════════════════════ */

/* ─── Dashboard KPI Cards Data ────────────────────────────────── */
const DASHBOARD_CARDS = [
  {
    id: "card-total-routes",
    title: "Total Routes",
    value: "128",
    change: "+4 this week",
    trend: "up",
    icon: "🛣️",
    color: "blue",
  },
  {
    id: "card-active-vehicles",
    title: "Active Vehicles",
    value: "74",
    change: "-2 from yesterday",
    trend: "down",
    icon: "🚌",
    color: "green",
  },
  {
    id: "card-on-time-rate",
    title: "On-Time Rate",
    value: "92.3%",
    change: "+1.2% this month",
    trend: "up",
    icon: "⏱️",
    color: "purple",
  },
  {
    id: "card-fuel-usage",
    title: "Fuel Usage (L)",
    value: "8,450",
    change: "+320 from last week",
    trend: "down",
    icon: "⛽",
    color: "orange",
  },
  {
    id: "card-incidents",
    title: "Incidents",
    value: "3",
    change: "-1 since last month",
    trend: "up",
    icon: "⚠️",
    color: "red",
  },
  {
    id: "card-drivers-active",
    title: "Active Drivers",
    value: "61",
    change: "+5 this week",
    trend: "up",
    icon: "👤",
    color: "teal",
  },
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
  avatar: "AJ",          // Initials for avatar placeholder
  status: "Online",
};

/* ─── Sidebar Navigation Items ─────────────────────────────────── */
const NAV_ITEMS = [
  { id: "nav-dashboard",   label: "Dashboard",    icon: "📊", href: "#dashboard"  },
  { id: "nav-routes",      label: "Routes",       icon: "🛣️", href: "#routes"     },
  { id: "nav-vehicles",    label: "Vehicles",     icon: "🚌", href: "#vehicles"   },
  { id: "nav-drivers",     label: "Drivers",      icon: "👤", href: "#drivers"    },
  { id: "nav-dispatch",    label: "Dispatch",     icon: "📋", href: "#dispatch"   },
  { id: "nav-fuel",        label: "Fuel Logs",    icon: "⛽", href: "#fuel"       },
  { id: "nav-reports",     label: "Reports",      icon: "📈", href: "#reports"    },
  { id: "nav-settings",    label: "Settings",     icon: "⚙️", href: "#settings"   },
];

/* ═══════════════════════════════════════════════════════════════════
   DOM REFERENCES
   All element references for the dashboard layout.
═══════════════════════════════════════════════════════════════════ */
const sidebar            = document.getElementById("sidebar");
const sidebarToggleBtn   = document.getElementById("sidebar-toggle");
const sidebarCloseBtn    = document.getElementById("sidebar-close");
const mainContent        = document.getElementById("main-content");
const overlay            = document.getElementById("sidebar-overlay");

const notifToggleBtn     = document.getElementById("notif-toggle");
const notifDropdown      = document.getElementById("notif-dropdown");
const notifBadge         = document.getElementById("notif-badge");
const notifList          = document.getElementById("notif-list");
const markAllReadBtn     = document.getElementById("mark-all-read");

const profileToggleBtn   = document.getElementById("profile-toggle");
const profileDropdown    = document.getElementById("profile-dropdown");
const profileName        = document.getElementById("profile-name");
const profileRole        = document.getElementById("profile-role");
const profileAvatar      = document.getElementById("profile-avatar");

const navMenu            = document.getElementById("nav-menu");
const cardsContainer     = document.getElementById("dashboard-cards");
const logoutBtn          = document.getElementById("logout-btn");
const currentDateTime    = document.getElementById("current-datetime");
const pageTitle          = document.getElementById("page-title");

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
    a.id        = item.id;           // assign id for active state targeting
    a.href      = item.href;         // anchor link (no-reload navigation)
    a.className = "nav-item";        // base CSS class for styling
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
   NOTIFICATION DROPDOWN — TOGGLE
   Opens or closes the notification dropdown panel.
   Closes the profile dropdown if it's also open.
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
   PROFILE DROPDOWN — TOGGLE
   Opens or closes the profile dropdown panel.
   Closes the notification dropdown if it's also open.
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
   Inserts current user info from CURRENT_USER into
   the profile dropdown and header display elements.
═══════════════════════════════════════════════════════════════════ */
function populateProfileData() {
  // Set avatar initials in all avatar elements
  const avatarEls = document.querySelectorAll(".profile-avatar, #profile-avatar");
  avatarEls.forEach(function (el) {
    el.textContent = CURRENT_USER.avatar; // show initials
  });

  // Set user name elements
  if (profileName) {
    profileName.textContent = CURRENT_USER.name;
  }

  // Set user role elements
  if (profileRole) {
    profileRole.textContent = CURRENT_USER.role;
  }

  // Also fill any header username display
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
   BUILD DASHBOARD CARDS
   Renders KPI summary cards from DASHBOARD_CARDS data into the
   cards container element.
═══════════════════════════════════════════════════════════════════ */
function buildDashboardCards() {
  if (!cardsContainer) return;

  // Clear any static placeholder cards
  cardsContainer.innerHTML = "";

  // Loop through each card data object and create the card element
  DASHBOARD_CARDS.forEach(function (card) {
    // Create card wrapper div
    const cardEl = document.createElement("div");
    cardEl.className = "dashboard-card card-" + card.color; // color class for CSS
    cardEl.id = card.id;

    // Determine trend arrow direction indicator
    const trendArrow = card.trend === "up" ? "▲" : "▼";
    const trendClass = card.trend === "up" ? "trend-up" : "trend-down";

    // Build card inner HTML structure
    cardEl.innerHTML =
      '<div class="card-header">' +
        '<span class="card-icon" aria-hidden="true">' + card.icon + '</span>' +
        '<h3 class="card-title">' + card.title + '</h3>' +
      '</div>' +
      '<div class="card-body">' +
        '<p class="card-value">' + card.value + '</p>' +
        '<p class="card-change ' + trendClass + '">' +
          '<span class="trend-arrow" aria-hidden="true">' + trendArrow + '</span> ' +
          card.change +
        '</p>' +
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
    weekday: "long",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  };

  // Use browser locale formatting
  currentDateTime.textContent = now.toLocaleString("en-IN", options);
}

/* ═══════════════════════════════════════════════════════════════════
   LOGOUT
   Clears any form state and redirects to login page.
   No authentication logic — purely navigational.
═══════════════════════════════════════════════════════════════════ */
function handleLogout() {
  // Close the profile dropdown first
  closeProfileDropdown();

  // Redirect to login page (no auth logic, no storage clearing)
  window.location.href = "index.html";
}

/* ═══════════════════════════════════════════════════════════════════
   ATTACH EVENT LISTENERS
   Wires all interactive elements to their handler functions.
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

  // ── Window resize: auto-close sidebar on desktop resize
  window.addEventListener("resize", function () {
    // On large screens, sidebar is always visible — ensure clean state
    if (window.innerWidth >= 1024) {
      if (overlay) overlay.classList.remove("visible");
    }
  });
}

/* ═══════════════════════════════════════════════════════════════════
   INIT — DASHBOARD INITIALISE
   Orchestrates all build and setup functions on DOM ready.
═══════════════════════════════════════════════════════════════════ */
function initialiseDashboard() {
  // Build sidebar navigation items from data
  buildSidebarNav();

  // Render KPI cards from dummy data
  buildDashboardCards();

  // Render notifications list and set badge count
  buildNotificationsList();

  // Populate user profile data into header and dropdown
  populateProfileData();

  // Attach all event listeners
  attachEventListeners();

  // Start the live clock and update every second
  updateClock();
  setInterval(updateClock, 1000);

  // Open sidebar by default on large screens (desktop layout)
  if (window.innerWidth >= 1024) {
    openSidebar();
  }
}

// Run dashboard initialisation when the DOM is fully loaded
document.addEventListener("DOMContentLoaded", initialiseDashboard);

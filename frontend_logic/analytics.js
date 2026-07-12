/**
 * analytics.js — TransitOps ERP
 * Handles the Fleet Analytics dashboard and reports.
 * Computes metrics on-the-fly from CRUD APIs as a fallback if the reports API is unavailable.
 *
 * Responsibilities:
 *   - Fetch summary dashboard data or compute it from vehicles/drivers/trips
 *   - Render graphs/progress bars for fleet utilization, fuel, and maintenance costs
 *   - Display safety score averages
 *
 * Rules:
 *   - Fetch API only (async / await / try-catch)
 *   - Friendly error handling + toasts + loading overlay
 */

"use strict";

/* ═══════════════════════════════════════════════════════════════════
   API BASE PATH
═══════════════════════════════════════════════════════════════════ */
const ANALYTICS_API_BASE = "/api";

/* ═══════════════════════════════════════════════════════════════════
   DOM REFERENCES
═══════════════════════════════════════════════════════════════════ */
let analyticsViewContainer = null;
let loadingOverlay = null;

/**
 * Initialize DOM structure for Analytics View
 * Injects structure dynamically to ensure it displays perfectly.
 */
function ensureAnalyticsLayoutExists() {
  analyticsViewContainer = document.querySelector(".dashboard-view") || document.body;
  if (!analyticsViewContainer) return;

  // Render analytics report widgets dynamically
  let analyticsGrid = document.getElementById("analytics-grid");
  if (!analyticsGrid) {
    analyticsGrid = document.createElement("div");
    analyticsGrid.id = "analytics-grid";
    analyticsGrid.style.cssText = "display: flex; flex-direction: column; gap: 2rem; margin-top: 2rem;";

    analyticsGrid.innerHTML = `
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 1.5rem;">
        <!-- Utilization Widget -->
        <div style="background: var(--surface); padding: 1.5rem; border-radius: 8px; border: 1px solid var(--border);">
          <h3 style="font-size: 1rem; color: var(--text-secondary); margin-bottom: 1rem; text-transform: uppercase;">Fleet Utilization</h3>
          <div style="font-size: 2rem; font-weight: 700; color: var(--success);" id="stat-utilization">--%</div>
          <div style="background: rgba(255,255,255,0.05); height: 8px; border-radius: 4px; margin-top: 1rem; overflow: hidden;">
            <div id="bar-utilization" style="background: var(--success); width: 0%; height: 100%; transition: width 0.6s ease;"></div>
          </div>
        </div>

        <!-- Maintenance Costs Widget -->
        <div style="background: var(--surface); padding: 1.5rem; border-radius: 8px; border: 1px solid var(--border);">
          <h3 style="font-size: 1rem; color: var(--text-secondary); margin-bottom: 1rem; text-transform: uppercase;">Total Maintenance Cost</h3>
          <div style="font-size: 2rem; font-weight: 700; color: var(--primary);" id="stat-maint-cost">₹0</div>
          <p style="font-size: 0.85rem; color: var(--text-secondary); margin-top: 0.5rem;" id="stat-maint-count">0 maintenance tasks completed</p>
        </div>

        <!-- Fuel Metrics Widget -->
        <div style="background: var(--surface); padding: 1.5rem; border-radius: 8px; border: 1px solid var(--border);">
          <h3 style="font-size: 1rem; color: var(--text-secondary); margin-bottom: 1rem; text-transform: uppercase;">Fuel Expenditure</h3>
          <div style="font-size: 2rem; font-weight: 700; color: #3b82f6;" id="stat-fuel-cost">₹0</div>
          <p style="font-size: 0.85rem; color: var(--text-secondary); margin-top: 0.5rem;" id="stat-fuel-litres">0 litres consumed</p>
        </div>
      </div>

      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(450px, 1fr)); gap: 1.5rem;">
        <!-- Vehicle Status Summary -->
        <div style="background: var(--surface); padding: 1.5rem; border-radius: 8px; border: 1px solid var(--border);">
          <h3 style="font-size: 1.1rem; margin-bottom: 1.5rem;">Vehicle Status Distribution</h3>
          <div style="display: flex; flex-direction: column; gap: 0.75rem;" id="vehicle-status-list">
            <div>Loading distribution...</div>
          </div>
        </div>

        <!-- Driver Safety Summary -->
        <div style="background: var(--surface); padding: 1.5rem; border-radius: 8px; border: 1px solid var(--border);">
          <h3 style="font-size: 1.1rem; margin-bottom: 1.5rem;">Driver Safety Averages</h3>
          <div style="display: flex; flex-direction: column; gap: 0.75rem;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span>Average Safety Score</span>
              <span style="font-weight: 700; font-size: 1.25rem;" id="stat-avg-safety">-- / 100</span>
            </div>
            <div style="background: rgba(255,255,255,0.05); height: 8px; border-radius: 4px; overflow: hidden;">
              <div id="bar-safety" style="background: #3b82f6; width: 0%; height: 100%; transition: width 0.6s ease;"></div>
            </div>
            <p style="font-size: 0.85rem; color: var(--text-secondary); margin-top: 0.5rem;" id="stat-driver-count">0 registered drivers</p>
          </div>
        </div>
      </div>
    `;

    analyticsViewContainer.appendChild(analyticsGrid);
  }
}

/**
 * Load Analytics report data
 * Attempts reports endpoint first, then falls back to fetching CRUD data and aggregating it.
 */
async function loadAnalyticsData() {
  if (analyticsViewContainer) showLoadingOverlay(analyticsViewContainer, true);

  try {
    let vehicles = [];
    let drivers = [];
    let maintenance = [];
    let fuel = [];

    // Fetch reports/dashboard data first to check if available
    let dashboardReport = null;
    try {
      const response = await fetch(ANALYTICS_API_BASE + "/reports/dashboard");
      if (response.ok) {
        const body = await response.json();
        dashboardReport = body.data || body;
      }
    } catch (e) {
      console.warn("Reports API not found or failing, falling back to database aggregation.", e);
    }

    // Parallel fetch core tables to compute analytics fallback
    const [vRes, dRes, mRes, fRes] = await Promise.all([
      fetch(ANALYTICS_API_BASE + "/vehicles").then(r => r.json()).catch(() => ({ data: [] })),
      fetch(ANALYTICS_API_BASE + "/drivers").then(r => r.json()).catch(() => ({ data: [] })),
      fetch(ANALYTICS_API_BASE + "/maintenance").then(r => r.json()).catch(() => ({ data: [] })),
      fetch(ANALYTICS_API_BASE + "/fuel").then(r => r.json()).catch(() => ({ data: [] }))
    ]);

    vehicles = vRes.data || vRes || [];
    drivers = dRes.data || dRes || [];
    maintenance = mRes.data || mRes || [];
    fuel = fRes.data || fRes || [];

    // Calculate metrics
    const totalVehicles = vehicles.length;
    const activeVehicles = vehicles.filter(v => v.status === "On Trip" || v.status === "Available").length;
    const inShopVehicles = vehicles.filter(v => v.status === "In Shop").length;
    
    // Utilization
    let utilization = totalVehicles > 0 ? Math.round((activeVehicles / totalVehicles) * 100) : 0;
    if (dashboardReport && dashboardReport.fleet_utilization) {
      utilization = parseInt(dashboardReport.fleet_utilization) || utilization;
    }

    // Maintenance costs
    const completedMaint = maintenance.filter(m => m.status === "Completed");
    const totalMaintCost = completedMaint.reduce((sum, item) => sum + Number(item.cost || 0), 0);

    // Fuel metrics
    const totalFuelCost = fuel.reduce((sum, item) => sum + Number(item.cost || 0), 0);
    const totalFuelLitres = fuel.reduce((sum, item) => sum + Number(item.litres || 0), 0);

    // Driver averages
    const totalDrivers = drivers.length;
    const avgSafetyScore = totalDrivers > 0 
      ? Math.round(drivers.reduce((sum, item) => sum + Number(item.safety_score || 0), 0) / totalDrivers)
      : 100;

    // Update UI elements
    const utilizationValEl = document.getElementById("stat-utilization");
    const utilizationBarEl = document.getElementById("bar-utilization");
    if (utilizationValEl) utilizationValEl.textContent = utilization + "%";
    if (utilizationBarEl) utilizationBarEl.style.width = utilization + "%";

    const maintCostEl = document.getElementById("stat-maint-cost");
    const maintCountEl = document.getElementById("stat-maint-count");
    if (maintCostEl) maintCostEl.textContent = formatCurrency(totalMaintCost);
    if (maintCountEl) maintCountEl.textContent = `${completedMaint.length} maintenance tasks completed`;

    const fuelCostEl = document.getElementById("stat-fuel-cost");
    const fuelLitresEl = document.getElementById("stat-fuel-litres");
    if (fuelCostEl) fuelCostEl.textContent = formatCurrency(totalFuelCost);
    if (fuelLitresEl) fuelLitresEl.textContent = `${totalFuelLitres.toLocaleString("en-IN")} litres consumed`;

    const avgSafetyEl = document.getElementById("stat-avg-safety");
    const safetyBarEl = document.getElementById("bar-safety");
    const driverCountEl = document.getElementById("stat-driver-count");
    if (avgSafetyEl) avgSafetyEl.textContent = `${avgSafetyScore} / 100`;
    if (safetyBarEl) safetyBarEl.style.width = avgSafetyScore + "%";
    if (driverCountEl) driverCountEl.textContent = `${totalDrivers} registered drivers`;

    // Render Vehicle Status distribution list
    const statusListEl = document.getElementById("vehicle-status-list");
    if (statusListEl) {
      statusListEl.innerHTML = "";
      const statuses = ["Available", "On Trip", "In Shop", "Retired"];
      statuses.forEach(status => {
        const count = vehicles.filter(v => v.status === status).length;
        const percentage = totalVehicles > 0 ? Math.round((count / totalVehicles) * 100) : 0;
        
        let color = "var(--text-secondary)";
        if (status === "Available") color = "#10b981";
        if (status === "On Trip") color = "#3b82f6";
        if (status === "In Shop") color = "#f59e0b";
        if (status === "Retired") color = "#ef4444";

        const div = document.createElement("div");
        div.style.cssText = "display: flex; flex-direction: column; gap: 0.25rem;";
        div.innerHTML = `
          <div style="display: flex; justify-content: space-between; font-size: 0.9rem;">
            <span>${status}</span>
            <span style="font-weight: 600; color: ${color};">${count} (${percentage}%)</span>
          </div>
          <div style="background: rgba(255,255,255,0.05); height: 6px; border-radius: 3px; overflow: hidden;">
            <div style="background: ${color}; width: ${percentage}%; height: 100%;"></div>
          </div>
        `;
        statusListEl.appendChild(div);
      });
    }

  } catch (error) {
    if (typeof handleApiError === "function") {
      handleApiError(error, "Failed to load report analytics.");
    } else {
      console.error("loadAnalyticsData error:", error);
    }
  } finally {
    if (analyticsViewContainer) showLoadingOverlay(analyticsViewContainer, false);
  }
}

/* ═══════════════════════════════════════════════════════════════════
   HELPER FORMATTERS
═══════════════════════════════════════════════════════════════════ */
function formatCurrency(value) {
  if (value === null || value === undefined || isNaN(Number(value))) return "₹0";
  return Number(value).toLocaleString("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0
  });
}

function escapeHtml(str) {
  if (!str && str !== 0) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/* ═══════════════════════════════════════════════════════════════════
   INITIALIZATION
═══════════════════════════════════════════════════════════════════ */
async function initialiseAnalytics() {
  ensureAnalyticsLayoutExists();
  await loadAnalyticsData();
}

document.addEventListener("DOMContentLoaded", initialiseAnalytics);

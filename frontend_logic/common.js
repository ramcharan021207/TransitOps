/**
 * common.js — TransitOps ERP
 * Global shared helpers for the TransitOps frontend.
 * Provides the Global API Error Handler, Loading Spinners, and Toast Notifications.
 */

"use strict";

/**
 * Toast Notification System
 * Injects a container and styles on-the-fly (to avoid CSS/HTML changes)
 * and displays animated success/error/warning messages.
 *
 * @param {string}            message - text to display
 * @param {"success"|"error"|"warning"} type - styling variant
 */
function showToast(message, type = "success") {
  let container = document.getElementById("toast-container");
  if (!container) {
    container = document.createElement("div");
    container.id = "toast-container";
    container.style.cssText = "position: fixed; top: 20px; right: 20px; z-index: 9999; display: flex; flex-direction: column; gap: 10px; max-width: 350px;";
    document.body.appendChild(container);
  }

  const toast = document.createElement("div");
  toast.style.cssText = `
    padding: 12px 20px;
    border-radius: 6px;
    color: #fff;
    font-weight: 500;
    font-size: 0.9rem;
    font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 15px;
    transform: translateY(-20px);
    opacity: 0;
    transition: all 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55);
  `;

  if (type === "error") {
    toast.style.backgroundColor = "#ef4444";
    toast.style.borderLeft = "4px solid #b91c1c";
  } else if (type === "warning") {
    toast.style.backgroundColor = "#f59e0b";
    toast.style.borderLeft = "4px solid #d97706";
  } else {
    toast.style.backgroundColor = "#10b981";
    toast.style.borderLeft = "4px solid #047857";
  }

  toast.innerHTML = `
    <span style="flex:1;">${escapeHtml(message)}</span>
    <button style="background:none; border:none; color:#fff; cursor:pointer; font-size:1.2rem; line-height:1; font-weight:bold; opacity:0.7;" onclick="this.parentElement.remove()">&times;</button>
  `;

  container.appendChild(toast);

  // Trigger smooth reveal animation
  setTimeout(() => {
    toast.style.transform = "translateY(0)";
    toast.style.opacity = "1";
  }, 10);

  // Auto-remove after 4 seconds
  setTimeout(() => {
    toast.style.transform = "translateY(-20px)";
    toast.style.opacity = "0";
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

/**
 * Loading Spinner Overlay
 * Shows a premium glassmorphic loading spinner over any target element (form, table container, body).
 *
 * @param {HTMLElement} target - DOM element to cover with the spinner
 * @param {boolean}     show   - true to show, false to remove
 */
function showLoadingOverlay(target, show = true) {
  if (!target) return;
  
  let overlay = target.querySelector(".loading-overlay");
  if (show) {
    if (!overlay) {
      overlay = document.createElement("div");
      overlay.className = "loading-overlay";
      overlay.style.cssText = `
        position: absolute;
        top: 0; left: 0; right: 0; bottom: 0;
        background: rgba(18, 18, 18, 0.75);
        backdrop-filter: blur(3px);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 999;
        border-radius: inherit;
        opacity: 0;
        transition: opacity 0.2s ease;
      `;
      
      const spinner = document.createElement("div");
      spinner.style.cssText = `
        width: 36px;
        height: 36px;
        border: 4px solid rgba(255, 255, 255, 0.1);
        border-top-color: #D97706;
        border-radius: 50%;
        animation: spin 0.8s linear infinite;
      `;
      
      if (!document.getElementById("spinner-styles")) {
        const style = document.createElement("style");
        style.id = "spinner-styles";
        style.innerHTML = "@keyframes spin { to { transform: rotate(360deg); } }";
        document.head.appendChild(style);
      }
      
      overlay.appendChild(spinner);
      
      const targetStyle = window.getComputedStyle(target);
      if (targetStyle.position === "static") {
        target.style.position = "relative";
      }
      
      target.appendChild(overlay);
    }
    setTimeout(() => { overlay.style.opacity = "1"; }, 10);
  } else {
    if (overlay) {
      overlay.style.opacity = "0";
      setTimeout(() => overlay.remove(), 200);
    }
  }
}

/**
 * Global API Error Handler
 * Centralized parsing and toast display for API fetch failures.
 *
 * @param {Error}  error         - the caught error object
 * @param {string} customMessage - fallback text
 */
function handleApiError(error, customMessage = "Unable to connect to backend server.") {
  console.error("[API Error Details]:", error);
  let friendlyMsg = customMessage;
  
  if (error instanceof TypeError && error.message.includes("fetch")) {
    friendlyMsg = "Network error: Unable to connect to backend server.";
  } else if (error && error.message) {
    friendlyMsg = error.message;
  }
  
  showToast(friendlyMsg, "error");
}

/**
 * Simple HTML Escaper helper
 */
function escapeHtml(str) {
  if (!str && str !== 0) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

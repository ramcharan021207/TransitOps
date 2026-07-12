/**
 * fleet.js — TransitOps ERP
 * Manages the Fleet Management page (fleet.html).
 *
 * Responsibilities:
 *   - Load vehicles from GET /api/vehicles
 *   - Render the vehicles table
 *   - Open / close the Add / Edit modal
 *   - Search by registration number or vehicle name
 *   - Filter by status
 *   - Submit a vehicle (POST for new, PUT for edit)
 *   - Delete a vehicle (DELETE /api/vehicles/:id)
 *
 * Rules:
 *   - Fetch API only (async / await / try-catch)
 *   - No dummy data, no fake JSON
 *   - If the backend is unreachable, display the error banner
 */

"use strict";

/* ═══════════════════════════════════════════════════════════════════
   API BASE URL
   Change this single constant when the Express server address
   changes.  All fetch calls build their URLs from here.
═══════════════════════════════════════════════════════════════════ */
const API_BASE = "/api";

/* ═══════════════════════════════════════════════════════════════════
   MODULE STATE
   Holds the current in-memory vehicle list (fetched from the API)
   and the id of the vehicle currently being edited (null = add mode).
═══════════════════════════════════════════════════════════════════ */
let vehicleList    = [];   // Full list returned by the last GET /api/vehicles
let editingId      = null; // vehicle_id being edited; null means "Add" mode

/* ═══════════════════════════════════════════════════════════════════
   DOM REFERENCES
   Centralised element look-up so every function uses the same
   references and we only query the DOM once.
═══════════════════════════════════════════════════════════════════ */

// ── Table & container
const tableBody         = document.getElementById("fleet-table-body");
const emptyState        = document.getElementById("fleet-empty-state");

// ── Search & filter controls
const searchRegInput    = document.getElementById("search-registration");
const searchNameInput   = document.getElementById("search-name");
const statusFilter      = document.getElementById("filter-status");

// ── "Add Vehicle" button (opens modal in add mode)
const addVehicleBtn     = document.getElementById("add-vehicle-btn");

// ── Modal elements
const vehicleModal      = document.getElementById("vehicle-modal");
const modalTitle        = document.getElementById("modal-title");
const modalCloseBtn     = document.getElementById("modal-close");
const modalCancelBtn    = document.getElementById("modal-cancel");
const vehicleForm       = document.getElementById("vehicle-form");

// ── Form fields (names match the JSON schema exactly)
const fieldVehicleId    = document.getElementById("field-vehicle-id");   // hidden
const fieldRegNumber    = document.getElementById("field-registration-number");
const fieldName         = document.getElementById("field-vehicle-name");
const fieldType         = document.getElementById("field-vehicle-type");
const fieldCapacity     = document.getElementById("field-maximum-capacity");
const fieldOdometer     = document.getElementById("field-odometer");
const fieldCost         = document.getElementById("field-acquisition-cost");
const fieldStatus       = document.getElementById("field-status");

// ── Inline field error elements
const errRegNumber      = document.getElementById("err-registration-number");
const errName           = document.getElementById("err-vehicle-name");
const errCapacity       = document.getElementById("err-maximum-capacity");
const errOdometer       = document.getElementById("err-odometer");
const errCost           = document.getElementById("err-acquisition-cost");

// ── Page-level error / success banners
const errorBanner       = document.getElementById("fleet-error-banner");
const errorBannerMsg    = document.getElementById("fleet-error-message");
const successBanner     = document.getElementById("fleet-success-banner");
const successBannerMsg  = document.getElementById("fleet-success-message");

// ── Submit button inside the modal form
const submitBtn         = document.getElementById("vehicle-submit-btn");

/* ═══════════════════════════════════════════════════════════════════
   UTILITY — showBanner
   Displays the page-level error or success banner with a message.
   The banner auto-hides after 5 seconds.

   @param {"error"|"success"} type — which banner to show
   @param {string}            msg  — message text to display
═══════════════════════════════════════════════════════════════════ */
function showBanner(type, msg) {
  if (type === "error") {
    if (!errorBanner || !errorBannerMsg) return;

    // Set message text and make the banner visible
    errorBannerMsg.textContent = msg;
    errorBanner.classList.add("visible");
    errorBanner.classList.remove("hidden");

    // Hide the success banner if it was showing
    if (successBanner) successBanner.classList.remove("visible");

    // Auto-dismiss after 5 seconds
    setTimeout(function () {
      errorBanner.classList.remove("visible");
    }, 5000);

  } else if (type === "success") {
    if (!successBanner || !successBannerMsg) return;

    // Set message text and make the banner visible
    successBannerMsg.textContent = msg;
    successBanner.classList.add("visible");
    successBanner.classList.remove("hidden");

    // Hide the error banner if it was showing
    if (errorBanner) errorBanner.classList.remove("visible");

    // Auto-dismiss after 4 seconds
    setTimeout(function () {
      successBanner.classList.remove("visible");
    }, 4000);
  }
}

/* ═══════════════════════════════════════════════════════════════════
   UTILITY — showFieldError / clearFieldError
   Shows or clears a validation message beneath an individual field.

   @param {HTMLElement} el  — the error <span> element for that field
   @param {string}      msg — message to display (pass "" to clear)
═══════════════════════════════════════════════════════════════════ */
function showFieldError(el, msg) {
  if (!el) return;
  el.textContent = msg;
  el.classList.add("visible");
}

function clearFieldError(el) {
  if (!el) return;
  el.textContent = "";
  el.classList.remove("visible");
}

/* ═══════════════════════════════════════════════════════════════════
   UTILITY — clearAllFieldErrors
   Clears all form field validation messages at once.
   Called before every validation pass and on modal open.
═══════════════════════════════════════════════════════════════════ */
function clearAllFieldErrors() {
  [errRegNumber, errName, errCapacity, errOdometer, errCost].forEach(
    function (el) { clearFieldError(el); }
  );
}

/* ═══════════════════════════════════════════════════════════════════
   UTILITY — setSubmitLoading
   Disables / re-enables the modal submit button during an API call.
   Provides visual feedback so users know a request is in flight.

   @param {boolean} isLoading — true to show loading state
═══════════════════════════════════════════════════════════════════ */
function setSubmitLoading(isLoading) {
  if (!submitBtn) return;

  if (isLoading) {
    submitBtn.disabled = true;
    submitBtn.textContent = "Saving..."; // visual feedback during request
  } else {
    submitBtn.disabled = false;
    submitBtn.textContent = "Save Vehicle"; // restore label
  }
}

/* ═══════════════════════════════════════════════════════════════════
   LOAD VEHICLES
   Fetches all vehicles from GET /api/vehicles.
   Stores results in the module-level vehicleList array, then
   triggers a table render.

   If the server is unreachable or returns a non-OK status,
   the error banner is shown — no dummy data is created.
═══════════════════════════════════════════════════════════════════ */
async function loadVehicles() {
  try {
    // Show a loading placeholder in the table body while fetching
    if (tableBody) {
      tableBody.innerHTML =
        '<tr><td colspan="8" class="table-loading">Loading vehicles...</td></tr>';
    }

    // Call the API
    const response = await fetch(API_BASE + "/vehicles");

    // Handle non-2xx HTTP responses (e.g. 500 Internal Server Error)
    if (!response.ok) {
      throw new Error("Server returned status " + response.status);
    }

    // Parse the JSON array of vehicle objects
    vehicleList = await response.json();

    // Render the full list into the table
    renderTable(vehicleList);

  } catch (error) {
    // Network failure or server error — show the error banner
    showBanner(
      "error",
      "Unable to connect to backend server."
    );

    // Clear the loading placeholder and show the empty state
    if (tableBody) tableBody.innerHTML = "";
    showEmptyState(true);

    // Log the technical error to the console for debugging
    console.error("[fleet.js] loadVehicles error:", error);
  }
}

/* ═══════════════════════════════════════════════════════════════════
   RENDER TABLE
   Clears the table body and renders a row for each vehicle object
   in the provided array.  Handles the empty state visibility.

   @param {Array} vehicles — array of vehicle objects to render
═══════════════════════════════════════════════════════════════════ */
function renderTable(vehicles) {
  if (!tableBody) return;

  // Clear existing rows before rendering
  tableBody.innerHTML = "";

  // Show the empty-state message if there are no vehicles
  if (!vehicles || vehicles.length === 0) {
    showEmptyState(true);
    return;
  }

  // Hide empty state when there is data to show
  showEmptyState(false);

  // Build one <tr> per vehicle
  vehicles.forEach(function (vehicle) {
    const tr = document.createElement("tr");
    tr.setAttribute("data-id", vehicle.vehicle_id); // store id for edit/delete

    // Format the acquisition cost as a currency string
    const costDisplay = formatCurrency(vehicle.acquisition_cost);

    // Map status string to a CSS badge class
    const statusBadgeClass = getStatusBadgeClass(vehicle.status);

    // Build the table row HTML using the mandatory JSON field names
    tr.innerHTML =
      "<td>" + escapeHtml(String(vehicle.vehicle_id)) + "</td>" +
      "<td>" + escapeHtml(vehicle.registration_number) + "</td>" +
      "<td>" + escapeHtml(vehicle.vehicle_name) + "</td>" +
      "<td>" + escapeHtml(vehicle.vehicle_type) + "</td>" +
      "<td>" + escapeHtml(String(vehicle.maximum_capacity)) + "</td>" +
      "<td>" + escapeHtml(String(vehicle.odometer)) + " km</td>" +
      "<td>" + costDisplay + "</td>" +
      "<td>" +
        '<span class="status-badge ' + statusBadgeClass + '">' +
          escapeHtml(vehicle.status) +
        "</span>" +
      "</td>" +
      "<td>" +
        '<button class="btn-icon btn-edit" ' +
          'aria-label="Edit vehicle ' + escapeHtml(vehicle.registration_number) + '" ' +
          'data-id="' + vehicle.vehicle_id + '">' +
          "Edit" +
        "</button>" +
        '<button class="btn-icon btn-delete" ' +
          'aria-label="Delete vehicle ' + escapeHtml(vehicle.registration_number) + '" ' +
          'data-id="' + vehicle.vehicle_id + '">' +
          "Delete" +
        "</button>" +
      "</td>";

    // Attach Edit button listener
    const editBtn = tr.querySelector(".btn-edit");
    if (editBtn) {
      editBtn.addEventListener("click", function () {
        openEditModal(vehicle);
      });
    }

    // Attach Delete button listener
    const deleteBtn = tr.querySelector(".btn-delete");
    if (deleteBtn) {
      deleteBtn.addEventListener("click", function () {
        handleDeleteVehicle(vehicle.vehicle_id, vehicle.registration_number);
      });
    }

    tableBody.appendChild(tr);
  });
}

/* ═══════════════════════════════════════════════════════════════════
   SHOW EMPTY STATE
   Toggles the empty-state message element visibility.

   @param {boolean} show — true to display the empty state
═══════════════════════════════════════════════════════════════════ */
function showEmptyState(show) {
  if (!emptyState) return;

  if (show) {
    emptyState.classList.remove("hidden");
    emptyState.classList.add("visible");
  } else {
    emptyState.classList.add("hidden");
    emptyState.classList.remove("visible");
  }
}

/* ═══════════════════════════════════════════════════════════════════
   OPEN ADD MODAL
   Clears all form fields and opens the modal in "Add Vehicle" mode.
   editingId is reset to null to indicate POST will be used.
═══════════════════════════════════════════════════════════════════ */
function openAddModal() {
  // Reset to add mode
  editingId = null;

  // Update modal heading
  if (modalTitle) modalTitle.textContent = "Add Vehicle";

  // Reset all form fields to blank / defaults
  if (vehicleForm) vehicleForm.reset();

  // Clear all field-level validation errors
  clearAllFieldErrors();

  // Clear the hidden vehicle-id field
  if (fieldVehicleId) fieldVehicleId.value = "";

  // Reset submit button label (in case it was stuck in loading)
  setSubmitLoading(false);

  // Make the modal visible
  if (vehicleModal) {
    vehicleModal.classList.add("open");
    vehicleModal.setAttribute("aria-hidden", "false");
  }

  // Focus the first field for keyboard accessibility
  if (fieldRegNumber) fieldRegNumber.focus();
}

/* ═══════════════════════════════════════════════════════════════════
   OPEN EDIT MODAL
   Pre-fills all form fields from an existing vehicle object and
   opens the modal in "Edit Vehicle" mode.
   editingId is set to vehicle.vehicle_id so PUT will be used.

   @param {Object} vehicle — the vehicle object to edit
═══════════════════════════════════════════════════════════════════ */
function openEditModal(vehicle) {
  // Store the id being edited (triggers PUT in handleSubmit)
  editingId = vehicle.vehicle_id;

  // Update modal heading
  if (modalTitle) modalTitle.textContent = "Edit Vehicle";

  // Clear validation errors from a previous open
  clearAllFieldErrors();

  // Populate fields using the mandatory JSON field names
  if (fieldVehicleId)  fieldVehicleId.value  = vehicle.vehicle_id;
  if (fieldRegNumber)  fieldRegNumber.value   = vehicle.registration_number;
  if (fieldName)       fieldName.value        = vehicle.vehicle_name;
  if (fieldType)       fieldType.value        = vehicle.vehicle_type;
  if (fieldCapacity)   fieldCapacity.value    = vehicle.maximum_capacity;
  if (fieldOdometer)   fieldOdometer.value    = vehicle.odometer;
  if (fieldCost)       fieldCost.value        = vehicle.acquisition_cost;
  if (fieldStatus)     fieldStatus.value      = vehicle.status;

  // Reset submit button label
  setSubmitLoading(false);

  // Make the modal visible
  if (vehicleModal) {
    vehicleModal.classList.add("open");
    vehicleModal.setAttribute("aria-hidden", "false");
  }

  // Focus the first field for keyboard accessibility
  if (fieldRegNumber) fieldRegNumber.focus();
}

/* ═══════════════════════════════════════════════════════════════════
   CLOSE MODAL
   Hides the vehicle modal, resets editingId, and clears the form.
═══════════════════════════════════════════════════════════════════ */
function closeModal() {
  if (!vehicleModal) return;

  // Hide the modal
  vehicleModal.classList.remove("open");
  vehicleModal.setAttribute("aria-hidden", "true");

  // Reset form state
  editingId = null;
  if (vehicleForm) vehicleForm.reset();
  clearAllFieldErrors();
  setSubmitLoading(false);
}

/* ═══════════════════════════════════════════════════════════════════
   VALIDATE FORM
   Runs all field-level validation rules and populates error spans.
   Returns true only when every rule passes.

   Rules:
   - registration_number : required, non-empty
   - vehicle_name        : required, non-empty
   - maximum_capacity    : required, must be > 0
   - odometer            : required, must be >= 0
   - acquisition_cost    : required, must be >= 0

   @returns {boolean} true if the form is valid
═══════════════════════════════════════════════════════════════════ */
function validateForm() {
  // Clear all previous errors before re-validating
  clearAllFieldErrors();

  let isValid = true; // assume valid; set false on any failure

  // ── Registration Number ──────────────────────────────────────
  const regVal = fieldRegNumber ? fieldRegNumber.value.trim() : "";
  if (!regVal) {
    showFieldError(errRegNumber, "Registration number is required.");
    isValid = false;
  }

  // ── Vehicle Name ─────────────────────────────────────────────
  const nameVal = fieldName ? fieldName.value.trim() : "";
  if (!nameVal) {
    showFieldError(errName, "Vehicle name is required.");
    isValid = false;
  }

  // ── Maximum Capacity ─────────────────────────────────────────
  const capacityVal = fieldCapacity ? Number(fieldCapacity.value) : NaN;
  if (isNaN(capacityVal) || capacityVal <= 0) {
    showFieldError(errCapacity, "Capacity must be greater than 0.");
    isValid = false;
  }

  // ── Odometer ─────────────────────────────────────────────────
  const odometerVal = fieldOdometer ? Number(fieldOdometer.value) : NaN;
  if (isNaN(odometerVal) || odometerVal < 0) {
    showFieldError(errOdometer, "Odometer reading must be 0 or greater.");
    isValid = false;
  }

  // ── Acquisition Cost ─────────────────────────────────────────
  const costVal = fieldCost ? Number(fieldCost.value) : NaN;
  if (isNaN(costVal) || costVal < 0) {
    showFieldError(errCost, "Acquisition cost must be 0 or greater.");
    isValid = false;
  }

  return isValid;
}

/* ═══════════════════════════════════════════════════════════════════
   COLLECT FORM DATA
   Reads all form fields and returns a plain object matching the
   mandatory JSON schema exactly.

   @returns {Object} vehicle payload ready for the API
═══════════════════════════════════════════════════════════════════ */
function collectFormData() {
  return {
    registration_number : fieldRegNumber ? fieldRegNumber.value.trim() : "",
    vehicle_name        : fieldName      ? fieldName.value.trim()      : "",
    vehicle_type        : fieldType      ? fieldType.value.trim()      : "",
    maximum_capacity    : fieldCapacity  ? Number(fieldCapacity.value)  : 0,
    odometer            : fieldOdometer  ? Number(fieldOdometer.value)  : 0,
    acquisition_cost    : fieldCost      ? Number(fieldCost.value)      : 0,
    status              : fieldStatus    ? fieldStatus.value            : "Available",
  };
}

/* ═══════════════════════════════════════════════════════════════════
   HANDLE SUBMIT
   Called on form submit event.
   Validates the form, then calls either:
     POST /api/vehicles          — when editingId is null (add mode)
     PUT  /api/vehicles/:id      — when editingId is set  (edit mode)

   On success: closes the modal, refreshes the table, shows a
               success banner.
   On failure: shows the error banner, restores the submit button.
═══════════════════════════════════════════════════════════════════ */
async function handleSubmit(e) {
  // Prevent the default HTML form submission / page reload
  e.preventDefault();

  // Run all validation rules — stop if any field is invalid
  if (!validateForm()) return;

  // Read field values into a payload object
  const payload = collectFormData();

  // Determine HTTP method and URL based on mode
  const isEditMode = editingId !== null;
  const method     = isEditMode ? "PUT" : "POST";
  const url        = isEditMode
    ? API_BASE + "/vehicles/" + editingId
    : API_BASE + "/vehicles";

  // Disable submit button to prevent double-submission
  setSubmitLoading(true);

  try {
    const response = await fetch(url, {
      method  : method,
      headers : { "Content-Type": "application/json" },
      body    : JSON.stringify(payload),
    });

    // Handle non-2xx responses from the server
    if (!response.ok) {
      // Attempt to read a server-provided error message
      let serverMsg = "Server returned status " + response.status;
      try {
        const errBody = await response.json();
        if (errBody && errBody.message) serverMsg = errBody.message;
      } catch (_) {
        // Ignore — use the default status message
      }
      throw new Error(serverMsg);
    }

    // Success — close the modal and reload the table from the API
    closeModal();
    await loadVehicles();

    // Show a contextual success message
    showBanner(
      "success",
      isEditMode
        ? "Vehicle updated successfully."
        : "Vehicle added successfully."
    );

  } catch (error) {
    // Show the error banner with the failure message
    showBanner("error", "Unable to connect to backend server.");
    console.error("[fleet.js] handleSubmit error:", error);

    // Re-enable the submit button so the user can retry
    setSubmitLoading(false);
  }
}

/* ═══════════════════════════════════════════════════════════════════
   HANDLE DELETE VEHICLE
   Asks for confirmation, then calls DELETE /api/vehicles/:id.

   On success: removes the row from the table by reloading from API,
               shows a success banner.
   On failure: shows the error banner.

   @param {number} id                — vehicle_id to delete
   @param {string} registrationNumber — shown in the confirm dialog
═══════════════════════════════════════════════════════════════════ */
async function handleDeleteVehicle(id, registrationNumber) {
  // Ask the user to confirm before making a destructive API call
  const confirmed = window.confirm(
    'Delete vehicle "' + registrationNumber + '"?\n\nThis action cannot be undone.'
  );

  if (!confirmed) return; // user cancelled

  try {
    const response = await fetch(API_BASE + "/vehicles/" + id, {
      method: "DELETE",
    });

    // Handle non-2xx responses
    if (!response.ok) {
      throw new Error("Server returned status " + response.status);
    }

    // Reload the table to reflect the deletion
    await loadVehicles();

    // Notify the user
    showBanner("success", "Vehicle deleted successfully.");

  } catch (error) {
    showBanner("error", "Unable to connect to backend server.");
    console.error("[fleet.js] handleDeleteVehicle error:", error);
  }
}

/* ═══════════════════════════════════════════════════════════════════
   SEARCH & FILTER — applyFilters
   Reads the current search inputs and status filter, then filters
   the in-memory vehicleList and calls renderTable with the result.

   Filter rules (all applied together with AND logic):
   - searchReg  : case-insensitive substring match on registration_number
   - searchName : case-insensitive substring match on vehicle_name
   - status     : exact match on vehicle.status ("" = show all)
═══════════════════════════════════════════════════════════════════ */
function applyFilters() {
  // Read current filter values (trimmed, lowercased for comparison)
  const searchReg  = searchRegInput  ? searchRegInput.value.trim().toLowerCase()  : "";
  const searchName = searchNameInput ? searchNameInput.value.trim().toLowerCase() : "";
  const status     = statusFilter    ? statusFilter.value                         : "";

  // Filter the full vehicleList kept in memory
  const filtered = vehicleList.filter(function (vehicle) {

    // ── Registration number filter ─────────────────────────────
    if (searchReg) {
      const reg = vehicle.registration_number
        ? vehicle.registration_number.toLowerCase()
        : "";
      if (!reg.includes(searchReg)) return false;
    }

    // ── Vehicle name filter ────────────────────────────────────
    if (searchName) {
      const name = vehicle.vehicle_name
        ? vehicle.vehicle_name.toLowerCase()
        : "";
      if (!name.includes(searchName)) return false;
    }

    // ── Status filter ──────────────────────────────────────────
    if (status && vehicle.status !== status) return false;

    return true; // passes all filters
  });

  // Re-render the table with only the matching vehicles
  renderTable(filtered);
}

/* ═══════════════════════════════════════════════════════════════════
   HELPER — getStatusBadgeClass
   Maps a vehicle status string to a CSS class for the status badge.

   @param  {string} status — e.g. "Available", "Active", "Maintenance"
   @returns {string} CSS class name
═══════════════════════════════════════════════════════════════════ */
function getStatusBadgeClass(status) {
  switch (status) {
    case "Available":   return "badge-available";
    case "Active":      return "badge-active";
    case "Maintenance": return "badge-maintenance";
    case "Retired":     return "badge-retired";
    default:            return "badge-default";
  }
}

/* ═══════════════════════════════════════════════════════════════════
   HELPER — formatCurrency
   Returns a locale-formatted currency string.
   Adjust the locale / currency code to match the project region.

   @param  {number} value — numeric monetary value
   @returns {string} formatted string (e.g. "₹1,20,000")
═══════════════════════════════════════════════════════════════════ */
function formatCurrency(value) {
  if (value === null || value === undefined || isNaN(Number(value))) {
    return "--";
  }
  return Number(value).toLocaleString("en-IN", {
    style    : "currency",
    currency : "INR",
    maximumFractionDigits: 0,
  });
}

/* ═══════════════════════════════════════════════════════════════════
   HELPER — escapeHtml
   Escapes special HTML characters in a string to prevent XSS when
   inserting user-supplied API data into innerHTML.

   @param  {string} str — raw string from the API
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
   ATTACH EVENT LISTENERS
   Wires all interactive elements to their handler functions.
   Called once during initialisation.
═══════════════════════════════════════════════════════════════════ */
function attachEventListeners() {

  // ── "Add Vehicle" button — open modal in add mode
  if (addVehicleBtn) {
    addVehicleBtn.addEventListener("click", openAddModal);
  }

  // ── Modal close button (× in header)
  if (modalCloseBtn) {
    modalCloseBtn.addEventListener("click", closeModal);
  }

  // ── Modal cancel button
  if (modalCancelBtn) {
    modalCancelBtn.addEventListener("click", closeModal);
  }

  // ── Click outside the modal panel to close
  if (vehicleModal) {
    vehicleModal.addEventListener("click", function (e) {
      // Only close if the click landed on the modal backdrop itself
      if (e.target === vehicleModal) closeModal();
    });
  }

  // ── Escape key closes the modal
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && vehicleModal && vehicleModal.classList.contains("open")) {
      closeModal();
    }
  });

  // ── Form submit (Add / Edit)
  if (vehicleForm) {
    vehicleForm.addEventListener("submit", handleSubmit);
  }

  // ── Search by registration number (live, on every keystroke)
  if (searchRegInput) {
    searchRegInput.addEventListener("input", applyFilters);
  }

  // ── Search by vehicle name (live, on every keystroke)
  if (searchNameInput) {
    searchNameInput.addEventListener("input", applyFilters);
  }

  // ── Status dropdown filter
  if (statusFilter) {
    statusFilter.addEventListener("change", applyFilters);
  }
}

/* ═══════════════════════════════════════════════════════════════════
   INIT — initialiseFleet
   Entry point. Attaches all event listeners, then fetches vehicles
   from the API to populate the table.
═══════════════════════════════════════════════════════════════════ */
async function initialiseFleet() {
  // Wire up all button/input listeners
  attachEventListeners();

  // Fetch and render vehicles from the API
  await loadVehicles();
}

// Run when the DOM is fully parsed and ready
document.addEventListener("DOMContentLoaded", initialiseFleet);

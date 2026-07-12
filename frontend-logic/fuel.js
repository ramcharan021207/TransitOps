/**
 * fuel.js — TransitOps ERP
 * Manages the Fuel & Expense page (fuel.html).
 *
 * Responsibilities:
 *   FUEL
 *   - Load fuel logs from GET /api/fuel
 *   - Render the fuel table
 *   - Open / close the Fuel Add / Edit modal
 *   - Submit a fuel log (POST for new, PUT for edit)
 *   - Delete a fuel log (DELETE /api/fuel/:id)
 *   - Search fuel logs by vehicle
 *
 *   EXPENSES
 *   - Load expense records from GET /api/expenses
 *   - Render the expense table
 *   - Open / close the Expense Add / Edit modal
 *   - Submit an expense (POST for new, PUT for edit)
 *   - Delete an expense (DELETE /api/expenses/:id)
 *   - Search expenses by vehicle
 *
 * Rules:
 *   - Fetch API only (async / await / try-catch)
 *   - No dummy data, no fake JSON
 *   - If the backend is unreachable, display the error banner
 */

"use strict";

/* ═══════════════════════════════════════════════════════════════════
   API BASE URL
   Single constant for the Express server base path.
   All fetch calls build their URLs from here.
═══════════════════════════════════════════════════════════════════ */
const FUEL_API_BASE = "/api";

/* ═══════════════════════════════════════════════════════════════════
   MODULE STATE — FUEL
   fuelList      — full list from the last GET /api/fuel
   editingFuelId — fuel_id being edited; null = add mode
═══════════════════════════════════════════════════════════════════ */
let fuelList      = [];
let editingFuelId = null;

/* ═══════════════════════════════════════════════════════════════════
   MODULE STATE — EXPENSES
   expenseList      — full list from the last GET /api/expenses
   editingExpenseId — expense_id being edited; null = add mode
═══════════════════════════════════════════════════════════════════ */
let expenseList      = [];
let editingExpenseId = null;

/* ═══════════════════════════════════════════════════════════════════
   DOM REFERENCES — FUEL SECTION
═══════════════════════════════════════════════════════════════════ */

// ── Fuel table & empty state
const fuelTableBody  = document.getElementById("fuel-table-body");
const fuelEmptyState = document.getElementById("fuel-empty-state");

// ── Fuel search & filter
const searchFuelVehicle = document.getElementById("search-fuel-vehicle");
const fuelTypeFilter    = document.getElementById("filter-fuel-type");

// ── "Add Fuel Log" button
const addFuelBtn = document.getElementById("add-fuel-btn");

// ── Fuel modal elements
const fuelModal       = document.getElementById("fuel-modal");
const fuelModalTitle  = document.getElementById("fuel-modal-title");
const fuelModalClose  = document.getElementById("fuel-modal-close");
const fuelModalCancel = document.getElementById("fuel-modal-cancel");
const fuelForm        = document.getElementById("fuel-form");

// ── Fuel form fields
const fieldFuelId      = document.getElementById("field-fuel-id");       // hidden
const fieldFuelVehicle = document.getElementById("field-fuel-vehicle");
const fieldFuelType    = document.getElementById("field-fuel-type");
const fieldLitres      = document.getElementById("field-litres");
const fieldFuelCost    = document.getElementById("field-fuel-cost");
const fieldFuelDate    = document.getElementById("field-fuel-date");
const fieldOdoReading  = document.getElementById("field-odometer-reading");
const fieldFuelStation = document.getElementById("field-fuel-station");
const fieldFuelNotes   = document.getElementById("field-fuel-notes");

// ── Fuel inline error spans
const errFuelVehicle = document.getElementById("err-fuel-vehicle");
const errFuelType    = document.getElementById("err-fuel-type");
const errLitres      = document.getElementById("err-litres");
const errFuelCost    = document.getElementById("err-fuel-cost");
const errFuelDate    = document.getElementById("err-fuel-date");

// ── Fuel submit button
const fuelSubmitBtn = document.getElementById("fuel-submit-btn");

/* ═══════════════════════════════════════════════════════════════════
   DOM REFERENCES — EXPENSE SECTION
═══════════════════════════════════════════════════════════════════ */

// ── Expense table & empty state
const expenseTableBody  = document.getElementById("expense-table-body");
const expenseEmptyState = document.getElementById("expense-empty-state");

// ── Expense search & filter
const searchExpenseVehicle = document.getElementById("search-expense-vehicle");
const expenseTypeFilter    = document.getElementById("filter-expense-type");

// ── "Add Expense" button
const addExpenseBtn = document.getElementById("add-expense-btn");

// ── Expense modal elements
const expenseModal       = document.getElementById("expense-modal");
const expenseModalTitle  = document.getElementById("expense-modal-title");
const expenseModalClose  = document.getElementById("expense-modal-close");
const expenseModalCancel = document.getElementById("expense-modal-cancel");
const expenseForm        = document.getElementById("expense-form");

// ── Expense form fields
const fieldExpenseId      = document.getElementById("field-expense-id");     // hidden
const fieldExpenseVehicle = document.getElementById("field-expense-vehicle");
const fieldExpenseType    = document.getElementById("field-expense-type");
const fieldExpenseAmount  = document.getElementById("field-expense-amount");
const fieldExpenseDate    = document.getElementById("field-expense-date");
const fieldExpenseRef     = document.getElementById("field-expense-reference");
const fieldExpenseNotes   = document.getElementById("field-expense-notes");

// ── Expense inline error spans
const errExpenseVehicle = document.getElementById("err-expense-vehicle");
const errExpenseType    = document.getElementById("err-expense-type");
const errExpenseAmount  = document.getElementById("err-expense-amount");
const errExpenseDate    = document.getElementById("err-expense-date");

// ── Expense submit button
const expenseSubmitBtn = document.getElementById("expense-submit-btn");

/* ═══════════════════════════════════════════════════════════════════
   DOM REFERENCES — PAGE-LEVEL BANNERS
   One pair of banners is shared between the fuel and expense sections.
═══════════════════════════════════════════════════════════════════ */
const pageErrorBanner   = document.getElementById("fuel-page-error-banner");
const pageErrorMsg      = document.getElementById("fuel-page-error-message");
const pageSuccessBanner = document.getElementById("fuel-page-success-banner");
const pageSuccessMsg    = document.getElementById("fuel-page-success-message");

/* ═══════════════════════════════════════════════════════════════════
   UTILITY — showBanner
   Displays the page-level error or success banner with a message.
   Only one banner is visible at a time.
   Auto-dismisses after 5 s (error) or 4 s (success).

   @param {"error"|"success"} type — which banner to show
   @param {string}            msg  — message text to display
═══════════════════════════════════════════════════════════════════ */
function showBanner(type, msg) {
  if (typeof showToast === "function") {
    showToast(msg, type);
  }
  if (type === "error") {
    if (!pageErrorBanner || !pageErrorMsg) return;

    // Set message and reveal the error banner
    pageErrorMsg.textContent = msg;
    pageErrorBanner.classList.add("visible");
    pageErrorBanner.classList.remove("hidden");

    // Dismiss any visible success banner
    if (pageSuccessBanner) pageSuccessBanner.classList.remove("visible");

    // Auto-dismiss after 5 seconds
    setTimeout(function () {
      pageErrorBanner.classList.remove("visible");
    }, 5000);

  } else if (type === "success") {
    if (!pageSuccessBanner || !pageSuccessMsg) return;

    // Set message and reveal the success banner
    pageSuccessMsg.textContent = msg;
    pageSuccessBanner.classList.add("visible");
    pageSuccessBanner.classList.remove("hidden");

    // Dismiss any visible error banner
    if (pageErrorBanner) pageErrorBanner.classList.remove("visible");

    // Auto-dismiss after 4 seconds
    setTimeout(function () {
      pageSuccessBanner.classList.remove("visible");
    }, 4000);
  }
}

/* ═══════════════════════════════════════════════════════════════════
   UTILITY — showFieldError / clearFieldError
   Shows or clears a validation message beneath a single field.

   @param {HTMLElement} el  — the error <span> for that field
   @param {string}      msg — validation message text
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
   UTILITY — clearFuelFieldErrors
   Clears every inline field error in the fuel modal at once.
   Called before each fuel validation pass and on modal open.
═══════════════════════════════════════════════════════════════════ */
function clearFuelFieldErrors() {
  [errFuelVehicle, errFuelType, errLitres, errFuelCost, errFuelDate].forEach(
    function (el) { clearFieldError(el); }
  );
}

/* ═══════════════════════════════════════════════════════════════════
   UTILITY — clearExpenseFieldErrors
   Clears every inline field error in the expense modal at once.
   Called before each expense validation pass and on modal open.
═══════════════════════════════════════════════════════════════════ */
function clearExpenseFieldErrors() {
  [errExpenseVehicle, errExpenseType, errExpenseAmount, errExpenseDate].forEach(
    function (el) { clearFieldError(el); }
  );
}

/* ═══════════════════════════════════════════════════════════════════
   UTILITY — setFuelSubmitLoading
   Disables / re-enables the fuel submit button during an API call.

   @param {boolean} isLoading — true to enter loading state
═══════════════════════════════════════════════════════════════════ */
function setFuelSubmitLoading(isLoading) {
  if (!fuelSubmitBtn) return;

  if (isLoading) {
    fuelSubmitBtn.disabled = true;
    fuelSubmitBtn.textContent = "Saving..."; // visual feedback
  } else {
    fuelSubmitBtn.disabled = false;
    fuelSubmitBtn.textContent = "Save Log"; // restore label
  }
}

/* ═══════════════════════════════════════════════════════════════════
   UTILITY — setExpenseSubmitLoading
   Disables / re-enables the expense submit button during an API call.

   @param {boolean} isLoading — true to enter loading state
═══════════════════════════════════════════════════════════════════ */
function setExpenseSubmitLoading(isLoading) {
  if (!expenseSubmitBtn) return;

  if (isLoading) {
    expenseSubmitBtn.disabled = true;
    expenseSubmitBtn.textContent = "Saving..."; // visual feedback
  } else {
    expenseSubmitBtn.disabled = false;
    expenseSubmitBtn.textContent = "Save Expense"; // restore label
  }
}

/* ═══════════════════════════════════════════════════════════════════
   ████████████████████████████████████████████████████████████████
   FUEL — LOAD & RENDER
   ████████████████████████████████████████████████████████████████
═══════════════════════════════════════════════════════════════════ */

/* ═══════════════════════════════════════════════════════════════════
   LOAD FUEL LOGS
   Fetches all fuel records from GET /api/fuel.
   Stores the result in fuelList and triggers a table render.

   On network failure or non-OK status, the error banner is shown.
   No fallback / dummy data is ever created.
═══════════════════════════════════════════════════════════════════ */
async function loadFuel() {
  const container = document.querySelector("#fuel-table-body") ? document.querySelector("#fuel-table-body").closest(".table-container") : document.body;
  if (typeof showLoadingOverlay === "function") {
    showLoadingOverlay(container, true);
  }
  try {
    // Show a temporary loading row while the request is in flight
    if (fuelTableBody) {
      fuelTableBody.innerHTML =
        '<tr><td colspan="8" class="table-loading">Loading fuel logs...</td></tr>';
    }

    // Call the API
    const response = await fetch(FUEL_API_BASE + "/fuel");

    // Treat any non-2xx HTTP status as a failure
    if (!response.ok) {
      throw new Error("Server returned status " + response.status);
    }

    // Parse the JSON array
    const body = await response.json();
    fuelList = body.data || body || [];

    // Render the full list
    renderFuelTable(fuelList);

  } catch (error) {
    if (typeof handleApiError === "function") {
      handleApiError(error, "Unable to load fuel logs from server.");
    }
    showBanner("error", "Unable to connect to backend server.");
    if (fuelTableBody) fuelTableBody.innerHTML = "";
    showFuelEmptyState(true);
    console.error("[fuel.js] loadFuel error:", error);
  } finally {
    if (typeof showLoadingOverlay === "function") {
      showLoadingOverlay(container, false);
    }
  }
}

/* ═══════════════════════════════════════════════════════════════════
   RENDER FUEL TABLE
   Clears the fuel table body and renders one <tr> per fuel log.
   Manages fuel empty-state visibility.

   Expected fields on each fuel object:
     fuel_id, vehicle, fuel_type, litres, cost,
     date, odometer_reading, fuel_station, notes

   @param {Array} records — array of fuel log objects to display
═══════════════════════════════════════════════════════════════════ */
function renderFuelTable(records) {
  if (!fuelTableBody) return;

  // Clear previous rows
  fuelTableBody.innerHTML = "";

  if (!records || records.length === 0) {
    showFuelEmptyState(true);
    return;
  }

  // Data present — hide the empty state
  showFuelEmptyState(false);

  // Build one <tr> per fuel log
  records.forEach(function (log) {
    const tr = document.createElement("tr");
    tr.setAttribute("data-id", log.fuel_id);

    // Format values for display
    const dateDisplay = formatDate(log.date);
    const costDisplay = formatCurrency(log.cost);
    const litresDisplay = log.litres !== null && log.litres !== undefined
      ? escapeHtml(String(log.litres)) + " L"
      : "—";
    const odoDisplay = log.odometer_reading !== null && log.odometer_reading !== undefined
      ? escapeHtml(String(log.odometer_reading)) + " km"
      : "—";

    // Build the row HTML using API field names
    tr.innerHTML =
      "<td>" + escapeHtml(String(log.fuel_id))       + "</td>" +
      "<td>" + escapeHtml(log.vehicle)               + "</td>" +
      "<td>" + escapeHtml(log.fuel_type)             + "</td>" +
      "<td>" + litresDisplay                         + "</td>" +
      "<td>" + costDisplay                           + "</td>" +
      "<td>" + odoDisplay                            + "</td>" +
      "<td>" + dateDisplay                           + "</td>" +
      "<td>" +
        '<button class="btn-icon btn-edit" ' +
          'aria-label="Edit fuel log ' + escapeHtml(String(log.fuel_id)) + '" ' +
          'data-id="' + log.fuel_id + '">' +
          "Edit" +
        "</button>" +
        '<button class="btn-icon btn-delete" ' +
          'aria-label="Delete fuel log ' + escapeHtml(String(log.fuel_id)) + '" ' +
          'data-id="' + log.fuel_id + '">' +
          "Delete" +
        "</button>" +
      "</td>";

    // Attach Edit listener
    const editBtn = tr.querySelector(".btn-edit");
    if (editBtn) {
      editBtn.addEventListener("click", function () {
        openFuelEditModal(log);
      });
    }

    // Attach Delete listener
    const deleteBtn = tr.querySelector(".btn-delete");
    if (deleteBtn) {
      deleteBtn.addEventListener("click", function () {
        handleDeleteFuel(log.fuel_id, log.vehicle);
      });
    }

    fuelTableBody.appendChild(tr);
  });
}

/* ═══════════════════════════════════════════════════════════════════
   SHOW FUEL EMPTY STATE
   Toggles the fuel empty-state message element.

   @param {boolean} show — true to display the empty state
═══════════════════════════════════════════════════════════════════ */
function showFuelEmptyState(show) {
  if (!fuelEmptyState) return;

  if (show) {
    fuelEmptyState.classList.remove("hidden");
    fuelEmptyState.classList.add("visible");
  } else {
    fuelEmptyState.classList.add("hidden");
    fuelEmptyState.classList.remove("visible");
  }
}

/* ═══════════════════════════════════════════════════════════════════
   ████████████████████████████████████████████████████████████████
   FUEL — MODAL (OPEN / CLOSE)
   ████████████████████████████████████████████████████████████████
═══════════════════════════════════════════════════════════════════ */

/* ═══════════════════════════════════════════════════════════════════
   OPEN FUEL ADD MODAL
   Resets all fuel form fields, sets editingFuelId to null (POST),
   and makes the fuel modal visible.
═══════════════════════════════════════════════════════════════════ */
function openFuelAddModal() {
  // Ensure we are in add mode
  editingFuelId = null;

  // Update modal heading
  if (fuelModalTitle) fuelModalTitle.textContent = "Add Fuel Log";

  // Reset all fields to empty / defaults
  if (fuelForm) fuelForm.reset();

  // Clear any lingering validation errors
  clearFuelFieldErrors();

  // Clear the hidden id field
  if (fieldFuelId) fieldFuelId.value = "";

  // Restore the submit button label
  setFuelSubmitLoading(false);

  // Make the modal visible
  if (fuelModal) {
    fuelModal.classList.add("open");
    fuelModal.setAttribute("aria-hidden", "false");
  }

  // Focus the vehicle field for keyboard accessibility
  if (fieldFuelVehicle) fieldFuelVehicle.focus();
}

/* ═══════════════════════════════════════════════════════════════════
   OPEN FUEL EDIT MODAL
   Pre-fills all fuel form fields from an existing fuel log object.
   Sets editingFuelId so handleFuelSubmit uses PUT.

   @param {Object} log — the fuel log object from the API
═══════════════════════════════════════════════════════════════════ */
function openFuelEditModal(log) {
  // Store id to signal PUT mode in handleFuelSubmit
  editingFuelId = log.fuel_id;

  // Update modal heading
  if (fuelModalTitle) fuelModalTitle.textContent = "Edit Fuel Log";

  // Clear any previous validation errors
  clearFuelFieldErrors();

  // Populate fields using the API field names
  if (fieldFuelId)      fieldFuelId.value      = log.fuel_id;
  if (fieldFuelVehicle) fieldFuelVehicle.value  = log.vehicle;
  if (fieldFuelType)    fieldFuelType.value     = log.fuel_type;
  if (fieldLitres)      fieldLitres.value       = log.litres;
  if (fieldFuelCost)    fieldFuelCost.value     = log.cost;
  if (fieldFuelDate)    fieldFuelDate.value     = formatDateForInput(log.date);
  if (fieldOdoReading)  fieldOdoReading.value   = log.odometer_reading || "";
  if (fieldFuelStation) fieldFuelStation.value  = log.fuel_station || "";
  if (fieldFuelNotes)   fieldFuelNotes.value    = log.notes || "";

  // Restore submit button label
  setFuelSubmitLoading(false);

  // Make the modal visible
  if (fuelModal) {
    fuelModal.classList.add("open");
    fuelModal.setAttribute("aria-hidden", "false");
  }

  // Focus the first field for keyboard accessibility
  if (fieldFuelVehicle) fieldFuelVehicle.focus();
}

/* ═══════════════════════════════════════════════════════════════════
   CLOSE FUEL MODAL
   Hides the fuel modal, resets editingFuelId, and clears the form.
═══════════════════════════════════════════════════════════════════ */
function closeFuelModal() {
  if (!fuelModal) return;

  // Hide the modal
  fuelModal.classList.remove("open");
  fuelModal.setAttribute("aria-hidden", "true");

  // Reset state
  editingFuelId = null;
  if (fuelForm) fuelForm.reset();
  clearFuelFieldErrors();
  setFuelSubmitLoading(false);
}

/* ═══════════════════════════════════════════════════════════════════
   ████████████████████████████████████████████████████████████████
   FUEL — VALIDATE & SUBMIT
   ████████████████████████████████████████████████████████████████
═══════════════════════════════════════════════════════════════════ */

/* ═══════════════════════════════════════════════════════════════════
   VALIDATE FUEL FORM
   Runs all fuel field-level validation rules.
   Returns true only when every rule passes.

   Rules:
   - vehicle   : required, non-empty
   - fuel_type : required, non-empty
   - litres    : required, must be > 0
   - cost      : required, must be > 0
   - date      : required, must be a valid calendar date

   @returns {boolean} true if the fuel form is valid
═══════════════════════════════════════════════════════════════════ */
function validateFuelForm() {
  // Clear all previous errors before re-running rules
  clearFuelFieldErrors();

  let isValid = true;

  // ── Vehicle ──────────────────────────────────────────────────
  const vehicleVal = fieldFuelVehicle ? fieldFuelVehicle.value.trim() : "";
  if (!vehicleVal) {
    showFieldError(errFuelVehicle, "Vehicle is required.");
    isValid = false;
  }

  // ── Fuel Type ────────────────────────────────────────────────
  const fuelTypeVal = fieldFuelType ? fieldFuelType.value.trim() : "";
  if (!fuelTypeVal) {
    showFieldError(errFuelType, "Fuel type is required.");
    isValid = false;
  }

  // ── Litres ───────────────────────────────────────────────────
  const litresVal = fieldLitres ? Number(fieldLitres.value) : NaN;
  if (!fieldLitres || fieldLitres.value.trim() === "") {
    showFieldError(errLitres, "Litres is required.");
    isValid = false;
  } else if (isNaN(litresVal) || litresVal <= 0) {
    showFieldError(errLitres, "Litres must be greater than 0.");
    isValid = false;
  }

  // ── Cost ─────────────────────────────────────────────────────
  const costVal = fieldFuelCost ? Number(fieldFuelCost.value) : NaN;
  if (!fieldFuelCost || fieldFuelCost.value.trim() === "") {
    showFieldError(errFuelCost, "Fuel cost is required.");
    isValid = false;
  } else if (isNaN(costVal) || costVal <= 0) {
    showFieldError(errFuelCost, "Fuel cost must be greater than 0.");
    isValid = false;
  }

  // ── Date ─────────────────────────────────────────────────────
  const dateVal = fieldFuelDate ? fieldFuelDate.value.trim() : "";
  if (!dateVal) {
    showFieldError(errFuelDate, "Date is required.");
    isValid = false;
  } else if (!isValidDate(dateVal)) {
    showFieldError(errFuelDate, "Enter a valid date.");
    isValid = false;
  }

  return isValid;
}

/* ═══════════════════════════════════════════════════════════════════
   COLLECT FUEL FORM DATA
   Reads all fuel form fields and returns a plain object that matches
   the API JSON schema for fuel logs.

   @returns {Object} fuel payload ready for POST or PUT
═══════════════════════════════════════════════════════════════════ */
function collectFuelFormData() {
  return {
    vehicle          : fieldFuelVehicle ? fieldFuelVehicle.value.trim()  : "",
    fuel_type        : fieldFuelType    ? fieldFuelType.value.trim()     : "",
    litres           : fieldLitres      ? Number(fieldLitres.value)      : 0,
    cost             : fieldFuelCost    ? Number(fieldFuelCost.value)    : 0,
    date             : fieldFuelDate    ? fieldFuelDate.value            : "",
    odometer_reading : fieldOdoReading  ? (fieldOdoReading.value
                                            ? Number(fieldOdoReading.value)
                                            : null)
                                        : null,
    fuel_station     : fieldFuelStation ? fieldFuelStation.value.trim()  : "",
    notes            : fieldFuelNotes   ? fieldFuelNotes.value.trim()    : "",
  };
}

/* ═══════════════════════════════════════════════════════════════════
   HANDLE FUEL SUBMIT
   Called on the fuel form submit event.
   Validates the form, then calls:
     POST /api/fuel      — when editingFuelId is null (add mode)
     PUT  /api/fuel/:id  — when editingFuelId is set  (edit mode)

   On success : closes the modal, reloads the fuel table, shows banner.
   On failure : shows error banner, re-enables the submit button.
═══════════════════════════════════════════════════════════════════ */
async function handleFuelSubmit(e) {
  // Prevent default HTML form submission
  e.preventDefault();

  // Run validation — abort if any field fails
  if (!validateFuelForm()) return;

  // Build the request payload
  const payload = collectFuelFormData();

  // Determine HTTP method and URL
  const isEditMode = editingFuelId !== null;
  const method     = isEditMode ? "PUT" : "POST";
  const url        = isEditMode
    ? FUEL_API_BASE + "/fuel/" + editingFuelId
    : FUEL_API_BASE + "/fuel";

  // Disable submit button to prevent double-submission
  setFuelSubmitLoading(true);

  try {
    const response = await fetch(url, {
      method  : method,
      headers : { "Content-Type": "application/json" },
      body    : JSON.stringify(payload),
    });

    // Treat any non-2xx response as a failure
    if (!response.ok) {
      let serverMsg = "Server returned status " + response.status;
      try {
        const errBody = await response.json();
        if (errBody && errBody.message) serverMsg = errBody.message;
      } catch (_) { /* ignore */ }
      throw new Error(serverMsg);
    }

    // Success — close, reload, notify
    closeFuelModal();
    await loadFuel();
    showBanner(
      "success",
      isEditMode ? "Fuel log updated successfully." : "Fuel log added successfully."
    );

  } catch (error) {
    showBanner("error", "Unable to connect to backend server.");
    console.error("[fuel.js] handleFuelSubmit error:", error);
    setFuelSubmitLoading(false);
  }
}

/* ═══════════════════════════════════════════════════════════════════
   HANDLE DELETE FUEL
   Prompts for confirmation, then calls DELETE /api/fuel/:id.

   On success : reloads the fuel table, shows success banner.
   On failure : shows error banner.

   @param {number} id      — fuel_id to delete
   @param {string} vehicle — shown in the confirmation dialog
═══════════════════════════════════════════════════════════════════ */
async function handleDeleteFuel(id, vehicle) {
  // Confirm before making a destructive API call
  const confirmed = window.confirm(
    'Delete fuel log for vehicle "' + vehicle + '"?\n\nThis action cannot be undone.'
  );

  if (!confirmed) return;

  try {
    const response = await fetch(FUEL_API_BASE + "/fuel/" + id, {
      method: "DELETE",
    });

    if (!response.ok) {
      throw new Error("Server returned status " + response.status);
    }

    // Reload the fuel table
    await loadFuel();
    showBanner("success", "Fuel log deleted successfully.");

  } catch (error) {
    showBanner("error", "Unable to connect to backend server.");
    console.error("[fuel.js] handleDeleteFuel error:", error);
  }
}

/* ═══════════════════════════════════════════════════════════════════
   APPLY FUEL FILTERS
   Reads the search input and fuel type dropdown, then filters
   fuelList and re-renders the table.

   Filters applied with AND logic:
   - searchVehicle : case-insensitive substring on log.vehicle
   - fuelType      : exact match on log.fuel_type ("" = show all)
═══════════════════════════════════════════════════════════════════ */
function applyFuelFilters() {
  const searchVehicle = searchFuelVehicle
    ? searchFuelVehicle.value.trim().toLowerCase()
    : "";
  const fuelType = fuelTypeFilter ? fuelTypeFilter.value : "";

  const filtered = fuelList.filter(function (log) {
    // ── Vehicle search ─────────────────────────────────────────
    if (searchVehicle) {
      const veh = log.vehicle ? log.vehicle.toLowerCase() : "";
      if (!veh.includes(searchVehicle)) return false;
    }

    // ── Fuel type filter ───────────────────────────────────────
    if (fuelType && log.fuel_type !== fuelType) return false;

    return true;
  });

  renderFuelTable(filtered);
}

/* ═══════════════════════════════════════════════════════════════════
   ████████████████████████████████████████████████████████████████
   EXPENSES — LOAD & RENDER
   ████████████████████████████████████████████████████████████████
═══════════════════════════════════════════════════════════════════ */

/* ═══════════════════════════════════════════════════════════════════
   LOAD EXPENSES
   Fetches all expense records from GET /api/expenses.
   Stores the result in expenseList and triggers a table render.

   On network failure or non-OK status, the error banner is shown.
   No fallback / dummy data is ever created.
═══════════════════════════════════════════════════════════════════ */
async function loadExpenses() {
  const container = document.querySelector("#expense-table-body") ? document.querySelector("#expense-table-body").closest(".table-container") : document.body;
  if (typeof showLoadingOverlay === "function") {
    showLoadingOverlay(container, true);
  }
  try {
    // Show a temporary loading row while the request is in flight
    if (expenseTableBody) {
      expenseTableBody.innerHTML =
        '<tr><td colspan="7" class="table-loading">Loading expenses...</td></tr>';
    }

    // Call the API
    const response = await fetch(FUEL_API_BASE + "/expenses");

    // Treat any non-2xx status as a failure
    if (!response.ok) {
      throw new Error("Server returned status " + response.status);
    }

    // Parse the JSON array
    const body = await response.json();
    expenseList = body.data || body || [];

    // Render the full list
    renderExpenseTable(expenseList);

  } catch (error) {
    if (typeof handleApiError === "function") {
      handleApiError(error, "Unable to load expenses from server.");
    }
    showBanner("error", "Unable to connect to backend server.");
    if (expenseTableBody) expenseTableBody.innerHTML = "";
    showExpenseEmptyState(true);
    console.error("[fuel.js] loadExpenses error:", error);
  } finally {
    if (typeof showLoadingOverlay === "function") {
      showLoadingOverlay(container, false);
    }
  }
}

/* ═══════════════════════════════════════════════════════════════════
   RENDER EXPENSE TABLE
   Clears the expense table body and renders one <tr> per expense.
   Manages expense empty-state visibility.

   Expected fields on each expense object:
     expense_id, vehicle, expense_type, amount,
     date, reference, notes

   @param {Array} records — array of expense objects to display
═══════════════════════════════════════════════════════════════════ */
function renderExpenseTable(records) {
  if (!expenseTableBody) return;

  // Clear previous rows
  expenseTableBody.innerHTML = "";

  if (!records || records.length === 0) {
    showExpenseEmptyState(true);
    return;
  }

  // Data present — hide the empty state
  showExpenseEmptyState(false);

  // Build one <tr> per expense record
  records.forEach(function (expense) {
    const tr = document.createElement("tr");
    tr.setAttribute("data-id", expense.expense_id);

    // Format values for display
    const dateDisplay   = formatDate(expense.date);
    const amountDisplay = formatCurrency(expense.amount);

    // Build the row HTML using API field names
    tr.innerHTML =
      "<td>" + escapeHtml(String(expense.expense_id))  + "</td>" +
      "<td>" + escapeHtml(expense.vehicle)             + "</td>" +
      "<td>" + escapeHtml(expense.expense_type)        + "</td>" +
      "<td>" + amountDisplay                           + "</td>" +
      "<td>" + dateDisplay                             + "</td>" +
      "<td>" + escapeHtml(expense.reference || "—")    + "</td>" +
      "<td>" +
        '<button class="btn-icon btn-edit" ' +
          'aria-label="Edit expense ' + escapeHtml(String(expense.expense_id)) + '" ' +
          'data-id="' + expense.expense_id + '">' +
          "Edit" +
        "</button>" +
        '<button class="btn-icon btn-delete" ' +
          'aria-label="Delete expense ' + escapeHtml(String(expense.expense_id)) + '" ' +
          'data-id="' + expense.expense_id + '">' +
          "Delete" +
        "</button>" +
      "</td>";

    // Attach Edit listener
    const editBtn = tr.querySelector(".btn-edit");
    if (editBtn) {
      editBtn.addEventListener("click", function () {
        openExpenseEditModal(expense);
      });
    }

    // Attach Delete listener
    const deleteBtn = tr.querySelector(".btn-delete");
    if (deleteBtn) {
      deleteBtn.addEventListener("click", function () {
        handleDeleteExpense(expense.expense_id, expense.vehicle, expense.expense_type);
      });
    }

    expenseTableBody.appendChild(tr);
  });
}

/* ═══════════════════════════════════════════════════════════════════
   SHOW EXPENSE EMPTY STATE
   Toggles the expense empty-state message element.

   @param {boolean} show — true to display the empty state
═══════════════════════════════════════════════════════════════════ */
function showExpenseEmptyState(show) {
  if (!expenseEmptyState) return;

  if (show) {
    expenseEmptyState.classList.remove("hidden");
    expenseEmptyState.classList.add("visible");
  } else {
    expenseEmptyState.classList.add("hidden");
    expenseEmptyState.classList.remove("visible");
  }
}

/* ═══════════════════════════════════════════════════════════════════
   ████████████████████████████████████████████████████████████████
   EXPENSES — MODAL (OPEN / CLOSE)
   ████████████████████████████████████████████████████████████████
═══════════════════════════════════════════════════════════════════ */

/* ═══════════════════════════════════════════════════════════════════
   OPEN EXPENSE ADD MODAL
   Resets all expense form fields, sets editingExpenseId to null,
   and makes the expense modal visible.
═══════════════════════════════════════════════════════════════════ */
function openExpenseAddModal() {
  // Ensure we are in add mode
  editingExpenseId = null;

  // Update modal heading
  if (expenseModalTitle) expenseModalTitle.textContent = "Add Expense";

  // Reset all fields
  if (expenseForm) expenseForm.reset();

  // Clear any lingering validation errors
  clearExpenseFieldErrors();

  // Clear the hidden id field
  if (fieldExpenseId) fieldExpenseId.value = "";

  // Restore the submit button label
  setExpenseSubmitLoading(false);

  // Make the modal visible
  if (expenseModal) {
    expenseModal.classList.add("open");
    expenseModal.setAttribute("aria-hidden", "false");
  }

  // Focus the vehicle field for keyboard accessibility
  if (fieldExpenseVehicle) fieldExpenseVehicle.focus();
}

/* ═══════════════════════════════════════════════════════════════════
   OPEN EXPENSE EDIT MODAL
   Pre-fills all expense form fields from an existing expense object.
   Sets editingExpenseId so handleExpenseSubmit uses PUT.

   @param {Object} expense — the expense object from the API
═══════════════════════════════════════════════════════════════════ */
function openExpenseEditModal(expense) {
  // Store id to signal PUT mode
  editingExpenseId = expense.expense_id;

  // Update modal heading
  if (expenseModalTitle) expenseModalTitle.textContent = "Edit Expense";

  // Clear any previous validation errors
  clearExpenseFieldErrors();

  // Populate fields using the API field names
  if (fieldExpenseId)      fieldExpenseId.value      = expense.expense_id;
  if (fieldExpenseVehicle) fieldExpenseVehicle.value  = expense.vehicle;
  if (fieldExpenseType)    fieldExpenseType.value     = expense.expense_type;
  if (fieldExpenseAmount)  fieldExpenseAmount.value   = expense.amount;
  if (fieldExpenseDate)    fieldExpenseDate.value     = formatDateForInput(expense.date);
  if (fieldExpenseRef)     fieldExpenseRef.value      = expense.reference || "";
  if (fieldExpenseNotes)   fieldExpenseNotes.value    = expense.notes || "";

  // Restore submit button label
  setExpenseSubmitLoading(false);

  // Make the modal visible
  if (expenseModal) {
    expenseModal.classList.add("open");
    expenseModal.setAttribute("aria-hidden", "false");
  }

  // Focus the first field for keyboard accessibility
  if (fieldExpenseVehicle) fieldExpenseVehicle.focus();
}

/* ═══════════════════════════════════════════════════════════════════
   CLOSE EXPENSE MODAL
   Hides the expense modal, resets editingExpenseId, clears the form.
═══════════════════════════════════════════════════════════════════ */
function closeExpenseModal() {
  if (!expenseModal) return;

  // Hide the modal
  expenseModal.classList.remove("open");
  expenseModal.setAttribute("aria-hidden", "true");

  // Reset state
  editingExpenseId = null;
  if (expenseForm) expenseForm.reset();
  clearExpenseFieldErrors();
  setExpenseSubmitLoading(false);
}

/* ═══════════════════════════════════════════════════════════════════
   ████████████████████████████████████████████████████████████████
   EXPENSES — VALIDATE & SUBMIT
   ████████████████████████████████████████████████████████████████
═══════════════════════════════════════════════════════════════════ */

/* ═══════════════════════════════════════════════════════════════════
   VALIDATE EXPENSE FORM
   Runs all expense field-level validation rules.
   Returns true only when every rule passes.

   Rules:
   - vehicle      : required, non-empty
   - expense_type : required, non-empty
   - amount       : required, must be > 0
   - date         : required, valid calendar date

   @returns {boolean} true if the expense form is valid
═══════════════════════════════════════════════════════════════════ */
function validateExpenseForm() {
  // Clear all previous errors before re-running rules
  clearExpenseFieldErrors();

  let isValid = true;

  // ── Vehicle ──────────────────────────────────────────────────
  const vehicleVal = fieldExpenseVehicle ? fieldExpenseVehicle.value.trim() : "";
  if (!vehicleVal) {
    showFieldError(errExpenseVehicle, "Vehicle is required.");
    isValid = false;
  }

  // ── Expense Type ─────────────────────────────────────────────
  const typeVal = fieldExpenseType ? fieldExpenseType.value.trim() : "";
  if (!typeVal) {
    showFieldError(errExpenseType, "Expense type is required.");
    isValid = false;
  }

  // ── Amount ───────────────────────────────────────────────────
  const amountVal = fieldExpenseAmount ? Number(fieldExpenseAmount.value) : NaN;
  if (!fieldExpenseAmount || fieldExpenseAmount.value.trim() === "") {
    showFieldError(errExpenseAmount, "Amount is required.");
    isValid = false;
  } else if (isNaN(amountVal) || amountVal <= 0) {
    showFieldError(errExpenseAmount, "Amount must be greater than 0.");
    isValid = false;
  }

  // ── Date ─────────────────────────────────────────────────────
  const dateVal = fieldExpenseDate ? fieldExpenseDate.value.trim() : "";
  if (!dateVal) {
    showFieldError(errExpenseDate, "Date is required.");
    isValid = false;
  } else if (!isValidDate(dateVal)) {
    showFieldError(errExpenseDate, "Enter a valid date.");
    isValid = false;
  }

  return isValid;
}

/* ═══════════════════════════════════════════════════════════════════
   COLLECT EXPENSE FORM DATA
   Reads all expense form fields and returns a plain object matching
   the API JSON schema for expenses.

   @returns {Object} expense payload ready for POST or PUT
═══════════════════════════════════════════════════════════════════ */
function collectExpenseFormData() {
  return {
    vehicle      : fieldExpenseVehicle ? fieldExpenseVehicle.value.trim() : "",
    expense_type : fieldExpenseType    ? fieldExpenseType.value.trim()    : "",
    amount       : fieldExpenseAmount  ? Number(fieldExpenseAmount.value) : 0,
    date         : fieldExpenseDate    ? fieldExpenseDate.value           : "",
    reference    : fieldExpenseRef     ? fieldExpenseRef.value.trim()     : "",
    notes        : fieldExpenseNotes   ? fieldExpenseNotes.value.trim()   : "",
  };
}

/* ═══════════════════════════════════════════════════════════════════
   HANDLE EXPENSE SUBMIT
   Called on the expense form submit event.
   Validates the form, then calls:
     POST /api/expenses      — when editingExpenseId is null (add)
     PUT  /api/expenses/:id  — when editingExpenseId is set  (edit)

   On success : closes the modal, reloads the expense table, shows banner.
   On failure : shows error banner, re-enables the submit button.
═══════════════════════════════════════════════════════════════════ */
async function handleExpenseSubmit(e) {
  // Prevent default HTML form submission
  e.preventDefault();

  // Run validation — abort if any field fails
  if (!validateExpenseForm()) return;

  // Build the request payload
  const payload = collectExpenseFormData();

  // Determine HTTP method and URL
  const isEditMode = editingExpenseId !== null;
  const method     = isEditMode ? "PUT" : "POST";
  const url        = isEditMode
    ? FUEL_API_BASE + "/expenses/" + editingExpenseId
    : FUEL_API_BASE + "/expenses";

  // Disable submit button to prevent double-submission
  setExpenseSubmitLoading(true);

  try {
    const response = await fetch(url, {
      method  : method,
      headers : { "Content-Type": "application/json" },
      body    : JSON.stringify(payload),
    });

    // Treat any non-2xx response as a failure
    if (!response.ok) {
      let serverMsg = "Server returned status " + response.status;
      try {
        const errBody = await response.json();
        if (errBody && errBody.message) serverMsg = errBody.message;
      } catch (_) { /* ignore */ }
      throw new Error(serverMsg);
    }

    // Success — close, reload, notify
    closeExpenseModal();
    await loadExpenses();
    showBanner(
      "success",
      isEditMode ? "Expense updated successfully." : "Expense added successfully."
    );

  } catch (error) {
    showBanner("error", "Unable to connect to backend server.");
    console.error("[fuel.js] handleExpenseSubmit error:", error);
    setExpenseSubmitLoading(false);
  }
}

/* ═══════════════════════════════════════════════════════════════════
   HANDLE DELETE EXPENSE
   Prompts for confirmation, then calls DELETE /api/expenses/:id.

   On success : reloads the expense table, shows success banner.
   On failure : shows error banner.

   @param {number} id          — expense_id to delete
   @param {string} vehicle     — shown in confirmation dialog
   @param {string} expenseType — shown in confirmation dialog
═══════════════════════════════════════════════════════════════════ */
async function handleDeleteExpense(id, vehicle, expenseType) {
  // Confirm before the destructive API call
  const confirmed = window.confirm(
    'Delete "' + expenseType + '" expense for vehicle "' + vehicle + '"?\n\nThis action cannot be undone.'
  );

  if (!confirmed) return;

  try {
    const response = await fetch(FUEL_API_BASE + "/expenses/" + id, {
      method: "DELETE",
    });

    if (!response.ok) {
      throw new Error("Server returned status " + response.status);
    }

    // Reload the expense table
    await loadExpenses();
    showBanner("success", "Expense deleted successfully.");

  } catch (error) {
    showBanner("error", "Unable to connect to backend server.");
    console.error("[fuel.js] handleDeleteExpense error:", error);
  }
}

/* ═══════════════════════════════════════════════════════════════════
   APPLY EXPENSE FILTERS
   Reads the expense search input and type dropdown, filters
   expenseList and re-renders the table.

   Filters applied with AND logic:
   - searchVehicle : case-insensitive substring on expense.vehicle
   - expenseType   : exact match on expense.expense_type ("" = all)
═══════════════════════════════════════════════════════════════════ */
function applyExpenseFilters() {
  const searchVehicle = searchExpenseVehicle
    ? searchExpenseVehicle.value.trim().toLowerCase()
    : "";
  const expenseType = expenseTypeFilter ? expenseTypeFilter.value : "";

  const filtered = expenseList.filter(function (expense) {
    // ── Vehicle search ─────────────────────────────────────────
    if (searchVehicle) {
      const veh = expense.vehicle ? expense.vehicle.toLowerCase() : "";
      if (!veh.includes(searchVehicle)) return false;
    }

    // ── Expense type filter ────────────────────────────────────
    if (expenseType && expense.expense_type !== expenseType) return false;

    return true;
  });

  renderExpenseTable(filtered);
}

/* ═══════════════════════════════════════════════════════════════════
   ████████████████████████████████████████████████████████████████
   SHARED HELPERS
   ████████████████████████████████████████████████████████████████
═══════════════════════════════════════════════════════════════════ */

/* ═══════════════════════════════════════════════════════════════════
   HELPER — isValidDate
   Returns true when the string can be parsed into a real calendar
   date by the browser's Date constructor.

   @param  {string} dateStr — raw date string
   @returns {boolean}
═══════════════════════════════════════════════════════════════════ */
function isValidDate(dateStr) {
  if (!dateStr || typeof dateStr !== "string") return false;
  const parsed = new Date(dateStr);
  return !isNaN(parsed.getTime());
}

/* ═══════════════════════════════════════════════════════════════════
   HELPER — formatDate
   Converts an ISO-8601 date string from the API into a human-
   readable display string.

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
   HELPER — formatDateForInput
   Converts an API date string (may include a time component) into
   YYYY-MM-DD format required by <input type="date">.

   @param  {string} dateStr — raw date from the API
   @returns {string} YYYY-MM-DD or "" if invalid
═══════════════════════════════════════════════════════════════════ */
function formatDateForInput(dateStr) {
  if (!dateStr) return "";
  const parsed = new Date(dateStr);
  if (isNaN(parsed.getTime())) return "";

  const year  = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, "0");
  const day   = String(parsed.getDate()).padStart(2, "0");

  return year + "-" + month + "-" + day;
}

/* ═══════════════════════════════════════════════════════════════════
   HELPER — formatCurrency
   Returns a locale-formatted INR currency string.

   @param  {number} value — numeric monetary value
   @returns {string} formatted string or "—" if invalid
═══════════════════════════════════════════════════════════════════ */
function formatCurrency(value) {
  if (value === null || value === undefined || isNaN(Number(value))) {
    return "—";
  }
  return Number(value).toLocaleString("en-IN", {
    style                : "currency",
    currency             : "INR",
    maximumFractionDigits: 0,
  });
}

/* ═══════════════════════════════════════════════════════════════════
   HELPER — escapeHtml
   Escapes special HTML characters to prevent XSS when inserting
   API data directly into innerHTML.

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
   ████████████████████████████████████████████████████████████████
   EVENT LISTENERS
   ████████████████████████████████████████████████████████████████
═══════════════════════════════════════════════════════════════════ */

/* ═══════════════════════════════════════════════════════════════════
   ATTACH FUEL EVENT LISTENERS
   Wires all fuel-section interactive elements to their handlers.
   Called once during initialisation.
═══════════════════════════════════════════════════════════════════ */
function attachFuelEventListeners() {

  // ── "Add Fuel Log" button — open modal in add mode
  if (addFuelBtn) {
    addFuelBtn.addEventListener("click", openFuelAddModal);
  }

  // ── Fuel modal close button (× in header)
  if (fuelModalClose) {
    fuelModalClose.addEventListener("click", closeFuelModal);
  }

  // ── Fuel modal cancel button
  if (fuelModalCancel) {
    fuelModalCancel.addEventListener("click", closeFuelModal);
  }

  // ── Click on the fuel modal backdrop closes the modal
  if (fuelModal) {
    fuelModal.addEventListener("click", function (e) {
      if (e.target === fuelModal) closeFuelModal();
    });
  }

  // ── Fuel form submit
  if (fuelForm) {
    fuelForm.addEventListener("submit", handleFuelSubmit);
  }

  // ── Live search — fuel vehicle
  if (searchFuelVehicle) {
    searchFuelVehicle.addEventListener("input", applyFuelFilters);
  }

  // ── Fuel type dropdown filter
  if (fuelTypeFilter) {
    fuelTypeFilter.addEventListener("change", applyFuelFilters);
  }
}

/* ═══════════════════════════════════════════════════════════════════
   ATTACH EXPENSE EVENT LISTENERS
   Wires all expense-section interactive elements to their handlers.
   Called once during initialisation.
═══════════════════════════════════════════════════════════════════ */
function attachExpenseEventListeners() {

  // ── "Add Expense" button — open modal in add mode
  if (addExpenseBtn) {
    addExpenseBtn.addEventListener("click", openExpenseAddModal);
  }

  // ── Expense modal close button (× in header)
  if (expenseModalClose) {
    expenseModalClose.addEventListener("click", closeExpenseModal);
  }

  // ── Expense modal cancel button
  if (expenseModalCancel) {
    expenseModalCancel.addEventListener("click", closeExpenseModal);
  }

  // ── Click on the expense modal backdrop closes the modal
  if (expenseModal) {
    expenseModal.addEventListener("click", function (e) {
      if (e.target === expenseModal) closeExpenseModal();
    });
  }

  // ── Expense form submit
  if (expenseForm) {
    expenseForm.addEventListener("submit", handleExpenseSubmit);
  }

  // ── Live search — expense vehicle
  if (searchExpenseVehicle) {
    searchExpenseVehicle.addEventListener("input", applyExpenseFilters);
  }

  // ── Expense type dropdown filter
  if (expenseTypeFilter) {
    expenseTypeFilter.addEventListener("change", applyExpenseFilters);
  }
}

/* ═══════════════════════════════════════════════════════════════════
   GLOBAL KEYBOARD LISTENER
   Pressing Escape closes whichever modal is currently open.
═══════════════════════════════════════════════════════════════════ */
function attachGlobalKeyListener() {
  document.addEventListener("keydown", function (e) {
    if (e.key !== "Escape") return;

    // Close the fuel modal if it is open
    if (fuelModal && fuelModal.classList.contains("open")) {
      closeFuelModal();
    }

    // Close the expense modal if it is open
    if (expenseModal && expenseModal.classList.contains("open")) {
      closeExpenseModal();
    }
  });
}

/* ═══════════════════════════════════════════════════════════════════
   INIT — initialiseFuelPage
   Entry point for the fuel / expense page.
   Attaches all event listeners, then fetches both data sets
   from their respective APIs in parallel.
═══════════════════════════════════════════════════════════════════ */
async function initialiseFuelPage() {
  // Wire up all interactive elements
  attachFuelEventListeners();
  attachExpenseEventListeners();
  attachGlobalKeyListener();

  // Fetch both tables concurrently — neither blocks the other
  await Promise.all([
    loadFuel(),
    loadExpenses(),
  ]);
}

// Run when the DOM is fully parsed and ready
document.addEventListener("DOMContentLoaded", initialiseFuelPage);

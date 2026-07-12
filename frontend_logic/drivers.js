/**
 * drivers.js — TransitOps ERP
 * Manages the Drivers Management page (drivers.html).
 *
 * Responsibilities:
 *   - Load drivers from GET /api/drivers
 *   - Render the drivers table
 *   - Open / close the Add / Edit modal
 *   - Search by name or license number
 *   - Filter by status
 *   - Submit a driver (POST for new, PUT for edit)
 *   - Delete a driver (DELETE /api/drivers/:id)
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
   All fetch calls build their endpoint URLs from here.
═══════════════════════════════════════════════════════════════════ */
const DRIVERS_API_BASE = "/api";

/* ═══════════════════════════════════════════════════════════════════
   MODULE STATE
   Holds the full driver list returned by the last GET /api/drivers
   and the id of the driver currently being edited (null = add mode).
═══════════════════════════════════════════════════════════════════ */
let driverList    = [];   // populated exclusively from the API
let editingDriverId = null; // driver_id being edited; null means "Add" mode

/* ═══════════════════════════════════════════════════════════════════
   DOM REFERENCES
   All element look-ups are done once here.
   Every function below uses these references.
═══════════════════════════════════════════════════════════════════ */

// ── Table & empty state
const driverTableBody   = document.getElementById("driver-table-body");
const driverEmptyState  = document.getElementById("driver-empty-state");

// ── Search & filter controls
const searchNameInput   = document.getElementById("search-driver-name");
const searchLicInput    = document.getElementById("search-license-number");
const statusFilter      = document.getElementById("filter-driver-status");

// ── "Add Driver" button
const addDriverBtn      = document.getElementById("add-driver-btn");

// ── Modal elements
const driverModal       = document.getElementById("driver-modal");
const driverModalTitle  = document.getElementById("driver-modal-title");
const driverModalClose  = document.getElementById("driver-modal-close");
const driverModalCancel = document.getElementById("driver-modal-cancel");
const driverForm        = document.getElementById("driver-form");

// ── Form fields (names match JSON schema exactly)
const fieldDriverId      = document.getElementById("field-driver-id");       // hidden
const fieldName          = document.getElementById("field-name");
const fieldLicense       = document.getElementById("field-license-number");
const fieldLicCategory   = document.getElementById("field-license-category");
const fieldLicExpiry     = document.getElementById("field-license-expiry");
const fieldPhone         = document.getElementById("field-phone");
const fieldSafetyScore   = document.getElementById("field-safety-score");
const fieldDriverStatus  = document.getElementById("field-driver-status");

// ── Inline field error elements
const errName          = document.getElementById("err-driver-name");
const errLicense       = document.getElementById("err-license-number");
const errLicExpiry     = document.getElementById("err-license-expiry");
const errPhone         = document.getElementById("err-phone");
const errSafetyScore   = document.getElementById("err-safety-score");

// ── Page-level banners
const driverErrorBanner     = document.getElementById("driver-error-banner");
const driverErrorMsg        = document.getElementById("driver-error-message");
const driverSuccessBanner   = document.getElementById("driver-success-banner");
const driverSuccessMsg      = document.getElementById("driver-success-message");

// ── Submit button inside the modal
const driverSubmitBtn   = document.getElementById("driver-submit-btn");

/* ═══════════════════════════════════════════════════════════════════
   UTILITY — showBanner
   Displays the page-level error or success banner with a message.
   The banner auto-dismisses after 5 s (error) or 4 s (success).
   Only one banner is visible at a time.

   @param {"error"|"success"} type — which banner to show
   @param {string}            msg  — message text
═══════════════════════════════════════════════════════════════════ */
function showBanner(type, msg) {
  if (typeof showToast === "function") {
    showToast(msg, type);
  }
  if (type === "error") {
    if (!driverErrorBanner || !driverErrorMsg) return;

    // Set the message text and make the banner visible
    driverErrorMsg.textContent = msg;
    driverErrorBanner.classList.add("visible");
    driverErrorBanner.classList.remove("hidden");

    // Hide success banner if it is showing
    if (driverSuccessBanner) driverSuccessBanner.classList.remove("visible");

    // Auto-dismiss after 5 seconds
    setTimeout(function () {
      driverErrorBanner.classList.remove("visible");
    }, 5000);

  } else if (type === "success") {
    if (!driverSuccessBanner || !driverSuccessMsg) return;

    // Set the message text and make the banner visible
    driverSuccessMsg.textContent = msg;
    driverSuccessBanner.classList.add("visible");
    driverSuccessBanner.classList.remove("hidden");

    // Hide error banner if it is showing
    if (driverErrorBanner) driverErrorBanner.classList.remove("visible");

    // Auto-dismiss after 4 seconds
    setTimeout(function () {
      driverSuccessBanner.classList.remove("visible");
    }, 4000);
  }
}

/* ═══════════════════════════════════════════════════════════════════
   UTILITY — showFieldError / clearFieldError
   Shows or clears a validation message beneath a single field.

   @param {HTMLElement} el  — the error <span> for that field
   @param {string}      msg — validation message (ignored in clear)
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
   Clears every inline field error at once.
   Called before each validation pass and whenever the modal opens.
═══════════════════════════════════════════════════════════════════ */
function clearAllFieldErrors() {
  [errName, errLicense, errLicExpiry, errPhone, errSafetyScore].forEach(
    function (el) { clearFieldError(el); }
  );
}

/* ═══════════════════════════════════════════════════════════════════
   UTILITY — setSubmitLoading
   Disables / re-enables the modal submit button during an API call
   and updates its label to communicate the in-flight state.

   @param {boolean} isLoading — true to enter loading state
═══════════════════════════════════════════════════════════════════ */
function setSubmitLoading(isLoading) {
  if (!driverSubmitBtn) return;

  if (isLoading) {
    driverSubmitBtn.disabled = true;
    driverSubmitBtn.textContent = "Saving..."; // visual feedback
  } else {
    driverSubmitBtn.disabled = false;
    driverSubmitBtn.textContent = "Save Driver"; // restore label
  }
}

/* ═══════════════════════════════════════════════════════════════════
   LOAD DRIVERS
   Fetches all drivers from GET /api/drivers.
   Stores the result in the module-level driverList array, then
   triggers a full table render.

   If the server is unreachable or returns a non-OK status, the
   error banner is shown — no fallback data is created.
═══════════════════════════════════════════════════════════════════ */
async function loadDrivers() {
  const container = document.querySelector(".table-container") || document.body;
  if (typeof showLoadingOverlay === "function") {
    showLoadingOverlay(container, true);
  }
  try {
    // Show a temporary loading row while the request is in flight
    if (driverTableBody) {
      driverTableBody.innerHTML =
        '<tr><td colspan="9" class="table-loading">Loading drivers...</td></tr>';
    }

    // Call the API
    const response = await fetch(DRIVERS_API_BASE + "/drivers");

    // Treat any non-2xx status as a failure
    if (!response.ok) {
      throw new Error("Server returned status " + response.status);
    }

    // Parse the JSON array of driver objects
    const body = await response.json();
    driverList = body.data || body || [];

    // Render the full list
    renderDriverTable(driverList);

  } catch (error) {
    if (typeof handleApiError === "function") {
      handleApiError(error, "Unable to load drivers from server.");
    }
    // Network failure or bad response — show the error banner
    showBanner("error", "Unable to connect to backend server.");

    // Clear the loading placeholder and show the empty state
    if (driverTableBody) driverTableBody.innerHTML = "";
    showEmptyState(true);

    // Log the technical error for debugging
    console.error("[drivers.js] loadDrivers error:", error);
  } finally {
    if (typeof showLoadingOverlay === "function") {
      showLoadingOverlay(container, false);
    }
  }
}

/* ═══════════════════════════════════════════════════════════════════
   RENDER DRIVER TABLE
   Clears the table body and renders one row per driver object in the
   provided array. Handles the empty-state element visibility.

   @param {Array} drivers — array of driver objects to display
═══════════════════════════════════════════════════════════════════ */
function renderDriverTable(drivers) {
  if (!driverTableBody) return;

  // Clear previous rows
  driverTableBody.innerHTML = "";

  if (!drivers || drivers.length === 0) {
    showEmptyState(true);
    return;
  }

  // Data present — hide the empty state
  showEmptyState(false);

  // Build one <tr> per driver object
  drivers.forEach(function (driver) {
    const tr = document.createElement("tr");
    tr.setAttribute("data-id", driver.driver_id);

    // Format expiry date for display (ISO → locale)
    const expiryDisplay = formatDate(driver.license_expiry);

    // Determine whether the licence is expired
    const isExpired     = isLicenceExpired(driver.license_expiry);
    const expiryClass   = isExpired ? "expiry-expired" : "";

    // Map status to a badge CSS class
    const statusBadgeClass = getDriverStatusBadgeClass(driver.status);

    // Build the row using the mandatory JSON field names
    tr.innerHTML =
      "<td>" + escapeHtml(String(driver.driver_id)) + "</td>" +
      "<td>" + escapeHtml(driver.name) + "</td>" +
      "<td>" + escapeHtml(driver.license_number) + "</td>" +
      "<td>" + escapeHtml(driver.license_category) + "</td>" +
      '<td class="' + expiryClass + '">' + expiryDisplay + "</td>" +
      "<td>" + escapeHtml(driver.phone) + "</td>" +
      "<td>" + escapeHtml(String(driver.safety_score)) + " / 100</td>" +
      "<td>" +
        '<span class="status-badge ' + statusBadgeClass + '">' +
          escapeHtml(driver.status) +
        "</span>" +
      "</td>" +
      "<td>" +
        '<button class="btn-icon btn-edit" ' +
          'aria-label="Edit driver ' + escapeHtml(driver.name) + '" ' +
          'data-id="' + driver.driver_id + '">' +
          "Edit" +
        "</button>" +
        '<button class="btn-icon btn-delete" ' +
          'aria-label="Delete driver ' + escapeHtml(driver.name) + '" ' +
          'data-id="' + driver.driver_id + '">' +
          "Delete" +
        "</button>" +
      "</td>";

    // Attach Edit button listener
    const editBtn = tr.querySelector(".btn-edit");
    if (editBtn) {
      editBtn.addEventListener("click", function () {
        openEditModal(driver);
      });
    }

    // Attach Delete button listener
    const deleteBtn = tr.querySelector(".btn-delete");
    if (deleteBtn) {
      deleteBtn.addEventListener("click", function () {
        handleDeleteDriver(driver.driver_id, driver.name);
      });
    }

    driverTableBody.appendChild(tr);
  });
}

/* ═══════════════════════════════════════════════════════════════════
   SHOW EMPTY STATE
   Toggles the empty-state message element.

   @param {boolean} show — true to display the empty state
═══════════════════════════════════════════════════════════════════ */
function showEmptyState(show) {
  if (!driverEmptyState) return;

  if (show) {
    driverEmptyState.classList.remove("hidden");
    driverEmptyState.classList.add("visible");
  } else {
    driverEmptyState.classList.add("hidden");
    driverEmptyState.classList.remove("visible");
  }
}

/* ═══════════════════════════════════════════════════════════════════
   OPEN ADD MODAL
   Resets all form fields, sets editingDriverId to null (POST mode),
   and makes the modal visible.
═══════════════════════════════════════════════════════════════════ */
function openAddModal() {
  // Ensure we are in add mode
  editingDriverId = null;

  // Update modal heading
  if (driverModalTitle) driverModalTitle.textContent = "Add Driver";

  // Reset all fields to empty / defaults
  if (driverForm) driverForm.reset();

  // Clear any lingering validation errors
  clearAllFieldErrors();

  // Clear the hidden id field
  if (fieldDriverId) fieldDriverId.value = "";

  // Restore the submit button in case it was stuck in loading
  setSubmitLoading(false);

  // Show the modal
  if (driverModal) {
    driverModal.classList.add("open");
    driverModal.setAttribute("aria-hidden", "false");
  }

  // Focus the first field for keyboard accessibility
  if (fieldName) fieldName.focus();
}

/* ═══════════════════════════════════════════════════════════════════
   OPEN EDIT MODAL
   Pre-fills all form fields from an existing driver object and
   switches to PUT mode by setting editingDriverId.

   @param {Object} driver — the driver object to edit
═══════════════════════════════════════════════════════════════════ */
function openEditModal(driver) {
  // Store the id so handleSubmit knows to use PUT
  editingDriverId = driver.driver_id;

  // Update modal heading
  if (driverModalTitle) driverModalTitle.textContent = "Edit Driver";

  // Clear validation errors from a previous modal session
  clearAllFieldErrors();

  // Populate fields using the mandatory JSON field names
  if (fieldDriverId)     fieldDriverId.value     = driver.driver_id;
  if (fieldName)         fieldName.value         = driver.name;
  if (fieldLicense)      fieldLicense.value      = driver.license_number;
  if (fieldLicCategory)  fieldLicCategory.value  = driver.license_category;
  if (fieldLicExpiry)    fieldLicExpiry.value     = formatDateForInput(driver.license_expiry);
  if (fieldPhone)        fieldPhone.value         = driver.phone;
  if (fieldSafetyScore)  fieldSafetyScore.value  = driver.safety_score;
  if (fieldDriverStatus) fieldDriverStatus.value  = driver.status;

  // Restore submit button label
  setSubmitLoading(false);

  // Show the modal
  if (driverModal) {
    driverModal.classList.add("open");
    driverModal.setAttribute("aria-hidden", "false");
  }

  // Focus the first field for accessibility
  if (fieldName) fieldName.focus();
}

/* ═══════════════════════════════════════════════════════════════════
   CLOSE MODAL
   Hides the driver modal, resets editingDriverId, and clears
   the form and any validation state.
═══════════════════════════════════════════════════════════════════ */
function closeModal() {
  if (!driverModal) return;

  // Hide the modal
  driverModal.classList.remove("open");
  driverModal.setAttribute("aria-hidden", "true");

  // Reset form state
  editingDriverId = null;
  if (driverForm) driverForm.reset();
  clearAllFieldErrors();
  setSubmitLoading(false);
}

/* ═══════════════════════════════════════════════════════════════════
   VALIDATE FORM
   Runs all field-level validation rules and populates error spans.
   Returns true only when every rule passes.

   Rules:
   - name            : required, non-empty
   - license_number  : required, non-empty
   - phone           : required, non-empty
   - safety_score    : required, numeric, 0 – 100 inclusive
   - license_expiry  : required, must be a valid calendar date

   @returns {boolean} true if the entire form is valid
═══════════════════════════════════════════════════════════════════ */
function validateForm() {
  // Clear all previous error messages before re-running
  clearAllFieldErrors();

  let isValid = true; // flip to false on any failure

  // ── Name ─────────────────────────────────────────────────────
  const nameVal = fieldName ? fieldName.value.trim() : "";
  if (!nameVal) {
    showFieldError(errName, "Driver name is required.");
    isValid = false;
  }

  // ── License Number ───────────────────────────────────────────
  const licVal = fieldLicense ? fieldLicense.value.trim() : "";
  if (!licVal) {
    showFieldError(errLicense, "License number is required.");
    isValid = false;
  }

  // ── License Expiry ───────────────────────────────────────────
  const expiryVal = fieldLicExpiry ? fieldLicExpiry.value.trim() : "";
  if (!expiryVal) {
    showFieldError(errLicExpiry, "License expiry date is required.");
    isValid = false;
  } else if (!isValidDate(expiryVal)) {
    // The value is present but does not parse to a real calendar date
    showFieldError(errLicExpiry, "Enter a valid date.");
    isValid = false;
  }

  // ── Phone ────────────────────────────────────────────────────
  const phoneVal = fieldPhone ? fieldPhone.value.trim() : "";
  if (!phoneVal) {
    showFieldError(errPhone, "Phone number is required.");
    isValid = false;
  }

  // ── Safety Score ─────────────────────────────────────────────
  const scoreVal = fieldSafetyScore ? Number(fieldSafetyScore.value) : NaN;
  if (fieldSafetyScore && fieldSafetyScore.value.trim() === "") {
    showFieldError(errSafetyScore, "Safety score is required.");
    isValid = false;
  } else if (isNaN(scoreVal) || scoreVal < 0 || scoreVal > 100) {
    showFieldError(errSafetyScore, "Safety score must be between 0 and 100.");
    isValid = false;
  }

  return isValid;
}

/* ═══════════════════════════════════════════════════════════════════
   COLLECT FORM DATA
   Reads all form fields and returns a plain object that matches the
   mandatory JSON schema for the drivers API.

   @returns {Object} driver payload ready for POST or PUT
═══════════════════════════════════════════════════════════════════ */
function collectFormData() {
  return {
    name             : fieldName         ? fieldName.value.trim()          : "",
    license_number   : fieldLicense      ? fieldLicense.value.trim()       : "",
    license_category : fieldLicCategory  ? fieldLicCategory.value.trim()   : "",
    license_expiry   : fieldLicExpiry    ? fieldLicExpiry.value             : "",
    phone            : fieldPhone        ? fieldPhone.value.trim()          : "",
    safety_score     : fieldSafetyScore  ? Number(fieldSafetyScore.value)  : 0,
    status           : fieldDriverStatus ? fieldDriverStatus.value          : "Active",
  };
}

/* ═══════════════════════════════════════════════════════════════════
   HANDLE SUBMIT
   Called on the form submit event.
   Validates all fields, then calls:
     POST /api/drivers        — when editingDriverId is null (add mode)
     PUT  /api/drivers/:id    — when editingDriverId is set  (edit mode)

   On success : closes the modal, refreshes the table, shows success banner.
   On failure : shows error banner, re-enables the submit button.
═══════════════════════════════════════════════════════════════════ */
async function handleSubmit(e) {
  // Prevent the default HTML form submission / page reload
  e.preventDefault();

  // Run all validation rules — abort if any field fails
  if (!validateForm()) return;

  // Build the request payload from the current field values
  const payload = collectFormData();

  // Determine HTTP method and URL from the current mode
  const isEditMode = editingDriverId !== null;
  const method     = isEditMode ? "PUT" : "POST";
  const url        = isEditMode
    ? DRIVERS_API_BASE + "/drivers/" + editingDriverId
    : DRIVERS_API_BASE + "/drivers";

  // Disable the submit button to prevent double-submission
  setSubmitLoading(true);

  try {
    const response = await fetch(url, {
      method  : method,
      headers : { "Content-Type": "application/json" },
      body    : JSON.stringify(payload),
    });

    // Treat any non-2xx response as a failure
    if (!response.ok) {
      // Attempt to read a server-provided error message body
      let serverMsg = "Server returned status " + response.status;
      try {
        const errBody = await response.json();
        if (errBody && errBody.message) serverMsg = errBody.message;
      } catch (_) {
        // Ignore JSON parse failure — use the status code message
      }
      throw new Error(serverMsg);
    }

    // Success — close the modal and reload the table from the API
    closeModal();
    await loadDrivers();

    // Show a contextual success message
    showBanner(
      "success",
      isEditMode ? "Driver updated successfully." : "Driver added successfully."
    );

  } catch (error) {
    // Network failure or server error
    showBanner("error", "Unable to connect to backend server.");
    console.error("[drivers.js] handleSubmit error:", error);

    // Re-enable the button so the user can retry
    setSubmitLoading(false);
  }
}

/* ═══════════════════════════════════════════════════════════════════
   HANDLE DELETE DRIVER
   Prompts for confirmation, then calls DELETE /api/drivers/:id.

   On success : reloads the table, shows success banner.
   On failure : shows error banner.

   @param {number} id   — driver_id to delete
   @param {string} name — shown in the confirmation dialog
═══════════════════════════════════════════════════════════════════ */
async function handleDeleteDriver(id, name) {
  // Ask the user to confirm before making a destructive API call
  const confirmed = window.confirm(
    'Delete driver "' + name + '"?\n\nThis action cannot be undone.'
  );

  if (!confirmed) return; // user cancelled — do nothing

  try {
    const response = await fetch(DRIVERS_API_BASE + "/drivers/" + id, {
      method: "DELETE",
    });

    // Treat any non-2xx response as a failure
    if (!response.ok) {
      throw new Error("Server returned status " + response.status);
    }

    // Reload the table to reflect the deletion
    await loadDrivers();

    // Notify the user
    showBanner("success", "Driver deleted successfully.");

  } catch (error) {
    showBanner("error", "Unable to connect to backend server.");
    console.error("[drivers.js] handleDeleteDriver error:", error);
  }
}

/* ═══════════════════════════════════════════════════════════════════
   APPLY FILTERS
   Reads the current search inputs and status dropdown, then filters
   the in-memory driverList and re-renders the table.

   All three filters are applied together (AND logic):
   - searchName : case-insensitive substring match on driver.name
   - searchLic  : case-insensitive substring match on driver.license_number
   - status     : exact match on driver.status ("" = show all)
═══════════════════════════════════════════════════════════════════ */
function applyFilters() {
  // Read the current filter values (trimmed and lowercased for comparison)
  const searchName = searchNameInput ? searchNameInput.value.trim().toLowerCase() : "";
  const searchLic  = searchLicInput  ? searchLicInput.value.trim().toLowerCase()  : "";
  const status     = statusFilter    ? statusFilter.value                          : "";

  // Filter the full in-memory driverList
  const filtered = driverList.filter(function (driver) {

    // ── Name filter ────────────────────────────────────────────
    if (searchName) {
      const driverName = driver.name ? driver.name.toLowerCase() : "";
      if (!driverName.includes(searchName)) return false;
    }

    // ── License number filter ──────────────────────────────────
    if (searchLic) {
      const licNum = driver.license_number
        ? driver.license_number.toLowerCase()
        : "";
      if (!licNum.includes(searchLic)) return false;
    }

    // ── Status filter ──────────────────────────────────────────
    if (status && driver.status !== status) return false;

    return true; // passes all filters
  });

  // Re-render the table with only the matching records
  renderDriverTable(filtered);
}

/* ═══════════════════════════════════════════════════════════════════
   HELPER — getDriverStatusBadgeClass
   Maps a driver status string to a CSS badge class.

   @param  {string} status — e.g. "Active", "Off Duty", "On Leave"
   @returns {string} CSS class name
═══════════════════════════════════════════════════════════════════ */
function getDriverStatusBadgeClass(status) {
  switch (status) {
    case "Active":    return "badge-active";
    case "Off Duty":  return "badge-available";   // reuse colour token
    case "On Leave":  return "badge-maintenance";
    case "Suspended": return "badge-retired";
    default:          return "badge-default";
  }
}

/* ═══════════════════════════════════════════════════════════════════
   HELPER — isValidDate
   Returns true when the string is a parseable, real calendar date.
   Accepts ISO-8601 format (YYYY-MM-DD) and any format the browser's
   Date constructor understands.

   @param  {string} dateStr — raw date string from the input field
   @returns {boolean}
═══════════════════════════════════════════════════════════════════ */
function isValidDate(dateStr) {
  if (!dateStr || typeof dateStr !== "string") return false;

  const parsed = new Date(dateStr);

  // NaN check: invalid dates produce an invalid Date object
  return !isNaN(parsed.getTime());
}

/* ═══════════════════════════════════════════════════════════════════
   HELPER — isLicenceExpired
   Returns true when the licence expiry date is in the past.
   Used to apply a visual warning class to expired rows.

   @param  {string} dateStr — ISO date string from the API
   @returns {boolean}
═══════════════════════════════════════════════════════════════════ */
function isLicenceExpired(dateStr) {
  if (!dateStr) return false;

  const expiry = new Date(dateStr);
  if (isNaN(expiry.getTime())) return false;

  // Compare against today at midnight (ignore time component)
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return expiry < today;
}

/* ═══════════════════════════════════════════════════════════════════
   HELPER — formatDate
   Converts an ISO-8601 date string into a human-readable display
   string using the browser's locale.

   @param  {string} dateStr — e.g. "2026-12-31"
   @returns {string} e.g. "31 Dec 2026" or "--" if invalid
═══════════════════════════════════════════════════════════════════ */
function formatDate(dateStr) {
  if (!dateStr) return "--";

  const parsed = new Date(dateStr);
  if (isNaN(parsed.getTime())) return "--";

  return parsed.toLocaleDateString("en-IN", {
    day   : "2-digit",
    month : "short",
    year  : "numeric",
  });
}

/* ═══════════════════════════════════════════════════════════════════
   HELPER — formatDateForInput
   Converts an API date string (may include time) into the
   YYYY-MM-DD format expected by an <input type="date">.

   @param  {string} dateStr — raw date string from the API
   @returns {string} YYYY-MM-DD or "" if invalid
═══════════════════════════════════════════════════════════════════ */
function formatDateForInput(dateStr) {
  if (!dateStr) return "";

  const parsed = new Date(dateStr);
  if (isNaN(parsed.getTime())) return "";

  // Extract year, month, day and zero-pad to YYYY-MM-DD
  const year  = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, "0");
  const day   = String(parsed.getDate()).padStart(2, "0");

  return year + "-" + month + "-" + day;
}

/* ═══════════════════════════════════════════════════════════════════
   HELPER — escapeHtml
   Escapes special HTML characters in a string to prevent XSS when
   inserting API data directly into innerHTML.

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
   ATTACH EVENT LISTENERS
   Wires all interactive elements (buttons, inputs, keyboard, modal
   backdrop) to their handler functions.
   Called once during initialisation.
═══════════════════════════════════════════════════════════════════ */
function attachEventListeners() {

  // ── "Add Driver" button — open modal in add mode
  if (addDriverBtn) {
    addDriverBtn.addEventListener("click", openAddModal);
  }

  // ── Modal close button (× in header)
  if (driverModalClose) {
    driverModalClose.addEventListener("click", closeModal);
  }

  // ── Modal cancel button
  if (driverModalCancel) {
    driverModalCancel.addEventListener("click", closeModal);
  }

  // ── Click on the modal backdrop closes the modal
  if (driverModal) {
    driverModal.addEventListener("click", function (e) {
      // Only close if the click landed directly on the backdrop element
      if (e.target === driverModal) closeModal();
    });
  }

  // ── Escape key closes the modal
  document.addEventListener("keydown", function (e) {
    if (
      e.key === "Escape" &&
      driverModal &&
      driverModal.classList.contains("open")
    ) {
      closeModal();
    }
  });

  // ── Form submit (Add / Edit)
  if (driverForm) {
    driverForm.addEventListener("submit", handleSubmit);
  }

  // ── Live search by driver name
  if (searchNameInput) {
    searchNameInput.addEventListener("input", applyFilters);
  }

  // ── Live search by license number
  if (searchLicInput) {
    searchLicInput.addEventListener("input", applyFilters);
  }

  // ── Status dropdown filter
  if (statusFilter) {
    statusFilter.addEventListener("change", applyFilters);
  }
}

/* ═══════════════════════════════════════════════════════════════════
   INIT — initialiseDrivers
   Entry point for the drivers page.
   Attaches all event listeners, then fetches drivers from the API.
═══════════════════════════════════════════════════════════════════ */
async function initialiseDrivers() {
  // Wire up all button / input / keyboard listeners
  attachEventListeners();

  // Fetch and render the driver list from the API
  await loadDrivers();
}

// Run when the DOM is fully parsed and ready
document.addEventListener("DOMContentLoaded", initialiseDrivers);

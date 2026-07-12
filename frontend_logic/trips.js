/**
 * trips.js — TransitOps ERP
 * Manages the Trip Management page (trips.html).
 *
 * Responsibilities:
 *   - Load trips from GET /api/trips
 *   - Render the trips table
 *   - Open / close the Add / Edit modal
 *   - Search by source, destination, vehicle or driver
 *   - Filter by status
 *   - Submit a trip (POST for new, PUT for edit)
 *   - Delete a trip (DELETE /api/trips/:id)
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
const TRIPS_API_BASE = "/api";

/* ═══════════════════════════════════════════════════════════════════
   MODULE STATE
   tripList       — full list returned by the last GET /api/trips
   editingTripId  — trip_id currently being edited; null = add mode
═══════════════════════════════════════════════════════════════════ */
let tripList      = [];
let editingTripId = null;

/* ═══════════════════════════════════════════════════════════════════
   DOM REFERENCES
   All element look-ups are done once here so every function below
   can reuse the same cached references.
═══════════════════════════════════════════════════════════════════ */

// ── Table & empty state
const tripTableBody  = document.getElementById("trip-table-body");
const tripEmptyState = document.getElementById("trip-empty-state");

// ── Search & filter controls
const searchSourceInput = document.getElementById("search-source");
const searchDestInput   = document.getElementById("search-destination");
const searchVehicleInput = document.getElementById("search-trip-vehicle");
const searchDriverInput  = document.getElementById("search-trip-driver");
const tripStatusFilter   = document.getElementById("filter-trip-status");

// ── "Add Trip" button
const addTripBtn = document.getElementById("add-trip-btn");

// ── Modal elements
const tripModal       = document.getElementById("trip-modal");
const tripModalTitle  = document.getElementById("trip-modal-title");
const tripModalClose  = document.getElementById("trip-modal-close");
const tripModalCancel = document.getElementById("trip-modal-cancel");
const tripForm        = document.getElementById("trip-form");

// ── Form fields (names match the API JSON schema)
const fieldTripId      = document.getElementById("field-trip-id");         // hidden
const fieldVehicle     = document.getElementById("field-trip-vehicle");
const fieldDriver      = document.getElementById("field-trip-driver");
const fieldSource      = document.getElementById("field-source");
const fieldDestination = document.getElementById("field-destination");
const fieldStartDate   = document.getElementById("field-start-date");
const fieldEndDate     = document.getElementById("field-end-date");
const fieldTripStatus  = document.getElementById("field-trip-status");
const fieldNotes       = document.getElementById("field-trip-notes");

// ── Inline field error elements
const errVehicle     = document.getElementById("err-trip-vehicle");
const errDriver      = document.getElementById("err-trip-driver");
const errSource      = document.getElementById("err-source");
const errDestination = document.getElementById("err-destination");
const errStartDate   = document.getElementById("err-start-date");
const errEndDate     = document.getElementById("err-end-date");
const errTripStatus  = document.getElementById("err-trip-status");

// ── Page-level banners
const tripErrorBanner   = document.getElementById("trip-error-banner");
const tripErrorMsg      = document.getElementById("trip-error-message");
const tripSuccessBanner = document.getElementById("trip-success-banner");
const tripSuccessMsg    = document.getElementById("trip-success-message");

// ── Submit button inside the modal
const tripSubmitBtn = document.getElementById("trip-submit-btn");

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
    if (!tripErrorBanner || !tripErrorMsg) return;

    // Set the message and make the banner visible
    tripErrorMsg.textContent = msg;
    tripErrorBanner.classList.add("visible");
    tripErrorBanner.classList.remove("hidden");

    // Dismiss any success banner that may be showing
    if (tripSuccessBanner) tripSuccessBanner.classList.remove("visible");

    // Auto-dismiss after 5 seconds
    setTimeout(function () {
      tripErrorBanner.classList.remove("visible");
    }, 5000);

  } else if (type === "success") {
    if (!tripSuccessBanner || !tripSuccessMsg) return;

    // Set the message and make the banner visible
    tripSuccessMsg.textContent = msg;
    tripSuccessBanner.classList.add("visible");
    tripSuccessBanner.classList.remove("hidden");

    // Dismiss any error banner that may be showing
    if (tripErrorBanner) tripErrorBanner.classList.remove("visible");

    // Auto-dismiss after 4 seconds
    setTimeout(function () {
      tripSuccessBanner.classList.remove("visible");
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
   UTILITY — clearAllFieldErrors
   Clears every inline field error in the modal at once.
   Called before each validation pass and on modal open.
═══════════════════════════════════════════════════════════════════ */
function clearAllFieldErrors() {
  [errVehicle, errDriver, errSource, errDestination,
   errStartDate, errEndDate, errTripStatus].forEach(function (el) {
    clearFieldError(el);
  });
}

/* ═══════════════════════════════════════════════════════════════════
   UTILITY — setSubmitLoading
   Disables / re-enables the modal submit button during an API call
   and updates its label to communicate the in-flight state.

   @param {boolean} isLoading — true to enter loading state
═══════════════════════════════════════════════════════════════════ */
function setSubmitLoading(isLoading) {
  if (!tripSubmitBtn) return;

  if (isLoading) {
    tripSubmitBtn.disabled = true;
    tripSubmitBtn.textContent = "Saving..."; // visual feedback while request is in flight
  } else {
    tripSubmitBtn.disabled = false;
    tripSubmitBtn.textContent = "Save Trip"; // restore original label
  }
}

/* ═══════════════════════════════════════════════════════════════════
   LOAD TRIPS
   Fetches all trips from GET /api/trips.
   Stores the result in the module-level tripList array, then
   triggers a full table render.

   On network failure or non-OK HTTP status, the error banner is
   shown — no fallback data is ever created.
═══════════════════════════════════════════════════════════════════ */
async function loadTrips() {
  const container = document.querySelector(".table-container") || document.body;
  if (typeof showLoadingOverlay === "function") {
    showLoadingOverlay(container, true);
  }
  try {
    // Show a temporary loading row while the request is in flight
    if (tripTableBody) {
      tripTableBody.innerHTML =
        '<tr><td colspan="9" class="table-loading">Loading trips...</td></tr>';
    }

    // Call the API
    const response = await fetch(TRIPS_API_BASE + "/trips");

    // Treat any non-2xx HTTP status as a failure
    if (!response.ok) {
      throw new Error("Server returned status " + response.status);
    }

    // Parse the JSON array of trip objects
    const body = await response.json();
    tripList = body.data || body || [];

    // Render the full list into the table
    renderTripTable(tripList);

  } catch (error) {
    if (typeof handleApiError === "function") {
      handleApiError(error, "Unable to load trips registry from server.");
    }
    // Network failure or bad response — show the error banner
    showBanner("error", "Unable to connect to backend server.");

    // Clear the loading placeholder and reveal the empty state
    if (tripTableBody) tripTableBody.innerHTML = "";
    showEmptyState(true);

    // Log the technical detail to the console for debugging
    console.error("[trips.js] loadTrips error:", error);
  } finally {
    if (typeof showLoadingOverlay === "function") {
      showLoadingOverlay(container, false);
    }
  }
}

/* ═══════════════════════════════════════════════════════════════════
   RENDER TRIP TABLE
   Clears the table body and renders one <tr> per trip object in the
   provided array. Manages the empty-state element visibility.

   Expected fields on each trip object:
     trip_id, vehicle, driver, source, destination,
     start_date, end_date, status

   @param {Array} trips — array of trip objects to display
═══════════════════════════════════════════════════════════════════ */
function renderTripTable(trips) {
  if (!tripTableBody) return;

  // Clear previous rows
  tripTableBody.innerHTML = "";

  if (!trips || trips.length === 0) {
    showEmptyState(true);
    return;
  }

  // Data is present — hide the empty state message
  showEmptyState(false);

  // Build one <tr> per trip object
  trips.forEach(function (trip) {
    const tr = document.createElement("tr");
    tr.setAttribute("data-id", trip.trip_id);

    // Format dates for human-readable display
    const startDisplay = formatDate(trip.start_date);
    const endDisplay   = trip.end_date ? formatDate(trip.end_date) : "—";

    // Map status to a CSS badge class
    const statusClass = getTripStatusBadgeClass(trip.status);

    // Build the row using the API field names
    tr.innerHTML =
      "<td>" + escapeHtml(String(trip.trip_id))       + "</td>" +
      "<td>" + escapeHtml(trip.vehicle)               + "</td>" +
      "<td>" + escapeHtml(trip.driver)                + "</td>" +
      "<td>" + escapeHtml(trip.source)                + "</td>" +
      "<td>" + escapeHtml(trip.destination)           + "</td>" +
      "<td>" + startDisplay                           + "</td>" +
      "<td>" + endDisplay                             + "</td>" +
      "<td>" +
        '<span class="status-badge ' + statusClass + '">' +
          escapeHtml(trip.status) +
        "</span>" +
      "</td>" +
      "<td>" +
        '<button class="btn-icon btn-edit" ' +
          'aria-label="Edit trip ' + escapeHtml(String(trip.trip_id)) + '" ' +
          'data-id="' + trip.trip_id + '">' +
          "Edit" +
        "</button>" +
        '<button class="btn-icon btn-delete" ' +
          'aria-label="Delete trip ' + escapeHtml(String(trip.trip_id)) + '" ' +
          'data-id="' + trip.trip_id + '">' +
          "Delete" +
        "</button>" +
      "</td>";

    // Attach Edit button click listener
    const editBtn = tr.querySelector(".btn-edit");
    if (editBtn) {
      editBtn.addEventListener("click", function () {
        openEditModal(trip);
      });
    }

    // Attach Delete button click listener
    const deleteBtn = tr.querySelector(".btn-delete");
    if (deleteBtn) {
      deleteBtn.addEventListener("click", function () {
        handleDeleteTrip(trip.trip_id, trip.source, trip.destination);
      });
    }

    tripTableBody.appendChild(tr);
  });
}

/* ═══════════════════════════════════════════════════════════════════
   SHOW EMPTY STATE
   Toggles the empty-state message element visibility.

   @param {boolean} show — true to display the empty state
═══════════════════════════════════════════════════════════════════ */
function showEmptyState(show) {
  if (!tripEmptyState) return;

  if (show) {
    tripEmptyState.classList.remove("hidden");
    tripEmptyState.classList.add("visible");
  } else {
    tripEmptyState.classList.add("hidden");
    tripEmptyState.classList.remove("visible");
  }
}

/* ═══════════════════════════════════════════════════════════════════
   OPEN ADD MODAL
   Resets all form fields, sets editingTripId to null (POST mode),
   and makes the modal visible.
═══════════════════════════════════════════════════════════════════ */
function openAddModal() {
  // Ensure we are in add mode
  editingTripId = null;

  // Update the modal heading
  if (tripModalTitle) tripModalTitle.textContent = "Add Trip";

  // Reset all fields to empty / default values
  if (tripForm) tripForm.reset();

  // Clear any lingering inline validation errors
  clearAllFieldErrors();

  // Clear the hidden trip id field
  if (fieldTripId) fieldTripId.value = "";

  // Restore submit button in case it was stuck in loading state
  setSubmitLoading(false);

  // Make the modal visible and announce it to screen readers
  if (tripModal) {
    tripModal.classList.add("open");
    tripModal.setAttribute("aria-hidden", "false");
  }

  // Focus the first required field for keyboard accessibility
  if (fieldVehicle) fieldVehicle.focus();
}

/* ═══════════════════════════════════════════════════════════════════
   OPEN EDIT MODAL
   Pre-fills all form fields from an existing trip object and
   switches to PUT mode by storing editingTripId.

   @param {Object} trip — the trip object returned by the API
═══════════════════════════════════════════════════════════════════ */
function openEditModal(trip) {
  // Store the id so handleSubmit knows to issue a PUT request
  editingTripId = trip.trip_id;

  // Update the modal heading
  if (tripModalTitle) tripModalTitle.textContent = "Edit Trip";

  // Clear validation errors from any previous modal session
  clearAllFieldErrors();

  // Populate each field using the API field names
  if (fieldTripId)      fieldTripId.value      = trip.trip_id;
  if (fieldVehicle)     fieldVehicle.value      = trip.vehicle;
  if (fieldDriver)      fieldDriver.value       = trip.driver;
  if (fieldSource)      fieldSource.value       = trip.source;
  if (fieldDestination) fieldDestination.value  = trip.destination;
  if (fieldStartDate)   fieldStartDate.value    = formatDateForInput(trip.start_date);
  if (fieldEndDate)     fieldEndDate.value      = trip.end_date
                                                    ? formatDateForInput(trip.end_date)
                                                    : "";
  if (fieldTripStatus)  fieldTripStatus.value   = trip.status;
  if (fieldNotes)       fieldNotes.value        = trip.notes || "";

  // Restore submit button label
  setSubmitLoading(false);

  // Make the modal visible
  if (tripModal) {
    tripModal.classList.add("open");
    tripModal.setAttribute("aria-hidden", "false");
  }

  // Focus the first field for keyboard accessibility
  if (fieldVehicle) fieldVehicle.focus();
}

/* ═══════════════════════════════════════════════════════════════════
   CLOSE MODAL
   Hides the trip modal, resets editingTripId, clears the form
   and all validation state.
═══════════════════════════════════════════════════════════════════ */
function closeModal() {
  if (!tripModal) return;

  // Hide the modal
  tripModal.classList.remove("open");
  tripModal.setAttribute("aria-hidden", "true");

  // Reset form state completely
  editingTripId = null;
  if (tripForm) tripForm.reset();
  clearAllFieldErrors();
  setSubmitLoading(false);
}

/* ═══════════════════════════════════════════════════════════════════
   VALIDATE FORM
   Runs all field-level validation rules and populates error spans.
   Returns true only when every rule passes.

   Required fields:
   - vehicle     : non-empty string
   - driver      : non-empty string
   - source      : non-empty string
   - destination : non-empty string
   - start_date  : required, must be a valid calendar date
   - status      : a selection must be made

   Optional fields:
   - end_date    : if provided, must be a valid date and >= start_date
   - notes       : free text, no validation

   @returns {boolean} true if the entire form is valid
═══════════════════════════════════════════════════════════════════ */
function validateForm() {
  // Clear all previous error messages before re-running rules
  clearAllFieldErrors();

  let isValid = true; // flip to false on any failure

  // ── Vehicle ──────────────────────────────────────────────────
  const vehicleVal = fieldVehicle ? fieldVehicle.value.trim() : "";
  if (!vehicleVal) {
    showFieldError(errVehicle, "Vehicle is required.");
    isValid = false;
  }

  // ── Driver ───────────────────────────────────────────────────
  const driverVal = fieldDriver ? fieldDriver.value.trim() : "";
  if (!driverVal) {
    showFieldError(errDriver, "Driver is required.");
    isValid = false;
  }

  // ── Source ───────────────────────────────────────────────────
  const sourceVal = fieldSource ? fieldSource.value.trim() : "";
  if (!sourceVal) {
    showFieldError(errSource, "Source location is required.");
    isValid = false;
  }

  // ── Destination ──────────────────────────────────────────────
  const destVal = fieldDestination ? fieldDestination.value.trim() : "";
  if (!destVal) {
    showFieldError(errDestination, "Destination is required.");
    isValid = false;
  }

  // ── Start Date ───────────────────────────────────────────────
  const startVal = fieldStartDate ? fieldStartDate.value.trim() : "";
  if (!startVal) {
    showFieldError(errStartDate, "Start date is required.");
    isValid = false;
  } else if (!isValidDate(startVal)) {
    showFieldError(errStartDate, "Enter a valid start date.");
    isValid = false;
  }

  // ── End Date (optional — validate only when provided) ────────
  const endVal = fieldEndDate ? fieldEndDate.value.trim() : "";
  if (endVal) {
    if (!isValidDate(endVal)) {
      showFieldError(errEndDate, "Enter a valid end date.");
      isValid = false;
    } else if (startVal && isValidDate(startVal)) {
      // End date must not be before the start date
      if (new Date(endVal) < new Date(startVal)) {
        showFieldError(errEndDate, "End date cannot be before start date.");
        isValid = false;
      }
    }
  }

  // ── Status ───────────────────────────────────────────────────
  const statusVal = fieldTripStatus ? fieldTripStatus.value : "";
  if (!statusVal || statusVal === "" || statusVal === "select") {
    showFieldError(errTripStatus, "Please select a status.");
    isValid = false;
  }

  return isValid;
}

/* ═══════════════════════════════════════════════════════════════════
   COLLECT FORM DATA
   Reads all form fields and returns a plain object matching the
   API JSON schema for trips.

   @returns {Object} trip payload ready for POST or PUT
═══════════════════════════════════════════════════════════════════ */
function collectFormData() {
  return {
    vehicle     : fieldVehicle     ? fieldVehicle.value.trim()     : "",
    driver      : fieldDriver      ? fieldDriver.value.trim()      : "",
    source      : fieldSource      ? fieldSource.value.trim()      : "",
    destination : fieldDestination ? fieldDestination.value.trim() : "",
    start_date  : fieldStartDate   ? fieldStartDate.value          : "",
    end_date    : fieldEndDate     ? (fieldEndDate.value || null)  : null,
    status      : fieldTripStatus  ? fieldTripStatus.value         : "",
    notes       : fieldNotes       ? fieldNotes.value.trim()       : "",
  };
}

/* ═══════════════════════════════════════════════════════════════════
   HANDLE SUBMIT
   Called on the form submit event.
   Validates all fields, then calls:
     POST /api/trips       — when editingTripId is null (add mode)
     PUT  /api/trips/:id   — when editingTripId is set  (edit mode)

   On success : closes the modal, refreshes the table from the API,
                shows a success banner.
   On failure : shows the error banner, re-enables the submit button.
═══════════════════════════════════════════════════════════════════ */
async function handleSubmit(e) {
  // Prevent default HTML form submission and page reload
  e.preventDefault();

  // Run all validation rules — stop if any field fails
  if (!validateForm()) return;

  // Build the request payload from the current field values
  const payload = collectFormData();

  // Determine HTTP method and URL from the current mode
  const isEditMode = editingTripId !== null;
  const method     = isEditMode ? "PUT" : "POST";
  const url        = isEditMode
    ? TRIPS_API_BASE + "/trips/" + editingTripId
    : TRIPS_API_BASE + "/trips";

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
      // Try to surface a server-provided error message
      let serverMsg = "Server returned status " + response.status;
      try {
        const errBody = await response.json();
        if (errBody && errBody.message) serverMsg = errBody.message;
      } catch (_) {
        // Ignore JSON parse failure — fall back to the status code message
      }
      throw new Error(serverMsg);
    }

    // Success — close the modal and reload the full table from the API
    closeModal();
    await loadTrips();

    // Show a contextual success message in the banner
    showBanner(
      "success",
      isEditMode ? "Trip updated successfully." : "Trip added successfully."
    );

  } catch (error) {
    // Network failure or server-side error
    showBanner("error", "Unable to connect to backend server.");
    console.error("[trips.js] handleSubmit error:", error);

    // Re-enable the button so the user can retry
    setSubmitLoading(false);
  }
}

/* ═══════════════════════════════════════════════════════════════════
   HANDLE DELETE TRIP
   Prompts the user for confirmation, then calls
   DELETE /api/trips/:id.

   On success : reloads the table, shows success banner.
   On failure : shows error banner.

   @param {number} id          — trip_id to delete
   @param {string} source      — shown in the confirmation dialog
   @param {string} destination — shown in the confirmation dialog
═══════════════════════════════════════════════════════════════════ */
async function handleDeleteTrip(id, source, destination) {
  // Confirm before making a destructive API call
  const confirmed = window.confirm(
    'Delete trip from "' + source + '" to "' + destination + '"?\n\nThis action cannot be undone.'
  );

  if (!confirmed) return; // user cancelled — do nothing

  try {
    const response = await fetch(TRIPS_API_BASE + "/trips/" + id, {
      method: "DELETE",
    });

    // Treat any non-2xx response as a failure
    if (!response.ok) {
      throw new Error("Server returned status " + response.status);
    }

    // Reload the table to reflect the deletion
    await loadTrips();

    // Notify the user of success
    showBanner("success", "Trip deleted successfully.");

  } catch (error) {
    showBanner("error", "Unable to connect to backend server.");
    console.error("[trips.js] handleDeleteTrip error:", error);
  }
}

/* ═══════════════════════════════════════════════════════════════════
   APPLY FILTERS
   Reads the current search inputs and status dropdown, then filters
   the in-memory tripList and re-renders the table.

   All active filters are applied together with AND logic:
   - searchSource  : case-insensitive substring match on trip.source
   - searchDest    : case-insensitive substring match on trip.destination
   - searchVehicle : case-insensitive substring match on trip.vehicle
   - searchDriver  : case-insensitive substring match on trip.driver
   - status        : exact match on trip.status ("" = show all)
═══════════════════════════════════════════════════════════════════ */
function applyFilters() {
  // Read and normalise each filter value
  const searchSource  = searchSourceInput  ? searchSourceInput.value.trim().toLowerCase()  : "";
  const searchDest    = searchDestInput    ? searchDestInput.value.trim().toLowerCase()    : "";
  const searchVehicle = searchVehicleInput ? searchVehicleInput.value.trim().toLowerCase() : "";
  const searchDriver  = searchDriverInput  ? searchDriverInput.value.trim().toLowerCase()  : "";
  const status        = tripStatusFilter   ? tripStatusFilter.value                        : "";

  // Filter the full in-memory tripList
  const filtered = tripList.filter(function (trip) {

    // ── Source filter ──────────────────────────────────────────
    if (searchSource) {
      const src = trip.source ? trip.source.toLowerCase() : "";
      if (!src.includes(searchSource)) return false;
    }

    // ── Destination filter ─────────────────────────────────────
    if (searchDest) {
      const dest = trip.destination ? trip.destination.toLowerCase() : "";
      if (!dest.includes(searchDest)) return false;
    }

    // ── Vehicle filter ─────────────────────────────────────────
    if (searchVehicle) {
      const veh = trip.vehicle ? trip.vehicle.toLowerCase() : "";
      if (!veh.includes(searchVehicle)) return false;
    }

    // ── Driver filter ──────────────────────────────────────────
    if (searchDriver) {
      const drv = trip.driver ? trip.driver.toLowerCase() : "";
      if (!drv.includes(searchDriver)) return false;
    }

    // ── Status filter ──────────────────────────────────────────
    if (status && trip.status !== status) return false;

    return true; // passes all active filters
  });

  // Re-render the table with only the matching trip records
  renderTripTable(filtered);
}

/* ═══════════════════════════════════════════════════════════════════
   HELPER — getTripStatusBadgeClass
   Maps a trip status string to a CSS badge class.

   @param  {string} status — e.g. "Scheduled", "In Progress", "Completed"
   @returns {string} CSS class name
═══════════════════════════════════════════════════════════════════ */
function getTripStatusBadgeClass(status) {
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
   the YYYY-MM-DD format required by <input type="date">.

   @param  {string} dateStr — raw date string from the API
   @returns {string} YYYY-MM-DD, or "" if the string is invalid
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
   Wires all interactive elements to their handler functions.
   Called once during initialisation.
═══════════════════════════════════════════════════════════════════ */
function attachEventListeners() {

  // ── "Add Trip" button — open modal in add mode
  if (addTripBtn) {
    addTripBtn.addEventListener("click", openAddModal);
  }

  // ── Modal close button (× in header)
  if (tripModalClose) {
    tripModalClose.addEventListener("click", closeModal);
  }

  // ── Modal cancel button
  if (tripModalCancel) {
    tripModalCancel.addEventListener("click", closeModal);
  }

  // ── Click on the modal backdrop closes the modal
  if (tripModal) {
    tripModal.addEventListener("click", function (e) {
      // Only close when the click landed directly on the backdrop
      if (e.target === tripModal) closeModal();
    });
  }

  // ── Escape key closes the modal
  document.addEventListener("keydown", function (e) {
    if (
      e.key === "Escape" &&
      tripModal &&
      tripModal.classList.contains("open")
    ) {
      closeModal();
    }
  });

  // ── Form submit (Add / Edit)
  if (tripForm) {
    tripForm.addEventListener("submit", handleSubmit);
  }

  // ── Live search — source
  if (searchSourceInput) {
    searchSourceInput.addEventListener("input", applyFilters);
  }

  // ── Live search — destination
  if (searchDestInput) {
    searchDestInput.addEventListener("input", applyFilters);
  }

  // ── Live search — vehicle
  if (searchVehicleInput) {
    searchVehicleInput.addEventListener("input", applyFilters);
  }

  // ── Live search — driver
  if (searchDriverInput) {
    searchDriverInput.addEventListener("input", applyFilters);
  }

  // ── Status dropdown filter
  if (tripStatusFilter) {
    tripStatusFilter.addEventListener("change", applyFilters);
  }
}

/* ═══════════════════════════════════════════════════════════════════
   INIT — initialiseTrips
   Entry point for the trips page.
   Attaches all event listeners, then fetches trips from the API
   to populate the table.
═══════════════════════════════════════════════════════════════════ */
async function initialiseTrips() {
  // Wire up all button / input / keyboard listeners
  attachEventListeners();

  // Fetch and render the trips list from the API
  await loadTrips();
}

// Run when the DOM is fully parsed and ready
document.addEventListener("DOMContentLoaded", initialiseTrips);

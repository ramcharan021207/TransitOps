/**
 * maintenance.js — TransitOps ERP
 * Manages the Maintenance Management page (maintenance.html).
 *
 * Responsibilities:
 *   - Load maintenance records from GET /api/maintenance
 *   - Render the maintenance table
 *   - Open / close the Add / Edit modal
 *   - Submit a record (POST for new, PUT for edit)
 *   - Delete a record (DELETE /api/maintenance/:id)
 *   - Search by vehicle name / registration
 *   - Validate all required fields
 *
 * Vehicle Status Side-Effects (via PUT /api/vehicles/:id):
 *   - On CREATE  → vehicle status set to "In Shop"
 *   - On COMPLETE (status = "Completed") → vehicle status set to "Available"
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
const MAINT_API_BASE = "/api";

/* ═══════════════════════════════════════════════════════════════════
   MODULE STATE
   maintList        — full list returned by the last GET /api/maintenance
   editingMaintId   — maintenance_id being edited; null = add mode
═══════════════════════════════════════════════════════════════════ */
let maintList      = [];
let editingMaintId = null;

/* ═══════════════════════════════════════════════════════════════════
   DOM REFERENCES
   All element look-ups are performed once here so every function
   below can reuse the same cached references.
═══════════════════════════════════════════════════════════════════ */

// ── Table & empty state
const maintTableBody  = document.getElementById("maint-table-body");
const maintEmptyState = document.getElementById("maint-empty-state");

// ── Search control
const searchVehicleInput = document.getElementById("search-maint-vehicle");
const maintStatusFilter  = document.getElementById("filter-maint-status");

// ── "Add Maintenance" button
const addMaintBtn = document.getElementById("add-maint-btn");

// ── Modal elements
const maintModal       = document.getElementById("maint-modal");
const maintModalTitle  = document.getElementById("maint-modal-title");
const maintModalClose  = document.getElementById("maint-modal-close");
const maintModalCancel = document.getElementById("maint-modal-cancel");
const maintForm        = document.getElementById("maint-form");

// ── Form fields
const fieldMaintId       = document.getElementById("field-maint-id");         // hidden
const fieldVehicleId     = document.getElementById("field-maint-vehicle-id"); // hidden — stores vehicle_id for status update
const fieldVehicle       = document.getElementById("field-maint-vehicle");    // registration / name shown
const fieldMaintType     = document.getElementById("field-maint-type");
const fieldDescription   = document.getElementById("field-maint-description");
const fieldScheduledDate = document.getElementById("field-scheduled-date");
const fieldCompletedDate = document.getElementById("field-completed-date");
const fieldCost          = document.getElementById("field-maint-cost");
const fieldMaintStatus   = document.getElementById("field-maint-status");
const fieldTechnician    = document.getElementById("field-technician");
const fieldNotes         = document.getElementById("field-maint-notes");

// ── Inline field error elements
const errVehicle       = document.getElementById("err-maint-vehicle");
const errMaintType     = document.getElementById("err-maint-type");
const errScheduledDate = document.getElementById("err-scheduled-date");
const errCompletedDate = document.getElementById("err-completed-date");
const errCost          = document.getElementById("err-maint-cost");
const errMaintStatus   = document.getElementById("err-maint-status");

// ── Page-level banners
const maintErrorBanner   = document.getElementById("maint-error-banner");
const maintErrorMsg      = document.getElementById("maint-error-message");
const maintSuccessBanner = document.getElementById("maint-success-banner");
const maintSuccessMsg    = document.getElementById("maint-success-message");

// ── Submit button
const maintSubmitBtn = document.getElementById("maint-submit-btn");

/* ═══════════════════════════════════════════════════════════════════
   UTILITY — showBanner
   Displays the page-level error or success banner with a message.
   Only one banner is visible at a time.
   Auto-dismisses after 5 s (error) or 4 s (success).

   @param {"error"|"success"} type — which banner to show
   @param {string}            msg  — message text to display
═══════════════════════════════════════════════════════════════════ */
function showBanner(type, msg) {
  if (type === "error") {
    if (!maintErrorBanner || !maintErrorMsg) return;

    // Set message and make the error banner visible
    maintErrorMsg.textContent = msg;
    maintErrorBanner.classList.add("visible");
    maintErrorBanner.classList.remove("hidden");

    // Dismiss any success banner that may be showing
    if (maintSuccessBanner) maintSuccessBanner.classList.remove("visible");

    // Auto-dismiss after 5 seconds
    setTimeout(function () {
      maintErrorBanner.classList.remove("visible");
    }, 5000);

  } else if (type === "success") {
    if (!maintSuccessBanner || !maintSuccessMsg) return;

    // Set message and make the success banner visible
    maintSuccessMsg.textContent = msg;
    maintSuccessBanner.classList.add("visible");
    maintSuccessBanner.classList.remove("hidden");

    // Dismiss any error banner that may be showing
    if (maintErrorBanner) maintErrorBanner.classList.remove("visible");

    // Auto-dismiss after 4 seconds
    setTimeout(function () {
      maintSuccessBanner.classList.remove("visible");
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
  [errVehicle, errMaintType, errScheduledDate,
   errCompletedDate, errCost, errMaintStatus].forEach(function (el) {
    clearFieldError(el);
  });
}

/* ═══════════════════════════════════════════════════════════════════
   UTILITY — setSubmitLoading
   Disables / re-enables the submit button during an API call and
   updates its label to signal the in-flight state.

   @param {boolean} isLoading — true to enter loading state
═══════════════════════════════════════════════════════════════════ */
function setSubmitLoading(isLoading) {
  if (!maintSubmitBtn) return;

  if (isLoading) {
    maintSubmitBtn.disabled = true;
    maintSubmitBtn.textContent = "Saving..."; // visual feedback while request is in flight
  } else {
    maintSubmitBtn.disabled = false;
    maintSubmitBtn.textContent = "Save Record"; // restore original label
  }
}

/* ═══════════════════════════════════════════════════════════════════
   LOAD MAINTENANCE RECORDS
   Fetches all records from GET /api/maintenance.
   Stores the result in the module-level maintList array, then
   triggers a full table render.

   On network failure or non-OK HTTP status the error banner is
   shown — no fallback data is created.
═══════════════════════════════════════════════════════════════════ */
async function loadMaintenance() {
  try {
    // Show a temporary loading row while the request is in flight
    if (maintTableBody) {
      maintTableBody.innerHTML =
        '<tr><td colspan="9" class="table-loading">Loading maintenance records...</td></tr>';
    }

    // Call the API
    const response = await fetch(MAINT_API_BASE + "/maintenance");

    // Treat any non-2xx HTTP status as a failure
    if (!response.ok) {
      throw new Error("Server returned status " + response.status);
    }

    // Parse the JSON array of maintenance objects
    maintList = await response.json();

    // Render the full list into the table
    renderMaintTable(maintList);

  } catch (error) {
    // Network failure or bad response — show the error banner
    showBanner("error", "Unable to connect to backend server.");

    // Clear the loading placeholder and reveal the empty state
    if (maintTableBody) maintTableBody.innerHTML = "";
    showEmptyState(true);

    // Log technical detail for debugging
    console.error("[maintenance.js] loadMaintenance error:", error);
  }
}

/* ═══════════════════════════════════════════════════════════════════
   RENDER MAINTENANCE TABLE
   Clears the table body and renders one <tr> per maintenance object
   in the provided array. Manages empty-state visibility.

   Expected fields on each record:
     maintenance_id, vehicle, vehicle_id, maintenance_type,
     description, scheduled_date, completed_date, cost,
     status, technician, notes

   @param {Array} records — array of maintenance objects to display
═══════════════════════════════════════════════════════════════════ */
function renderMaintTable(records) {
  if (!maintTableBody) return;

  // Clear any existing rows
  maintTableBody.innerHTML = "";

  if (!records || records.length === 0) {
    showEmptyState(true);
    return;
  }

  // Data is present — hide the empty state
  showEmptyState(false);

  // Build one <tr> per maintenance record
  records.forEach(function (record) {
    const tr = document.createElement("tr");
    tr.setAttribute("data-id", record.maintenance_id);

    // Format dates for human-readable display
    const scheduledDisplay = formatDate(record.scheduled_date);
    const completedDisplay = record.completed_date
      ? formatDate(record.completed_date)
      : "—";

    // Format cost as currency
    const costDisplay = formatCurrency(record.cost);

    // Map status to a CSS badge class
    const statusClass = getMaintStatusBadgeClass(record.status);

    // Build the row HTML
    tr.innerHTML =
      "<td>" + escapeHtml(String(record.maintenance_id))  + "</td>" +
      "<td>" + escapeHtml(record.vehicle)                 + "</td>" +
      "<td>" + escapeHtml(record.maintenance_type)        + "</td>" +
      "<td>" + scheduledDisplay                           + "</td>" +
      "<td>" + completedDisplay                           + "</td>" +
      "<td>" + costDisplay                                + "</td>" +
      "<td>" + escapeHtml(record.technician || "—")       + "</td>" +
      "<td>" +
        '<span class="status-badge ' + statusClass + '">' +
          escapeHtml(record.status) +
        "</span>" +
      "</td>" +
      "<td>" +
        '<button class="btn-icon btn-edit" ' +
          'aria-label="Edit maintenance ' + escapeHtml(String(record.maintenance_id)) + '" ' +
          'data-id="' + record.maintenance_id + '">' +
          "Edit" +
        "</button>" +
        '<button class="btn-icon btn-delete" ' +
          'aria-label="Delete maintenance ' + escapeHtml(String(record.maintenance_id)) + '" ' +
          'data-id="' + record.maintenance_id + '">' +
          "Delete" +
        "</button>" +
      "</td>";

    // Attach Edit button click listener
    const editBtn = tr.querySelector(".btn-edit");
    if (editBtn) {
      editBtn.addEventListener("click", function () {
        openEditModal(record);
      });
    }

    // Attach Delete button click listener
    const deleteBtn = tr.querySelector(".btn-delete");
    if (deleteBtn) {
      deleteBtn.addEventListener("click", function () {
        handleDeleteMaintenance(record.maintenance_id, record.vehicle);
      });
    }

    maintTableBody.appendChild(tr);
  });
}

/* ═══════════════════════════════════════════════════════════════════
   SHOW EMPTY STATE
   Toggles the empty-state message element visibility.

   @param {boolean} show — true to display the empty state
═══════════════════════════════════════════════════════════════════ */
function showEmptyState(show) {
  if (!maintEmptyState) return;

  if (show) {
    maintEmptyState.classList.remove("hidden");
    maintEmptyState.classList.add("visible");
  } else {
    maintEmptyState.classList.add("hidden");
    maintEmptyState.classList.remove("visible");
  }
}

/* ═══════════════════════════════════════════════════════════════════
   OPEN ADD MODAL
   Resets all form fields, sets editingMaintId to null (POST mode),
   and makes the modal visible.
═══════════════════════════════════════════════════════════════════ */
function openAddModal() {
  // Ensure we are in add mode
  editingMaintId = null;

  // Update the modal heading
  if (maintModalTitle) maintModalTitle.textContent = "Add Maintenance Record";

  // Reset all fields to empty / default values
  if (maintForm) maintForm.reset();

  // Clear any lingering inline validation errors
  clearAllFieldErrors();

  // Clear hidden id fields
  if (fieldMaintId)   fieldMaintId.value   = "";
  if (fieldVehicleId) fieldVehicleId.value  = "";

  // Restore submit button in case it was stuck in loading state
  setSubmitLoading(false);

  // Make the modal visible
  if (maintModal) {
    maintModal.classList.add("open");
    maintModal.setAttribute("aria-hidden", "false");
  }

  // Focus the vehicle field for keyboard accessibility
  if (fieldVehicle) fieldVehicle.focus();
}

/* ═══════════════════════════════════════════════════════════════════
   OPEN EDIT MODAL
   Pre-fills all form fields from an existing maintenance record and
   switches to PUT mode by storing editingMaintId.

   @param {Object} record — the maintenance object returned by the API
═══════════════════════════════════════════════════════════════════ */
function openEditModal(record) {
  // Store the id so handleSubmit knows to issue a PUT request
  editingMaintId = record.maintenance_id;

  // Update the modal heading
  if (maintModalTitle) maintModalTitle.textContent = "Edit Maintenance Record";

  // Clear validation errors from any previous modal session
  clearAllFieldErrors();

  // Populate fields using the API field names
  if (fieldMaintId)       fieldMaintId.value       = record.maintenance_id;
  if (fieldVehicleId)     fieldVehicleId.value      = record.vehicle_id || "";
  if (fieldVehicle)       fieldVehicle.value        = record.vehicle;
  if (fieldMaintType)     fieldMaintType.value      = record.maintenance_type;
  if (fieldDescription)   fieldDescription.value   = record.description || "";
  if (fieldScheduledDate) fieldScheduledDate.value  = formatDateForInput(record.scheduled_date);
  if (fieldCompletedDate) fieldCompletedDate.value  = record.completed_date
                                                        ? formatDateForInput(record.completed_date)
                                                        : "";
  if (fieldCost)          fieldCost.value           = record.cost || 0;
  if (fieldMaintStatus)   fieldMaintStatus.value    = record.status;
  if (fieldTechnician)    fieldTechnician.value     = record.technician || "";
  if (fieldNotes)         fieldNotes.value          = record.notes || "";

  // Restore submit button label
  setSubmitLoading(false);

  // Make the modal visible
  if (maintModal) {
    maintModal.classList.add("open");
    maintModal.setAttribute("aria-hidden", "false");
  }

  // Focus the first field for keyboard accessibility
  if (fieldVehicle) fieldVehicle.focus();
}

/* ═══════════════════════════════════════════════════════════════════
   CLOSE MODAL
   Hides the maintenance modal, resets editingMaintId, clears the
   form and all validation state.
═══════════════════════════════════════════════════════════════════ */
function closeModal() {
  if (!maintModal) return;

  // Hide the modal
  maintModal.classList.remove("open");
  maintModal.setAttribute("aria-hidden", "true");

  // Reset form state completely
  editingMaintId = null;
  if (maintForm) maintForm.reset();
  clearAllFieldErrors();
  setSubmitLoading(false);
}

/* ═══════════════════════════════════════════════════════════════════
   VALIDATE FORM
   Runs all field-level validation rules and populates error spans.
   Returns true only when every rule passes.

   Required fields:
   - vehicle           : non-empty string
   - maintenance_type  : non-empty string
   - scheduled_date    : required, valid calendar date
   - status            : a selection must be made

   Optional fields with rules:
   - completed_date : if provided, must be valid and >= scheduled_date
   - cost           : if provided, must be numeric and >= 0

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

  // ── Maintenance Type ─────────────────────────────────────────
  const typeVal = fieldMaintType ? fieldMaintType.value.trim() : "";
  if (!typeVal) {
    showFieldError(errMaintType, "Maintenance type is required.");
    isValid = false;
  }

  // ── Scheduled Date ───────────────────────────────────────────
  const scheduledVal = fieldScheduledDate ? fieldScheduledDate.value.trim() : "";
  if (!scheduledVal) {
    showFieldError(errScheduledDate, "Scheduled date is required.");
    isValid = false;
  } else if (!isValidDate(scheduledVal)) {
    showFieldError(errScheduledDate, "Enter a valid scheduled date.");
    isValid = false;
  }

  // ── Completed Date (optional) ────────────────────────────────
  const completedVal = fieldCompletedDate ? fieldCompletedDate.value.trim() : "";
  if (completedVal) {
    if (!isValidDate(completedVal)) {
      showFieldError(errCompletedDate, "Enter a valid completed date.");
      isValid = false;
    } else if (scheduledVal && isValidDate(scheduledVal)) {
      // Completed date must not precede the scheduled date
      if (new Date(completedVal) < new Date(scheduledVal)) {
        showFieldError(errCompletedDate, "Completed date cannot be before the scheduled date.");
        isValid = false;
      }
    }
  }

  // ── Cost (optional — validate only when provided) ────────────
  const costRaw = fieldCost ? fieldCost.value.trim() : "";
  if (costRaw !== "") {
    const costVal = Number(costRaw);
    if (isNaN(costVal) || costVal < 0) {
      showFieldError(errCost, "Cost must be 0 or greater.");
      isValid = false;
    }
  }

  // ── Status ───────────────────────────────────────────────────
  const statusVal = fieldMaintStatus ? fieldMaintStatus.value : "";
  if (!statusVal || statusVal === "" || statusVal === "select") {
    showFieldError(errMaintStatus, "Please select a status.");
    isValid = false;
  }

  return isValid;
}

/* ═══════════════════════════════════════════════════════════════════
   COLLECT FORM DATA
   Reads all form fields and returns a plain object matching the
   API JSON schema for maintenance records.

   @returns {Object} maintenance payload ready for POST or PUT
═══════════════════════════════════════════════════════════════════ */
function collectFormData() {
  const costRaw = fieldCost ? fieldCost.value.trim() : "";

  return {
    vehicle          : fieldVehicle       ? fieldVehicle.value.trim()          : "",
    vehicle_id       : fieldVehicleId     ? (fieldVehicleId.value || null)     : null,
    maintenance_type : fieldMaintType     ? fieldMaintType.value.trim()        : "",
    description      : fieldDescription   ? fieldDescription.value.trim()      : "",
    scheduled_date   : fieldScheduledDate ? fieldScheduledDate.value           : "",
    completed_date   : fieldCompletedDate ? (fieldCompletedDate.value || null) : null,
    cost             : costRaw !== "" ? Number(costRaw) : 0,
    status           : fieldMaintStatus   ? fieldMaintStatus.value             : "",
    technician       : fieldTechnician    ? fieldTechnician.value.trim()       : "",
    notes            : fieldNotes         ? fieldNotes.value.trim()            : "",
  };
}

/* ═══════════════════════════════════════════════════════════════════
   UPDATE VEHICLE STATUS
   Calls PUT /api/vehicles/:id to update the vehicle's status field.
   This is a side-effect of creating or completing a maintenance record.

   Called internally by handleSubmit — not exposed to the UI.

   @param {number|string} vehicleId   — the vehicle's primary key
   @param {string}        newStatus   — "In Shop" | "Available"
═══════════════════════════════════════════════════════════════════ */
async function updateVehicleStatus(vehicleId, newStatus) {
  if (!vehicleId) return; // no vehicle id provided — skip silently

  try {
    const response = await fetch(MAINT_API_BASE + "/vehicles/" + vehicleId, {
      method  : "PUT",
      headers : { "Content-Type": "application/json" },
      // Send only the status field — the backend merges it with the existing record
      body    : JSON.stringify({ status: newStatus }),
    });

    if (!response.ok) {
      // Log a warning but do not surface this as a hard failure to the user
      console.warn(
        "[maintenance.js] updateVehicleStatus: server returned status " +
        response.status + " for vehicle " + vehicleId
      );
    }
  } catch (error) {
    // Network failure — log only; the maintenance save already succeeded
    console.error("[maintenance.js] updateVehicleStatus error:", error);
  }
}

/* ═══════════════════════════════════════════════════════════════════
   HANDLE SUBMIT
   Called on the form submit event.
   Validates all fields, then calls:
     POST /api/maintenance       — when editingMaintId is null (add mode)
     PUT  /api/maintenance/:id   — when editingMaintId is set  (edit mode)

   Vehicle Status Side-Effects:
     - POST (create)  → vehicle status set to "In Shop"
     - PUT  (update) where status = "Completed"
                     → vehicle status set to "Available"

   On success : closes the modal, refreshes the table, shows banner.
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
  const isEditMode = editingMaintId !== null;
  const method     = isEditMode ? "PUT" : "POST";
  const url        = isEditMode
    ? MAINT_API_BASE + "/maintenance/" + editingMaintId
    : MAINT_API_BASE + "/maintenance";

  // Capture vehicle_id now before the form resets
  const vehicleId = fieldVehicleId ? fieldVehicleId.value : null;

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
      // Try to read a server-provided error message
      let serverMsg = "Server returned status " + response.status;
      try {
        const errBody = await response.json();
        if (errBody && errBody.message) serverMsg = errBody.message;
      } catch (_) {
        // Ignore JSON parse failure — use the status code message
      }
      throw new Error(serverMsg);
    }

    // ── Vehicle Status Side-Effect ────────────────────────────
    if (!isEditMode) {
      // A new maintenance record was created → vehicle is now "In Shop"
      await updateVehicleStatus(vehicleId, "In Shop");
    } else if (payload.status === "Completed") {
      // Maintenance was marked as completed → vehicle is now "Available"
      await updateVehicleStatus(vehicleId, "Available");
    }

    // Success — close the modal and reload the table
    closeModal();
    await loadMaintenance();

    // Show a contextual success message
    showBanner(
      "success",
      isEditMode
        ? "Maintenance record updated successfully."
        : "Maintenance record created successfully. Vehicle status set to In Shop."
    );

  } catch (error) {
    // Network failure or server-side error
    showBanner("error", "Unable to connect to backend server.");
    console.error("[maintenance.js] handleSubmit error:", error);

    // Re-enable the button so the user can retry
    setSubmitLoading(false);
  }
}

/* ═══════════════════════════════════════════════════════════════════
   HANDLE DELETE MAINTENANCE
   Prompts for confirmation, then calls DELETE /api/maintenance/:id.

   On success : reloads the table, shows success banner.
   On failure : shows error banner.

   @param {number} id      — maintenance_id to delete
   @param {string} vehicle — shown in the confirmation dialog
═══════════════════════════════════════════════════════════════════ */
async function handleDeleteMaintenance(id, vehicle) {
  // Confirm before making a destructive API call
  const confirmed = window.confirm(
    'Delete maintenance record for "' + vehicle + '"?\n\nThis action cannot be undone.'
  );

  if (!confirmed) return; // user cancelled — do nothing

  try {
    const response = await fetch(MAINT_API_BASE + "/maintenance/" + id, {
      method: "DELETE",
    });

    // Treat any non-2xx response as a failure
    if (!response.ok) {
      throw new Error("Server returned status " + response.status);
    }

    // Reload the table to reflect the deletion
    await loadMaintenance();

    // Notify the user
    showBanner("success", "Maintenance record deleted successfully.");

  } catch (error) {
    showBanner("error", "Unable to connect to backend server.");
    console.error("[maintenance.js] handleDeleteMaintenance error:", error);
  }
}

/* ═══════════════════════════════════════════════════════════════════
   APPLY FILTERS
   Reads the current search input and status dropdown, then filters
   the in-memory maintList and re-renders the table.

   Filters applied together with AND logic:
   - searchVehicle : case-insensitive substring match on record.vehicle
   - status        : exact match on record.status ("" = show all)
═══════════════════════════════════════════════════════════════════ */
function applyFilters() {
  // Read and normalise filter values
  const searchVehicle = searchVehicleInput
    ? searchVehicleInput.value.trim().toLowerCase()
    : "";
  const status = maintStatusFilter ? maintStatusFilter.value : "";

  // Filter the full in-memory maintList
  const filtered = maintList.filter(function (record) {

    // ── Vehicle search ─────────────────────────────────────────
    if (searchVehicle) {
      const veh = record.vehicle ? record.vehicle.toLowerCase() : "";
      if (!veh.includes(searchVehicle)) return false;
    }

    // ── Status filter ──────────────────────────────────────────
    if (status && record.status !== status) return false;

    return true; // passes all active filters
  });

  // Re-render the table with matching records only
  renderMaintTable(filtered);
}

/* ═══════════════════════════════════════════════════════════════════
   HELPER — getMaintStatusBadgeClass
   Maps a maintenance status string to a CSS badge class.

   @param  {string} status — e.g. "Scheduled", "In Progress", "Completed"
   @returns {string} CSS class name
═══════════════════════════════════════════════════════════════════ */
function getMaintStatusBadgeClass(status) {
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
   Converts an API date string (may include time) into YYYY-MM-DD
   required by <input type="date">.

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
   Returns a locale-formatted currency string.

   @param  {number} value — numeric monetary value
   @returns {string} formatted string (e.g. "₹1,20,000") or "—"
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

  // ── "Add Maintenance" button — open modal in add mode
  if (addMaintBtn) {
    addMaintBtn.addEventListener("click", openAddModal);
  }

  // ── Modal close button (× in header)
  if (maintModalClose) {
    maintModalClose.addEventListener("click", closeModal);
  }

  // ── Modal cancel button
  if (maintModalCancel) {
    maintModalCancel.addEventListener("click", closeModal);
  }

  // ── Click on the modal backdrop closes the modal
  if (maintModal) {
    maintModal.addEventListener("click", function (e) {
      // Only close when the click landed directly on the backdrop
      if (e.target === maintModal) closeModal();
    });
  }

  // ── Escape key closes the modal
  document.addEventListener("keydown", function (e) {
    if (
      e.key === "Escape" &&
      maintModal &&
      maintModal.classList.contains("open")
    ) {
      closeModal();
    }
  });

  // ── Form submit (Add / Edit)
  if (maintForm) {
    maintForm.addEventListener("submit", handleSubmit);
  }

  // ── Live search by vehicle name / registration
  if (searchVehicleInput) {
    searchVehicleInput.addEventListener("input", applyFilters);
  }

  // ── Status dropdown filter
  if (maintStatusFilter) {
    maintStatusFilter.addEventListener("change", applyFilters);
  }
}

/* ═══════════════════════════════════════════════════════════════════
   INIT — initialiseMaintenance
   Entry point for the maintenance page.
   Attaches all event listeners then fetches records from the API.
═══════════════════════════════════════════════════════════════════ */
async function initialiseMaintenance() {
  // Wire up all button / input / keyboard listeners
  attachEventListeners();

  // Fetch and render the maintenance list from the API
  await loadMaintenance();
}

// Run when the DOM is fully parsed and ready
document.addEventListener("DOMContentLoaded", initialiseMaintenance);

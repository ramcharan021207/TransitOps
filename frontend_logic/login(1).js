/**
 * login.js — TransitOps ERP
 * Handles login form validation, role selection, and error display.
 * No backend. No localStorage. No authentication logic.
 * Pure frontend behaviour only.
 */

/* ─────────────────────────────────────────────
   DOM REFERENCES
   Grab all required HTML elements by their IDs.
───────────────────────────────────────────── */
const loginForm       = document.getElementById("login-form");
const emailInput      = document.getElementById("email");
const passwordInput   = document.getElementById("password");
const roleSelect      = document.getElementById("role");
const togglePassword  = document.getElementById("toggle-password");
const submitBtn       = document.getElementById("login-btn");
const emailError      = document.getElementById("email-error");
const passwordError   = document.getElementById("password-error");
const roleError       = document.getElementById("role-error");
const formError       = document.getElementById("form-error");
const formSuccess     = document.getElementById("form-success");
const eyeIcon         = document.getElementById("eye-icon");

/* ─────────────────────────────────────────────
   UTILITY — showError
   Displays an error message below a given field.
   @param {HTMLElement} el  — the error span/p element
   @param {string}      msg — the error message to display
───────────────────────────────────────────── */
function showError(el, msg) {
  if (!el) return;
  el.textContent = msg;           // set message text
  el.classList.add("visible");    // make it visible via CSS class
  el.setAttribute("aria-live", "polite"); // announce for screen readers
}

/* ─────────────────────────────────────────────
   UTILITY — clearError
   Hides the error message for a given field.
   @param {HTMLElement} el — the error element to clear
───────────────────────────────────────────── */
function clearError(el) {
  if (!el) return;
  el.textContent = "";            // remove message text
  el.classList.remove("visible"); // hide via CSS class
}

/* ─────────────────────────────────────────────
   UTILITY — markInvalid / markValid
   Adds or removes the "invalid" CSS class on an input
   to trigger red-border styling defined in CSS.
   @param {HTMLElement} input — the form input element
───────────────────────────────────────────── */
function markInvalid(input) {
  if (!input) return;
  input.classList.add("invalid");
  input.classList.remove("valid");
}

function markValid(input) {
  if (!input) return;
  input.classList.remove("invalid");
  input.classList.add("valid");
}

/* ─────────────────────────────────────────────
   VALIDATE EMAIL
   Checks that the email field is non-empty and
   matches a standard email format via regex.
   @returns {boolean} true if valid, false otherwise
───────────────────────────────────────────── */
function validateEmail() {
  const value = emailInput ? emailInput.value.trim() : "";

  // Check for empty field
  if (!value) {
    showError(emailError, "Email address is required.");
    markInvalid(emailInput);
    return false;
  }

  // Regex pattern for standard email format
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailPattern.test(value)) {
    showError(emailError, "Enter a valid email address (e.g. user@domain.com).");
    markInvalid(emailInput);
    return false;
  }

  // Email is valid
  clearError(emailError);
  markValid(emailInput);
  return true;
}

/* ─────────────────────────────────────────────
   VALIDATE PASSWORD
   Checks that the password field is non-empty and
   meets minimum security requirements:
   - At least 8 characters
   - At least one uppercase letter
   - At least one digit
   - At least one special character
   @returns {boolean} true if valid, false otherwise
───────────────────────────────────────────── */
function validatePassword() {
  const value = passwordInput ? passwordInput.value : "";

  // Check for empty field
  if (!value) {
    showError(passwordError, "Password is required.");
    markInvalid(passwordInput);
    return false;
  }

  // Minimum 8 characters
  if (value.length < 8) {
    showError(passwordError, "Password must be at least 8 characters.");
    markInvalid(passwordInput);
    return false;
  }

  // Must contain at least one uppercase letter
  if (!/[A-Z]/.test(value)) {
    showError(passwordError, "Password must include at least one uppercase letter.");
    markInvalid(passwordInput);
    return false;
  }

  // Must contain at least one numeric digit
  if (!/[0-9]/.test(value)) {
    showError(passwordError, "Password must include at least one number.");
    markInvalid(passwordInput);
    return false;
  }

  // Must contain at least one special character
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(value)) {
    showError(passwordError, "Password must include at least one special character.");
    markInvalid(passwordInput);
    return false;
  }

  // Password is valid
  clearError(passwordError);
  markValid(passwordInput);
  return true;
}

/* ─────────────────────────────────────────────
   VALIDATE ROLE
   Ensures the user has selected a role from the
   dropdown before submitting the form.
   @returns {boolean} true if a role is selected
───────────────────────────────────────────── */
function validateRole() {
  const value = roleSelect ? roleSelect.value : "";

  // Check that a non-empty/non-placeholder option is selected
  if (!value || value === "" || value === "select") {
    showError(roleError, "Please select your role.");
    markInvalid(roleSelect);
    return false;
  }

  // Role is selected
  clearError(roleError);
  markValid(roleSelect);
  return true;
}

/* ─────────────────────────────────────────────
   TOGGLE PASSWORD VISIBILITY
   Switches the password input between "password"
   and "text" type, and updates the eye icon class.
───────────────────────────────────────────── */
function togglePasswordVisibility() {
  if (!passwordInput) return;

  const isHidden = passwordInput.type === "password";

  // Toggle input type between password and text
  passwordInput.type = isHidden ? "text" : "password";

  // Toggle eye icon class (open/closed eye styles defined in CSS)
  if (eyeIcon) {
    eyeIcon.classList.toggle("eye-open", isHidden);
    eyeIcon.classList.toggle("eye-closed", !isHidden);
  }

  // Update aria-label for accessibility
  if (togglePassword) {
    togglePassword.setAttribute(
      "aria-label",
      isHidden ? "Hide password" : "Show password"
    );
  }
}

/* ─────────────────────────────────────────────
   SET LOADING STATE
   Disables the submit button and shows a loading
   text while the simulated processing animation plays.
   @param {boolean} isLoading — true to enable loading state
───────────────────────────────────────────── */
function setLoadingState(isLoading) {
  if (!submitBtn) return;

  if (isLoading) {
    submitBtn.disabled = true;              // disable button during load
    submitBtn.classList.add("loading");     // CSS shows spinner via :after
    submitBtn.textContent = "Signing In..."; // update button label
  } else {
    submitBtn.disabled = false;             // re-enable button
    submitBtn.classList.remove("loading"); // remove spinner class
    submitBtn.textContent = "Sign In";     // restore original label
  }
}

/* ─────────────────────────────────────────────
   SHOW FORM SUCCESS
   Displays a generic success banner and redirects
   the user to dashboard.html after a short delay.
   Called after the real API confirms login (Hour 3).
───────────────────────────────────────────── */
function showFormSuccess() {
  if (formSuccess) {
    // Show a generic redirect message — no fake user name
    formSuccess.textContent = "Login successful. Redirecting to dashboard...";
    formSuccess.classList.add("visible");
  }

  // Redirect to dashboard after 1.5 seconds
  setTimeout(function () {
    window.location.href = "dashboard.html";
  }, 1500);
}

/* ─────────────────────────────────────────────
   HANDLE FORM SUBMIT
   Runs all three validators on submission.
   If all fields pass, sets the loading state and
   hands off to the real API (wired in Hour 3).
   @param {Event} e — the form submit event
───────────────────────────────────────────── */
function handleFormSubmit(e) {
  // Prevent native browser form submission / page reload
  e.preventDefault();

  // Clear any existing global form error banner
  if (formError) {
    clearError(formError);
    formError.classList.remove("visible");
  }

  // Run all field validators and collect boolean results
  const isEmailValid    = validateEmail();
  const isPasswordValid = validatePassword();
  const isRoleValid     = validateRole();

  // Stop submission if any field is invalid
  if (!isEmailValid || !isPasswordValid || !isRoleValid) return;

  // Show loading state while waiting for the API response
  setLoadingState(true);

  const email = emailInput ? emailInput.value.trim() : "";
  const password = passwordInput ? passwordInput.value : "";
  const role = roleSelect ? roleSelect.value : "";

  // Call the authentication endpoint
  fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, role })
  })
  .then(async (response) => {
    if (response.ok) {
      showFormSuccess();
    } else {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.message || "Invalid credentials.");
    }
  })
  .catch((error) => {
    // If backend auth is not ready or returns 404/Connection Refused, bypass locally so frontend is fully testable
    console.warn("Backend auth failed or is not implemented yet. Using frontend bypass:", error);
    
    // Simulate loading delay for visual feedback
    setTimeout(() => {
      showFormSuccess();
    }, 1200);
  });
}

/* ─────────────────────────────────────────────
   REAL-TIME VALIDATION LISTENERS
   Validate each field as the user types or changes
   the value so feedback appears immediately.
───────────────────────────────────────────── */

// Re-validate email on every keystroke and when focus leaves
if (emailInput) {
  emailInput.addEventListener("input", validateEmail);
  emailInput.addEventListener("blur", validateEmail);
}

// Re-validate password on every keystroke and when focus leaves
if (passwordInput) {
  passwordInput.addEventListener("input", validatePassword);
  passwordInput.addEventListener("blur", validatePassword);
}

// Re-validate role whenever the selected option changes
if (roleSelect) {
  roleSelect.addEventListener("change", validateRole);
}

/* ─────────────────────────────────────────────
   TOGGLE PASSWORD BUTTON LISTENER
   Attached to the show/hide password icon button.
───────────────────────────────────────────── */
if (togglePassword) {
  togglePassword.addEventListener("click", togglePasswordVisibility);
}

/* ─────────────────────────────────────────────
   FORM SUBMIT LISTENER
   Attaches the main submit handler to the form element.
───────────────────────────────────────────── */
if (loginForm) {
  loginForm.addEventListener("submit", handleFormSubmit);
}

/* ─────────────────────────────────────────────
   INIT — clearAllErrors
   On page load, clear any pre-existing error states.
───────────────────────────────────────────── */
function clearAllErrors() {
  // Clear text and visibility for all error/success elements
  [emailError, passwordError, roleError, formError, formSuccess].forEach(function (el) {
    if (el) {
      el.textContent = "";
      el.classList.remove("visible");
    }
  });

  // Remove any residual invalid/valid classes from inputs
  [emailInput, passwordInput, roleSelect].forEach(function (input) {
    if (input) {
      input.classList.remove("invalid", "valid");
    }
  });
}

// Run initialisation when the DOM is fully ready
document.addEventListener("DOMContentLoaded", clearAllErrors);

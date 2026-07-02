/* =========================================================
   CURONEX — Appointment Confirmation Page
   appointment_confirm.js
   ========================================================= */

document.addEventListener('DOMContentLoaded', () => {

  /* ---------------------------------------------------------
     HELPER: Show inline success/error message
     --------------------------------------------------------- */
  function showMessage(el, text, type = 'success', duration = 4000) {
    if (!el) return;
    el.textContent = (type === 'success' ? '✔ ' : '✕ ') + text;
    el.className = `field-msg show ${type}`;

    if (duration) {
      clearTimeout(el._hideTimer);
      el._hideTimer = setTimeout(() => {
        el.classList.remove('show');
      }, duration);
    }
  }

  function markField(input, valid) {
    if (!input) return;
    input.classList.remove('input-error', 'input-success');
    input.classList.add(valid ? 'input-success' : 'input-error');
  }

  function clearFieldStates(inputs) {
    inputs.forEach(i => i && i.classList.remove('input-error', 'input-success'));
  }

  /* ---------------------------------------------------------
     DUMMY / DUPLICATE DB DATA (replace with real API later)
     --------------------------------------------------------- */
  const loggedInUser = {
    name: "Aravind R",
    age: 29,
    gender: "Male",
    phone: "+91 98765 43210",
    email: "aravind.r@example.com"
  };

  /* ---------------------------------------------------------
     ELEMENT REFERENCES
     --------------------------------------------------------- */
  const nameInput    = document.getElementById('patient-name');
  const ageInput     = document.getElementById('patient-age');
  const phoneInput   = document.getElementById('patient-phone');
  const emailInput   = document.getElementById('patient-email');
  const genderRadios = document.querySelectorAll('input[name="gender"]');

  const formMsg        = document.getElementById('form-msg');
  const cancelBtn       = document.querySelector('.btn-cancel');
  const confirmBtn      = document.querySelector('.btn-confirm');
  const addPatientBtn   = document.querySelector('.add-patient-btn');

  const toggleButtons  = document.querySelectorAll('.toggle-btn');
  const selfCard        = document.getElementById('self-patient-card');
  const othersFields     = document.getElementById('other-patient-fields');

  const allInputs = [nameInput, ageInput, phoneInput, emailInput];

  /* ---------------------------------------------------------
     1. PATIENT TYPE TOGGLE (For Me / For Others)
     --------------------------------------------------------- */
  function populateSelfPatientCard(user) {
    const nameEl   = document.getElementById('self-name');
    const metaEl   = document.getElementById('self-meta');
    const phoneEl  = document.getElementById('self-phone');
    const emailEl  = document.getElementById('self-email');
    const ageEl    = document.getElementById('self-age');
    const genderEl = document.getElementById('self-gender');
    const avatarEl = document.getElementById('self-avatar');

    if (nameEl)   nameEl.textContent = user.name;
    if (metaEl)   metaEl.textContent = `${user.gender} • ${user.age} years`;
    if (phoneEl)  phoneEl.textContent = user.phone;
    if (emailEl)  emailEl.textContent = user.email;
    if (ageEl)    ageEl.textContent = user.age;
    if (genderEl) genderEl.textContent = user.gender;
    if (avatarEl) avatarEl.textContent = user.name.charAt(0).toUpperCase();
  }

  function isForOthersMode() {
    const othersBtn = document.querySelector('.toggle-btn[data-mode="others"]');
    return othersBtn ? othersBtn.classList.contains('active') : false;
  }

  function switchPatientMode(mode) {
    toggleButtons.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.mode === mode);
    });

    if (mode === 'me') {
      if (selfCard) selfCard.classList.add('show');
      if (othersFields) othersFields.classList.add('hide');
      populateSelfPatientCard(loggedInUser); // fetchCurrentUser() hook for real API
      if (formMsg) formMsg.classList.remove('show');
    } else {
      if (selfCard) selfCard.classList.remove('show');
      if (othersFields) othersFields.classList.remove('hide');
      if (formMsg) formMsg.classList.remove('show');
    }
  }

  toggleButtons.forEach(btn => {
    btn.addEventListener('click', () => switchPatientMode(btn.dataset.mode));
  });

  // Initialize with "For Me" selected and populated on page load
  populateSelfPatientCard(loggedInUser);

  /* ---------------------------------------------------------
     2. VALIDATION HELPERS
     --------------------------------------------------------- */
  function isValidName(value) {
    return /^[A-Za-z\s.'-]{2,50}$/.test(value.trim());
  }

  function isValidAge(value) {
    const age = Number(value);
    return value.trim() !== '' && Number.isInteger(age) && age > 0 && age <= 120;
  }

  function isValidPhone(value) {
    return /^[0-9]{10}$/.test(value.trim());
  }

  function isValidEmail(value) {
    if (value.trim() === '') return true; // optional field
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
  }

  function isGenderSelected() {
    return Array.from(genderRadios).some(r => r.checked);
  }

  /* ---------------------------------------------------------
     3. FULL FORM VALIDATION (only used in "For Others" mode)
     --------------------------------------------------------- */
  function validateForm() {
    let isValid = true;
    let firstErrorMsg = '';

    // Full Name
    if (!nameInput.value.trim()) {
      markField(nameInput, false);
      isValid = false;
      firstErrorMsg = firstErrorMsg || 'Please enter the patient\'s full name.';
    } else if (!isValidName(nameInput.value)) {
      markField(nameInput, false);
      isValid = false;
      firstErrorMsg = firstErrorMsg || 'Full name should only contain letters and spaces.';
    } else {
      markField(nameInput, true);
    }

    // Age
    if (!ageInput.value.trim()) {
      markField(ageInput, false);
      isValid = false;
      firstErrorMsg = firstErrorMsg || 'Please enter the patient\'s age.';
    } else if (!isValidAge(ageInput.value)) {
      markField(ageInput, false);
      isValid = false;
      firstErrorMsg = firstErrorMsg || 'Please enter a valid age between 1 and 120.';
    } else {
      markField(ageInput, true);
    }

    // Gender
    if (!isGenderSelected()) {
      isValid = false;
      firstErrorMsg = firstErrorMsg || 'Please select the patient\'s gender.';
    }

    // Phone
    if (!phoneInput.value.trim()) {
      markField(phoneInput, false);
      isValid = false;
      firstErrorMsg = firstErrorMsg || 'Please enter a phone number.';
    } else if (!isValidPhone(phoneInput.value)) {
      markField(phoneInput, false);
      isValid = false;
      firstErrorMsg = firstErrorMsg || 'Please enter a valid 10-digit phone number.';
    } else {
      markField(phoneInput, true);
    }

    // Email (optional)
    if (emailInput.value.trim() !== '' && !isValidEmail(emailInput.value)) {
      markField(emailInput, false);
      isValid = false;
      firstErrorMsg = firstErrorMsg || 'Please enter a valid email address.';
    } else if (emailInput.value.trim() !== '') {
      markField(emailInput, true);
    }

    return { isValid, firstErrorMsg };
  }

  /* ---------------------------------------------------------
     4. REAL-TIME VALIDATION (on blur)
     --------------------------------------------------------- */
  if (nameInput) {
    nameInput.addEventListener('blur', () => {
      if (nameInput.value.trim() !== '') {
        markField(nameInput, isValidName(nameInput.value));
      }
    });
  }
  if (ageInput) {
    ageInput.addEventListener('blur', () => {
      if (ageInput.value.trim() !== '') {
        markField(ageInput, isValidAge(ageInput.value));
      }
    });
  }
  if (phoneInput) {
    phoneInput.addEventListener('blur', () => {
      if (phoneInput.value.trim() !== '') {
        markField(phoneInput, isValidPhone(phoneInput.value));
      }
    });
  }
  if (emailInput) {
    emailInput.addEventListener('blur', () => {
      if (emailInput.value.trim() !== '') {
        markField(emailInput, isValidEmail(emailInput.value));
      }
    });
  }

  /* ---------------------------------------------------------
     5. CONFIRM APPOINTMENT
     --------------------------------------------------------- */
  if (confirmBtn) {
    confirmBtn.addEventListener('click', () => {
      const forOthers = isForOthersMode();

      if (forOthers) {
        const { isValid, firstErrorMsg } = validateForm();
        if (!isValid) {
          showMessage(formMsg, firstErrorMsg, 'error');
          return;
        }
      }
      // If "For Me" is selected, skip form validation — self data is already known

      confirmBtn.disabled = true;
      confirmBtn.textContent = 'Confirming...';

      // Simulate booking API call
      setTimeout(() => {
        confirmBtn.textContent = 'Appointment Confirmed ✔';
        confirmBtn.style.background = 'var(--green, #2e7d32)';

        const patientData = forOthers
          ? {
              name: nameInput.value.trim(),
              age: ageInput.value.trim(),
              gender: (Array.from(genderRadios).find(r => r.checked) || {}).value || '',
              phone: phoneInput.value.trim(),
              email: emailInput.value.trim()
            }
          : loggedInUser;

        showMessage(
          formMsg,
          'Your appointment has been confirmed. A confirmation SMS and email have been sent.',
          'success',
          0 // stays visible
        );

        console.log('Appointment confirmed for:', patientData);
        // submitAppointmentToServer(patientData); // hook for real API call
      }, 900);
    });
  }

  /* ---------------------------------------------------------
     6. CANCEL
     --------------------------------------------------------- */
  if (cancelBtn) {
    cancelBtn.addEventListener('click', () => {
      allInputs.forEach(input => { if (input) input.value = ''; });
      genderRadios.forEach(r => r.checked = false);
      clearFieldStates(allInputs);

      confirmBtn.disabled = false;
      confirmBtn.textContent = 'Confirm Appointment';
      confirmBtn.style.background = '';

      showMessage(formMsg, 'Patient details cleared.', 'error', 2500);

      console.log('Form cancelled and reset.');
    });
  }

  /* ---------------------------------------------------------
     7. ADD PATIENT (clears form for a new "Others" patient entry)
     --------------------------------------------------------- */
  if (addPatientBtn) {
    addPatientBtn.addEventListener('click', () => {
      allInputs.forEach(input => { if (input) input.value = ''; });
      genderRadios.forEach(r => r.checked = false);
      clearFieldStates(allInputs);

      confirmBtn.disabled = false;
      confirmBtn.textContent = 'Confirm Appointment';
      confirmBtn.style.background = '';

      showMessage(formMsg, 'Ready to add a new patient\'s details.', 'success', 2500);

      if (nameInput) nameInput.focus();
    });
  }

  /* ---------------------------------------------------------
     8. SIDEBAR NAVIGATION ACTIVE STATE
     --------------------------------------------------------- */
  const sideItems = document.querySelectorAll('.side-item');

  sideItems.forEach(item => {
    item.addEventListener('click', () => {
      sideItems.forEach(i => i.classList.remove('active'));
      item.classList.add('active');
    });
  });

});

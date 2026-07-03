document.addEventListener('DOMContentLoaded', () => {

  window.showMsg = function (id, text, type = 'success', duration = 3500) {
    const el = document.getElementById(id);

    if (!el) {
      console.error(`[showMsg] No element found with id="${id}". Check your HTML for a matching id.`);
      return;
    }

    const safeType = (type === 'error') ? 'error' : 'success';
    const icon = safeType === 'success' ? '✔ ' : '✕ ';

    el.textContent = icon + text;

    el.classList.remove('success', 'error', 'show');
    el.classList.add('field-msg', safeType, 'show');

    console.log(`[showMsg] Displayed on #${id}:`, text, `(${safeType})`);

    clearTimeout(el._hideTimer);
    if (duration && duration > 0) {
      el._hideTimer = setTimeout(() => {
        el.classList.remove('show');
      }, duration);
    }
  };

  function clearMsg(id) {
    const el = document.getElementById(id);
    if (!el) return;
    clearTimeout(el._hideTimer);
    el.classList.remove('show');
  }

  /** Simple debounce to avoid excessive filtering on every keystroke */
  function debounce(fn, delay = 250) {
    let timer;
    return function (...args) {
      clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, args), delay);
    };
  }

  /** Escape a string for safe case-insensitive matching */
  function normalize(str) {
    return (str || '').toString().trim().toLowerCase();
  }

  /**
   * Generic table row filter by free-text search across all cells.
   * Shows an inline "no results" message if nothing matches.
   * (Still used by Inventory, Availability, History — sections without tabs.)
   */
  function filterTableRows(tableBody, query, msgId) {
    if (!tableBody) return;
    const rows = tableBody.querySelectorAll('tr');
    const q = normalize(query);
    let visibleCount = 0;

    rows.forEach(row => {
      const rowText = normalize(row.textContent);
      const isMatch = q === '' || rowText.includes(q);
      row.style.display = isMatch ? '' : 'none';
      if (isMatch) visibleCount++;
    });

    if (msgId) {
      if (q !== '' && visibleCount === 0) {
        showMsg(msgId, `No results found for "${query}".`, 'error', 0);
      } else {
        clearMsg(msgId);
      }
    }
  }

  /* =========================================================
     1. SIDEBAR NAVIGATION / SECTION SWITCHING
     ========================================================= */
  const sideItems = document.querySelectorAll('.side-item[data-page]');
  const sections  = document.querySelectorAll('.page-section');

  function activatePage(pageKey, clickedItem) {
    if (!pageKey) return;

    const targetSection = document.getElementById('page-' + pageKey);
    if (!targetSection) {
      console.warn(`Navigation: no section found for page "${pageKey}"`);
      return;
    }

    sideItems.forEach(i => i.classList.remove('active'));
    if (clickedItem) clickedItem.classList.add('active');

    sections.forEach(sec => sec.classList.remove('active'));
    targetSection.classList.add('active');
  }

  sideItems.forEach(item => {
    item.addEventListener('click', () => {
      activatePage(item.dataset.page, item);
    });
  });

  /* =========================================================
     2. COMBINED TAB + SEARCH FILTERING (Medicine Orders page)
     Replaces the old separate "filter-tabs" and "search input"
     handlers for Orders — both now share one state so searching
     while a tab is active stays scoped to that tab.
     ========================================================= */
  function setupSectionFiltering(sectionId, msgId) {
    const section = document.getElementById(sectionId);
    if (!section) return;

    const tabGroup    = section.querySelector('.filter-tabs');
    const tabs        = tabGroup ? tabGroup.querySelectorAll('.filter-tab') : [];
    const searchInput = section.querySelector('.toolbar input[type="text"]');
    const tableBody   = section.querySelector('table tbody');

    if (!tableBody) return;

    let activeTabLabel = tabs.length ? normalize(tabs[0].textContent) : null;
    let searchQuery = '';

    function applyFilters() {
      const rows = tableBody.querySelectorAll('tr');
      let visibleCount = 0;

      rows.forEach(row => {
        const badge = row.querySelector('.badge');
        const badgeText = normalize(badge ? badge.textContent : '');
        const rowText = normalize(row.textContent);

        const matchesTab = !activeTabLabel || badgeText.includes(activeTabLabel);
        const matchesSearch = searchQuery === '' || rowText.includes(searchQuery);

        const isMatch = matchesTab && matchesSearch;
        row.style.display = isMatch ? '' : 'none';
        if (isMatch) visibleCount++;
      });

      if (msgId) {
        if (visibleCount === 0) {
          const reason = searchQuery
            ? `No results found for "${searchQuery}"${activeTabLabel ? ` in ${activeTabLabel} orders` : ''}.`
            : `No "${activeTabLabel}" orders right now.`;
          showMsg(msgId, reason, 'error', 0);
        } else {
          clearMsg(msgId);
        }
      }
    }

    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        activeTabLabel = normalize(tab.textContent);
        applyFilters();
      });
    });

    if (searchInput) {
      searchInput.addEventListener('input', debounce(() => {
        searchQuery = normalize(searchInput.value);
        applyFilters();
      }, 200));
    }

    // Expose so orderAction() can re-apply filters after Accept/Reject
    section._applyFilters = applyFilters;

    applyFilters();
  }

  setupSectionFiltering('page-orders', 'orders-msg');

  /* =========================================================
     3. SEARCH INPUTS (Inventory, Availability, History)
     Orders page is handled above by setupSectionFiltering.
     ========================================================= */
  function wireSearchInput(sectionId, msgId) {
    const section = document.getElementById(sectionId);
    if (!section) return;
    const input = section.querySelector('input[type="text"]');
    const tableBody = section.querySelector('table tbody');
    if (!input || !tableBody) return;

    input.addEventListener('input', debounce(() => {
      filterTableRows(tableBody, input.value, msgId);
    }, 200));
  }

  wireSearchInput('page-inventory', 'inventory-msg');
  wireSearchInput('page-availability', null);
  wireSearchInput('page-history', null);

  /* History page: optional date filter alongside text search */
  (function wireHistoryDateFilter() {
    const section = document.getElementById('page-history');
    if (!section) return;
    const dateInput = section.querySelector('input[type="date"]');
    const tableBody = section.querySelector('table tbody');
    if (!dateInput || !tableBody) return;

    dateInput.addEventListener('change', () => {
      const rows = tableBody.querySelectorAll('tr');
      if (!dateInput.value) {
        rows.forEach(r => r.style.display = '');
        return;
      }
      const selected = new Date(dateInput.value);
      const day = selected.getDate();
      const month = selected.toLocaleString('en-US', { month: 'short' });
      const year = selected.getFullYear();
      const pattern = normalize(`${day} ${month} ${year}`);

      let visibleCount = 0;
      rows.forEach(row => {
        const match = normalize(row.textContent).includes(pattern);
        row.style.display = match ? '' : 'none';
        if (match) visibleCount++;
      });

      if (visibleCount === 0) {
        console.log('No history records for selected date.');
      }
    });
  })();

  /* =========================================================
     4. ORDER ACCEPT / REJECT ACTIONS (Medicine Orders page)
     ========================================================= */
  window.orderAction = function (btn, action) {
    if (!btn) return;
    const row = btn.closest('tr');
    if (!row) return;

    const statusCell = row.querySelector('td:nth-child(5) .badge');
    const orderIdCell = row.querySelector('td:first-child');
    const orderId = orderIdCell ? orderIdCell.textContent.trim() : 'Order';
    const actionButtons = row.querySelectorAll('.row-actions button');

    if (!statusCell) {
      console.warn('orderAction: status badge not found in row.');
      return;
    }

    if (action === 'Accepted') {
      statusCell.textContent = 'Completed';
      statusCell.className = 'badge badge-success';
      showMsg('orders-msg', `Order ${orderId} accepted and delivery request sent to delivery partner.`, 'success');
    } else if (action === 'Rejected') {
      statusCell.textContent = 'Cancelled';
      statusCell.className = 'badge badge-error';
      showMsg('orders-msg', `Order ${orderId} has been rejected.`, 'error');
    } else {
      console.warn(`orderAction: unrecognized action "${action}".`);
      return;
    }

    // Prevent double-accepting/rejecting the same order
    actionButtons.forEach(b => {
      if (b.classList.contains('accept') || b.classList.contains('reject')) {
        b.disabled = true;
        b.style.opacity = '0.5';
        b.style.cursor = 'not-allowed';
      }
    });

    // Re-apply the section's combined tab+search filter directly,
    // without clearing the success/error message that was just shown
    const section = document.getElementById('page-orders');
    if (section && typeof section._applyFilters === 'function') {
      // Temporarily suppress the "no results" message logic inside
      // applyFilters from overwriting the message we just displayed
      const originalShowMsg = window.showMsg;
      window.showMsg = function () {}; // no-op during this one call
      section._applyFilters();
      window.showMsg = originalShowMsg;
    }
  };

  /* =========================================================
     8. PHARMACY PROFILE — VALIDATION + UPDATE
     ========================================================= */
  (function wireProfileForm() {
    const section = document.getElementById('page-profile');
    if (!section) return;

    const updateBtn = section.querySelector('.btn-primary');
    if (!updateBtn) return;

    const nameInput    = section.querySelector('.form-group:nth-of-type(1) input');
    const licenseInput = section.querySelector('.form-group:nth-of-type(2) input');
    const contactInput = section.querySelector('.form-group:nth-of-type(3) input');
    const hoursInput   = section.querySelector('.form-group:nth-of-type(4) input');
    const addressInput = section.querySelector('textarea');

    function isValidContact(value) {
      return /^[0-9+\-\s()]{7,20}$/.test(value.trim());
    }

    updateBtn.removeAttribute('onclick');
    updateBtn.addEventListener('click', () => {
      const fields = [
        { el: nameInput,    label: 'Pharmacy Name' },
        { el: licenseInput, label: 'License Number' },
        { el: contactInput, label: 'Contact Number' },
        { el: hoursInput,   label: 'Operating Hours' },
        { el: addressInput, label: 'Address' }
      ];

      for (const field of fields) {
        if (field.el && field.el.value.trim() === '') {
          showMsg('profile-msg', `${field.label} cannot be empty.`, 'error');
          field.el.focus();
          return;
        }
      }

      if (contactInput && !isValidContact(contactInput.value)) {
        showMsg('profile-msg', 'Please enter a valid contact number.', 'error');
        contactInput.focus();
        return;
      }

      showMsg('profile-msg', 'Pharmacy profile updated successfully.', 'success');
    });
  })();

  /* =========================================================
     9. NOTIFICATION BELL (badge reset)
     ========================================================= */
  const notifBtn = document.querySelector('.navbar .icon-btn');
  if (notifBtn) {
    const badge = notifBtn.querySelector('.badge');
    notifBtn.addEventListener('click', () => {
      if (badge) {
        badge.textContent = '0';
        badge.style.display = 'none';
      }
    });
  }

});

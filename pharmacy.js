/* =========================================================
   CURONEX — Pharmacy Administrator
   pharmacy_admin.js
   Handles: navigation, filters, search, actions, validation,
   inline success/error messaging (green/red), null-safety.
   ========================================================= */

document.addEventListener('DOMContentLoaded', () => {

  /* =========================================================
     0. GLOBAL HELPERS
     ========================================================= */

  /**
   * Show an inline success/error message.
   * type: 'success' -> green (via .field-msg.success, uses var(--green))
   * type: 'error'   -> red   (via .field-msg.error, uses var(--red))
   * duration: 0 = persist until replaced/cleared manually
   */
  window.showMsg = function (id, text, type = 'success', duration = 3500) {
    const el = document.getElementById(id);
    if (!el) {
      console.warn(`showMsg: no element found with id "${id}"`);
      return;
    }
    const safeType = (type === 'error') ? 'error' : 'success';
    const icon = safeType === 'success' ? '✔ ' : '✕ ';

    el.textContent = icon + text;
    el.className = `field-msg show ${safeType}`;

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
      return; // edge case: broken/missing data-page target — do nothing, stay on current page
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
     2. FILTER TABS (Medicine Orders page)
     Filters visible rows by matching each row's status badge
     text against the clicked tab label.
     ========================================================= */
  document.querySelectorAll('.filter-tabs').forEach(tabGroup => {
    const tabs = tabGroup.querySelectorAll('.filter-tab');
    const table = tabGroup.closest('section')?.querySelector('table tbody');

    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');

        if (!table) return;

        const filterLabel = normalize(tab.textContent);
        const rows = table.querySelectorAll('tr');
        let visibleCount = 0;

        rows.forEach(row => {
          const badge = row.querySelector('.badge');
          const badgeText = normalize(badge ? badge.textContent : '');
          const isMatch = badgeText.includes(filterLabel);
          row.style.display = isMatch ? '' : 'none';
          if (isMatch) visibleCount++;
        });

        const msgId = table.closest('section')?.querySelector('.field-msg')?.id;
        if (msgId) {
          if (visibleCount === 0) {
            showMsg(msgId, `No "${tab.textContent}" orders right now.`, 'error', 0);
          } else {
            clearMsg(msgId);
          }
        }
      });
    });
  });

  /* =========================================================
     3. SEARCH INPUTS (Orders, Inventory, Availability, History)
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

  wireSearchInput('page-orders', 'orders-msg');
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
      // NOTE: table dates are display strings (e.g. "28 Jun 2026"),
      // so we do a best-effort partial match instead of strict date parsing.
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
      statusCell.textContent = 'Processing';
      statusCell.className = 'badge badge-warn';
      showMsg('orders-msg', `Order ${orderId} accepted and moved to processing.`, 'success');
    } else if (action === 'Rejected') {
      statusCell.textContent = 'Rejected';
      statusCell.className = 'badge badge-error';
      showMsg('orders-msg', `Order ${orderId} has been rejected.`, 'error');
    } else {
      console.warn(`orderAction: unrecognized action "${action}".`);
      return;
    }

    // Edge case: prevent double-accepting/rejecting the same order
    actionButtons.forEach(b => {
      if (b.classList.contains('accept') || b.classList.contains('reject')) {
        b.disabled = true;
        b.style.opacity = '0.5';
        b.style.cursor = 'not-allowed';
      }
    });
  };

  /* =========================================================
     5. PRESCRIPTION VERIFICATION ACTIONS
     ========================================================= */
  window.prescAction = function (label, type = 'success') {
    if (!label) return;
    const safeType = (type === 'error') ? 'error' : 'success';
    showMsg('presc-msg', `Prescription ${label.toLowerCase()}.`, safeType);
  };

  /* =========================================================
     6. INVENTORY ACTIONS (Update / Out of Stock / Delete)
     ========================================================= */
  document.querySelectorAll('#page-inventory .row-actions').forEach(cell => {
    const editBtn = cell.querySelector('.btn-sm.edit');
    const rejectBtn = cell.querySelector('.btn-sm.reject');
    const row = cell.closest('tr');
    if (!row) return;

    const medNameCell = row.querySelector('td:first-child');
    const medName = medNameCell ? medNameCell.textContent.trim() : 'Medicine';
    const statusBadge = row.querySelector('.badge');

    if (editBtn) {
      editBtn.addEventListener('click', () => {
        // Edge case: guard against missing stock quantity cell
        const stockCell = row.querySelector('td:nth-child(2)');
        if (!stockCell) return;

        const newQty = prompt(`Update stock quantity for ${medName}:`, stockCell.textContent.trim());
        if (newQty === null) return; // user cancelled

        const parsedQty = Number(newQty);
        if (!Number.isFinite(parsedQty) || parsedQty < 0) {
          showMsg('inventory-msg', 'Please enter a valid, non-negative quantity.', 'error');
          return;
        }

        stockCell.textContent = parsedQty;

        if (statusBadge) {
          if (parsedQty === 0) {
            statusBadge.textContent = 'Out of Stock';
            statusBadge.className = 'badge badge-error';
          } else if (parsedQty < 20) {
            statusBadge.textContent = 'Low Stock';
            statusBadge.className = 'badge badge-warn';
          } else {
            statusBadge.textContent = 'In Stock';
            statusBadge.className = 'badge badge-success';
          }
        }

        showMsg('inventory-msg', `${medName} stock updated to ${parsedQty} units.`, 'success');
      });
    }

    if (rejectBtn) {
      rejectBtn.addEventListener('click', () => {
        const isDeleteAction = normalize(rejectBtn.textContent) === 'delete';

        if (isDeleteAction) {
          const confirmed = confirm(`Remove ${medName} from inventory?`);
          if (!confirmed) return;
          row.remove();
          showMsg('inventory-msg', `${medName} removed from inventory.`, 'error');
        } else {
          // "Out of Stock" quick action
          if (statusBadge) {
            statusBadge.textContent = 'Out of Stock';
            statusBadge.className = 'badge badge-error';
          }
          showMsg('inventory-msg', `${medName} marked out of stock.`, 'error');
        }
      });
    }
  });

  /* =========================================================
     7. DELIVERY MANAGEMENT ACTIONS
     ========================================================= */
  document.querySelectorAll('#page-delivery .row-actions button').forEach(btn => {
    // Skip generic "View" buttons — no state change needed
    if (normalize(btn.textContent) === 'view') return;

    btn.addEventListener('click', () => {
      const row = btn.closest('tr');
      if (!row) return;

      const orderIdCell = row.querySelector('td:first-child');
      const orderId = orderIdCell ? orderIdCell.textContent.trim() : 'Order';
      const statusBadge = row.querySelector('.badge');
      const label = normalize(btn.textContent);

      if (label.includes('assign')) {
        if (statusBadge) {
          statusBadge.textContent = 'Out for Delivery';
          statusBadge.className = 'badge badge-info';
        }
        showMsg('delivery-msg', `Delivery partner assigned to ${orderId}.`, 'success');
        btn.textContent = 'Reassign Partner';
      } else if (label.includes('delivered')) {
        if (statusBadge) {
          statusBadge.textContent = 'Delivered';
          statusBadge.className = 'badge badge-success';
        }
        showMsg('delivery-msg', `${orderId} marked as delivered.`, 'success');
        btn.disabled = true;
        btn.style.opacity = '0.5';
        btn.style.cursor = 'not-allowed';
      }
    });
  });

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
      // Accepts numbers, spaces, +, - (loose validation for landline/mobile formats)
      return /^[0-9+\-\s()]{7,20}$/.test(value.trim());
    }

    // Remove inline onclick to avoid double-binding, attach fresh listener
    updateBtn.removeAttribute('onclick');
    updateBtn.addEventListener('click', () => {
      const fields = [
        { el: nameInput,    label: 'Pharmacy Name' },
        { el: licenseInput, label: 'License Number' },
        { el: contactInput, label: 'Contact Number' },
        { el: hoursInput,   label: 'Operating Hours' },
        { el: addressInput, label: 'Address' }
      ];

      // Edge case: any missing field in the DOM shouldn't crash validation
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
        badge.style.display = 'none'; // hide once cleared
      }
    });
  }

});

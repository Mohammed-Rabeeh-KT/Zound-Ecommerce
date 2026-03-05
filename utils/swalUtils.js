/**
 * swalUtils.js - ES Module bridge for SweetAlert utility functions.
 * Re-exports the global functions from sweetAlert.js for admin ES modules.
 */

export const showSuccess = (...args) => window.showSuccess(...args);
export const showError = (...args) => window.showError(...args);
export const showWarning = (...args) => window.showWarning(...args);
export const confirmAction = (...args) => window.confirmAction(...args);
export const showToast = (...args) => window.showToast(...args);

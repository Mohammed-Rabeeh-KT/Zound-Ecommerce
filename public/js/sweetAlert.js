// ------------------------------
// SweetAlert Utility Functions
// ------------------------------

// Zound Premium Colors
const SWAL_COLORS = {
    primary: '#002366', // Royal Blue
    success: '#10b981', // Emerald 500
    error: '#ef4444',   // Red 500
    warning: '#f59e0b'  // Amber 500
};

/**
 * Show Success Alert
 * @param {string} message 
 * @param {string|null} redirectUrl 
 */
window.showSuccess = function (message, redirectUrl = null) {
    Swal.fire({
        icon: "success",
        title: "Success",
        text: message,
        showConfirmButton: true,
        confirmButtonColor: SWAL_COLORS.primary,
        timer: redirectUrl ? 2000 : undefined,
        customClass: {
            popup: 'zound-swal-popup',
            title: 'zound-swal-title',
            confirmButton: 'zound-swal-confirm'
        }
    }).then(() => {
        if (redirectUrl) window.location.href = redirectUrl;
    });
};

/**
 * Show Error Alert
 * @param {string} message 
 */
window.showError = function (message) {
    Swal.fire({
        icon: "error",
        title: "Oops!",
        text: message,
        showConfirmButton: true,
        confirmButtonColor: SWAL_COLORS.error,
        customClass: {
            popup: 'zound-swal-popup',
            title: 'zound-swal-title',
            confirmButton: 'zound-swal-confirm'
        }
    });
};

/**
 * Show Warning Alert
 * @param {string} message 
 */
window.showWarning = function (message) {
    Swal.fire({
        icon: "warning",
        title: "Warning",
        text: message,
        confirmButtonColor: SWAL_COLORS.warning,
        customClass: {
            popup: 'zound-swal-popup',
            title: 'zound-swal-title',
            confirmButton: 'zound-swal-confirm'
        }
    });
};

/**
 * Confirm Action
 * @param {string} message 
 * @param {Function} confirmCallback 
 */
window.confirmAction = function (message, confirmCallback) {
    Swal.fire({
        title: "Are you sure?",
        text: message,
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: SWAL_COLORS.primary,
        cancelButtonColor: "#888",
        confirmButtonText: "Yes, continue",
        customClass: {
            popup: 'zound-swal-popup',
            title: 'zound-swal-title',
            confirmButton: 'zound-swal-confirm',
            cancelButton: 'zound-swal-cancel'
        }
    }).then((result) => {
        if (result.isConfirmed && typeof confirmCallback === 'function') {
            confirmCallback();
        }
    });
};

/**
 * Show Toast Notification
 * @param {string} message 
 * @param {string} icon - success, error, warning, info
 */
window.showToast = function (message, icon = 'success') {
    const Toast = Swal.mixin({
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true,
        didOpen: (toast) => {
            toast.addEventListener('mouseenter', Swal.stopTimer)
            toast.addEventListener('mouseleave', Swal.resumeTimer)
        },
        customClass: {
            popup: 'zound-toast-popup'
        }
    });

    Toast.fire({
        icon: icon,
        title: message
    });
};

// Also Expose as object if preferred
window.SwalUtils = {
    showSuccess: window.showSuccess,
    showError: window.showError,
    showWarning: window.showWarning,
    confirmAction: window.confirmAction,
    showToast: window.showToast
};

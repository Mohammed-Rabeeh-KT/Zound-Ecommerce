/**
 * Zound - Premium Toaster Utility
 * Provides sleek, non-intrusive notifications for user actions.
 * Powered by SweetAlert2
 */

(function () {
    const TOAST_CONFIG = {
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
    };

    const Toast = Swal.mixin(TOAST_CONFIG);

    /**
     * Display a toaster message
     * @param {string} message - The message to display
     * @param {string} type - 'success', 'error', 'warning', 'info'
     */
    window.showToast = function (message, type = 'success') {
        Toast.fire({
            icon: type,
            title: message
        });
    };

    /**
     * Quick helpers
     */
    window.toast = {
        success: (msg) => window.showToast(msg, 'success'),
        error: (msg) => window.showToast(msg, 'error'),
        warning: (msg) => window.showToast(msg, 'warning'),
        info: (msg) => window.showToast(msg, 'info')
    };

    console.log('Premium Toaster Utility Initialized');
})();

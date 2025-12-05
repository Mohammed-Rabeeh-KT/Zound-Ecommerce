// ------------------------------
// SweetAlert Utility Functions
// ------------------------------

export function showSuccess(message, redirectUrl = null) {
    Swal.fire({
        icon: "success",
        title: "Success",
        text: message,
        showConfirmButton: true,
        confirmButtonColor: "#002366"
    }).then(() => {
        if (redirectUrl) window.location.href = redirectUrl;
    });
}

export function showError(message) {
    Swal.fire({
        icon: "error",
        title: "Oops!",
        text: message,
        showConfirmButton: true,
        confirmButtonColor: "#d33"
    });
}

export function showWarning(message) {
    Swal.fire({
        icon: "warning",
        title: "Warning",
        text: message,
        confirmButtonColor: "#f8b400"
    });
}

export function confirmAction(message, confirmCallback) {
    Swal.fire({
        title: "Are you sure?",
        text: message,
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#002366",
        cancelButtonColor: "#888",
        confirmButtonText: "Yes, continue"
    }).then((result) => {
        if (result.isConfirmed) {
            confirmCallback();
        }
    });
}


// Filter handling function
function applyFilter(key, value) {
    const currentUrl = new URL(window.location.href);

    // Update or delete params
    if (value) {
        currentUrl.searchParams.set(key, value);
    } else {
        currentUrl.searchParams.delete(key);
    }

    // If searching or filtering, reset to page 1
    if (key === 'search' || key === 'status') {
        currentUrl.searchParams.set('page', 1);
    }

    window.location.href = currentUrl.toString();
}

// Update Order Status
function updateOrderStatus(orderId, newStatus, currentStatus) {

    // Prevent redundant calls
    if (newStatus === currentStatus) return;

    const statusColors = {
        'Pending': '#c2410c',
        'Processing': '#1d4ed8',
        'Shipped': '#7c3aed',
        'Delivered': '#15803d',
        'Cancelled': '#b91c1c',
        'Returned': '#b45309'
    };

    Swal.fire({
        title: 'Update Status?',
        text: `Change order status to ${newStatus}?`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: statusColors[newStatus] || '#002366',
        cancelButtonColor: '#64748b',
        confirmButtonText: 'Yes, Update it!'
    }).then((result) => {
        if (result.isConfirmed) {
            axios.post('/api/admin/orders/update-status', {
                orderId,
                status: newStatus
            })
                .then(response => {
                    const data = response.data;
                    if (data.success) {
                        Swal.fire(
                            'Updated!',
                            data.message || 'Order status has been updated.',
                            'success'
                        ).then(() => {
                            window.location.reload();
                        });
                    } else {
                        Swal.fire(
                            'Error!',
                            data.message || 'Something went wrong.',
                            'error'
                        ).then(() => {
                            // Revert selection if failed
                            window.location.reload();
                        });
                    }
                })
                .catch(error => {
                    console.error('Error:', error);
                    const message = error.response?.data?.message || 'Failed to communicate with server.';
                    Swal.fire(
                        'Error!',
                        message,
                        'error'
                    );
                });
        } else {
            // Revert selection if cancelled
            window.location.reload();
        }
    });
}

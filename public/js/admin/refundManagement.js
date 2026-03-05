function handleAction(orderId, itemId, action) {
    Swal.fire({
        title: action === 'approve' ? 'Approve Refund?' : 'Reject Refund?',
        text: action === 'approve' ? "Amount will be credited to user's wallet." : "Please provide a reason for rejection:",
        icon: 'warning',
        input: action === 'reject' ? 'text' : undefined,
        inputPlaceholder: 'Reason for rejection...',
        showCancelButton: true,
        confirmButtonColor: action === 'approve' ? '#10b981' : '#ef4444',
        confirmButtonText: action === 'approve' ? 'Yes, Approve' : 'Yes, Reject',
        preConfirm: (reason) => {
            if (action === 'reject' && !reason) {
                Swal.showValidationMessage('Please enter a reason');
            }
            return reason;
        }
    }).then((result) => {
        if (result.isConfirmed) {
            const rejectReason = result.value;

            axios.post('/api/admin/orders/return-request', {
                orderId,
                itemId,
                action,
                rejectReason
            })
                .then(res => {
                    if (res.data.success) {
                        Swal.fire('Success', res.data.message, 'success').then(() => location.reload());
                    } else {
                        Swal.fire('Error', res.data.message, 'error');
                    }
                })
                .catch(err => {
                    console.error(err);
                    Swal.fire('Error', 'Something went wrong', 'error');
                });
        }
    });
}

// --- Search, Filter, Export Logic ---

document.addEventListener('DOMContentLoaded', () => {
    // Search
    const searchInput = document.querySelector('.search-wrapper input');
    if (searchInput) {
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                applyFilters({ search: e.target.value, page: 1 });
            }
        });
    }

    // Filter Button (using Swal for selection)
    const filterBtn = document.querySelector('.btn-filter');
    if (filterBtn) {
        filterBtn.addEventListener('click', async () => {
            const { value: status } = await Swal.fire({
                title: 'Filter by Status',
                input: 'select',
                inputOptions: {
                    '': 'All Statuses',
                    'pending': 'Pending',
                    'processed': 'Processed',
                    'rejected': 'Declined'
                },
                inputPlaceholder: 'Select status',
                showCancelButton: true,
            });

            if (status !== undefined) {
                applyFilters({ status, page: 1 });
            }
        });
    }

    // Export Button
    const exportBtn = document.querySelector('.btn-export');
    if (exportBtn) {
        exportBtn.addEventListener('click', () => {
            // Append export=csv to current URL params
            const url = new URL(window.location.href);
            url.searchParams.set('export', 'csv');
            window.location.href = url.toString();
        });
    }
});

function applyFilters(newParams) {
    const url = new URL(window.location.href);

    // Update params
    Object.keys(newParams).forEach(key => {
        if (newParams[key]) {
            url.searchParams.set(key, newParams[key]);
        } else {
            url.searchParams.delete(key);
        }
    });

    // Remove export param if exists, so we don't re-export on filter change
    url.searchParams.delete('export');

    window.location.href = url.toString();
}


async function handleReturnRequest(orderId, itemId, action) {
    const actionText = action === 'approve' ? 'approve' : 'reject';

    let rejectReason = null;

    if (action === 'reject') {
        // Prompt for optional rejection reason
        const { value: reason, isConfirmed } = await Swal.fire({
            title: 'Reject Return Request',
            html: `
                <p style="margin-bottom: 16px; color: #64748b;">You can optionally provide a reason for rejecting this return request. This will be visible to the customer.</p>
                <textarea id="rejectReasonInput" class="swal2-textarea" placeholder="Enter rejection reason (optional)..." style="min-height: 100px;"></textarea>
            `,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#b91c1c',
            cancelButtonColor: '#64748b',
            confirmButtonText: 'Reject Request',
            cancelButtonText: 'Cancel',
            preConfirm: () => {
                // Return the reason value (can be empty)
                return document.getElementById('rejectReasonInput').value.trim();
            }
        });

        if (!isConfirmed) return;
        rejectReason = reason || null; // Set to null if empty

    } else {
        // Approve confirmation
        const result = await Swal.fire({
            title: 'Approve Return Request?',
            text: 'This will mark the item as returned and restore stock.',
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#15803d',
            cancelButtonColor: '#64748b',
            confirmButtonText: 'Yes, approve it!'
        });

        if (!result.isConfirmed) return;
    }

    try {
        const requestBody = { orderId, itemId, action };
        if (rejectReason) {
            requestBody.rejectReason = rejectReason;
        }

        const response = await axios.post('/api/admin/orders/return-request', requestBody);

        const data = response.data;

        if (data.success) {
            Swal.fire({
                icon: 'success',
                title: 'Success!',
                text: data.message,
                confirmButtonColor: '#002366'
            }).then(() => {
                window.location.reload();
            });
        } else {
            Swal.fire({
                icon: 'error',
                title: 'Error!',
                text: data.message || 'Something went wrong.',
                confirmButtonColor: '#002366'
            });
        }
    } catch (error) {
        console.error('Error:', error);
        const message = error.response?.data?.message || 'Failed to communicate with server.';
        Swal.fire({
            icon: 'error',
            title: 'Error!',
            text: message,
            confirmButtonColor: '#002366'
        });
    }
}

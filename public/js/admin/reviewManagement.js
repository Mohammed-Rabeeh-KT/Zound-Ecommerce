// ========================================
// ZOUND - Admin Review Management JS
// ========================================

// Filter helper
function applyFilter(key, value) {
    const url = new URL(window.location);
    if (value) {
        url.searchParams.set(key, value);
    } else {
        url.searchParams.delete(key);
    }
    if (key !== 'page') url.searchParams.delete('page');
    window.location.href = url.toString();
}

// View review
async function viewReview(id) {
    try {
        const { data } = await axios.get('/api/admin/reviews/' + id);
        if (data.success) {
            const r = data.data;
            document.getElementById('modalBody').innerHTML = `
                <div class="detail-grid">
                    <div class="detail-item">
                        <label>Product</label>
                        <span>${r.product?.productName || 'N/A'}</span>
                    </div>
                    <div class="detail-item">
                        <label>Customer</label>
                        <span>${r.user?.name || 'N/A'}</span>
                    </div>
                    <div class="detail-item">
                        <label>Email</label>
                        <span>${r.user?.email || 'N/A'}</span>
                    </div>
                    <div class="detail-item">
                        <label>Rating</label>
                        <span>${'★'.repeat(r.rating)}${'☆'.repeat(5 - r.rating)} (${r.rating}/5)</span>
                    </div>
                    <div class="detail-item full">
                        <label>Comment</label>
                        <span>${r.comment || 'No comment provided'}</span>
                    </div>
                    <div class="detail-item">
                        <label>Status</label>
                        <span class="status-badge status-${r.status}">${r.status}</span>
                    </div>
                    <div class="detail-item">
                        <label>Date</label>
                        <span>${new Date(r.createdAt).toLocaleString('en-IN')}</span>
                    </div>
                </div>
            `;
            document.getElementById('reviewModal').classList.add('active');
        }
    } catch (err) {
        Swal.fire({ icon: 'error', title: 'Error', text: 'Failed to load review details', confirmButtonColor: '#002366' });
    }
}

function closeModal() {
    document.getElementById('reviewModal').classList.remove('active');
}

// Approve
async function approveReview(id) {
    const result = await Swal.fire({
        title: 'Approve Review?',
        text: 'This review will be visible to customers.',
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#16a34a',
        cancelButtonColor: '#6b7280',
        confirmButtonText: 'Approve'
    });
    if (!result.isConfirmed) return;
    try {
        const { data } = await axios.patch('/api/admin/reviews/' + id + '/approve');
        if (data.success) {
            Swal.fire({ icon: 'success', title: 'Approved!', text: 'Review has been approved.', confirmButtonColor: '#002366', timer: 1500 })
                .then(() => location.reload());
        }
    } catch (err) {
        Swal.fire({ icon: 'error', title: 'Error', text: err.response?.data?.message || 'Failed to approve', confirmButtonColor: '#002366' });
    }
}

// Reject
async function rejectReview(id) {
    const result = await Swal.fire({
        title: 'Reject Review?',
        text: 'This review will not be visible to customers.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#dc2626',
        cancelButtonColor: '#6b7280',
        confirmButtonText: 'Reject'
    });
    if (!result.isConfirmed) return;
    try {
        const { data } = await axios.patch('/api/admin/reviews/' + id + '/reject');
        if (data.success) {
            Swal.fire({ icon: 'success', title: 'Rejected!', text: 'Review has been rejected.', confirmButtonColor: '#002366', timer: 1500 })
                .then(() => location.reload());
        }
    } catch (err) {
        Swal.fire({ icon: 'error', title: 'Error', text: err.response?.data?.message || 'Failed to reject', confirmButtonColor: '#002366' });
    }
}

// Delete
async function deleteReview(id) {
    const result = await Swal.fire({
        title: 'Delete Review?',
        text: 'This action cannot be undone.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#dc2626',
        cancelButtonColor: '#6b7280',
        confirmButtonText: 'Delete'
    });
    if (!result.isConfirmed) return;
    try {
        const { data } = await axios.delete('/api/admin/reviews/' + id);
        if (data.success) {
            Swal.fire({ icon: 'success', title: 'Deleted!', text: 'Review has been deleted.', confirmButtonColor: '#002366', timer: 1500 })
                .then(() => location.reload());
        }
    } catch (err) {
        Swal.fire({ icon: 'error', title: 'Error', text: err.response?.data?.message || 'Failed to delete', confirmButtonColor: '#002366' });
    }
}

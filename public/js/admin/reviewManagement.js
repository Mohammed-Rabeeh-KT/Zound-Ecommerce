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

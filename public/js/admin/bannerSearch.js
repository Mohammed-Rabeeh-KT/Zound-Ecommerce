// Banner-specific search functionality
document.addEventListener('DOMContentLoaded', function() {
    const bannerSearchInput = document.getElementById('bannerSearchInput');
    const bannerClearIcon = document.getElementById('bannerClearSearchIcon');
    const bannerFilterForm = document.getElementById('filterForm');

    // Handle search input
    if (bannerSearchInput) {
        // Show/hide clear icon based on input value
        bannerSearchInput.addEventListener('input', function() {
            if (this.value.trim()) {
                bannerClearIcon.style.display = 'block';
            } else {
                bannerClearIcon.style.display = 'none';
            }
        });

        // Handle clear icon click
        if (bannerClearIcon) {
            bannerClearIcon.addEventListener('click', function() {
                bannerSearchInput.value = '';
                this.style.display = 'none';
                bannerSearchInput.focus();
            });
        }

        // Handle Enter key press
        bannerSearchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                bannerFilterForm.submit();
            }
        });
    }

    // Initialize clear icon visibility
    if (bannerSearchInput && bannerClearIcon) {
        if (bannerSearchInput.value.trim()) {
            bannerClearIcon.style.display = 'block';
        }
    }
});

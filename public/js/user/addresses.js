// State
let editingAddressId = null;

// Toggle Add Address Form
function toggleAddressForm(isEdit = false) {
    const dropdown = document.getElementById('addressFormDropdown');
    const addBtn = document.getElementById('addAddressBtn');
    const formTitle = document.querySelector('.form-title');
    const saveBtn = document.getElementById('saveAddressBtn');

    if (dropdown.classList.contains('show')) {
        dropdown.classList.remove('show');
        addBtn.innerHTML = `
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            Add Address
        `;
        resetAddressForm();
        editingAddressId = null;
        // Reset title and button
        if (formTitle) formTitle.innerHTML = `
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                <circle cx="12" cy="10" r="3"></circle>
            </svg>
            Add New Address
        `;
        if (saveBtn) saveBtn.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
            Save Address
        `;
    } else {
        dropdown.classList.add('show');
        addBtn.innerHTML = `
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
            Cancel
        `;

        if (isEdit && formTitle) {
            formTitle.innerHTML = `
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                </svg>
                Edit Address
            `;
            if (saveBtn) saveBtn.innerHTML = `
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
                Update Address
            `;
        }

        // Scroll to form
        dropdown.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

// Reset Form
function resetAddressForm() {
    const form = document.getElementById('addAddressForm');
    if (form) {
        form.reset();
        // Clear all error messages
        document.querySelectorAll('.field-error').forEach(el => el.textContent = '');
        document.querySelectorAll('.form-input').forEach(el => el.classList.remove('error'));
    }
    editingAddressId = null;
}

// Handle Add/Update Address Form Submit
async function handleAddAddress(event) {
    event.preventDefault();

    // Clear previous errors
    clearErrors();

    // Get form data
    const formData = {
        label: document.getElementById('addressLabel').value.trim(),
        fullName: document.getElementById('fullName').value.trim(),
        addressLine1: document.getElementById('addressLine1').value.trim(),
        addressLine2: document.getElementById('addressLine2').value.trim(),
        phone: document.getElementById('phone').value.trim(),
        altPhone: document.getElementById('altPhone').value.trim(),
        city: document.getElementById('city').value.trim(),
        state: document.getElementById('state').value.trim(),
        pincode: document.getElementById('pincode').value.trim()
    };

    // Validate
    if (!validateAddressForm(formData)) {
        return;
    }

    const saveBtn = document.getElementById('saveAddressBtn');
    const originalText = saveBtn.innerHTML;
    const isEditing = editingAddressId !== null;

    try {
        saveBtn.innerHTML = '<svg class="spinner" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle></svg> Saving...';
        saveBtn.disabled = true;

        let url = '/api/user/addresses';
        let method = 'POST';

        if (isEditing) {
            url = `/api/user/addresses/${editingAddressId}`;
            method = 'PUT';
        }

        let response;
        if (method === 'POST') {
            response = await axios.post(url, formData);
        } else {
            response = await axios.put(url, formData);
        }

        const data = response.data;

        if (data.success) {
            Swal.fire({
                icon: 'success',
                title: isEditing ? 'Address Updated!' : 'Address Added!',
                text: isEditing ? 'Your address has been updated successfully.' : 'Your new address has been saved successfully.',
                showConfirmButton: false,
                timer: 1500
            }).then(() => {
                window.location.reload();
            });
        } else {
            throw new Error(data.message || 'Failed to save address');
        }
    } catch (error) {
        console.error('Save address error:', error);
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: error.message || 'Failed to save address. Please try again.',
            confirmButtonColor: '#002366'
        });
    } finally {
        saveBtn.innerHTML = originalText;
        saveBtn.disabled = false;
    }
}

// Validation Regex Patterns
const VALIDATION_PATTERNS = {
    // Full name: Only letters, spaces, and dots (for initials). Min 2, Max 50 chars
    fullName: /^[A-Za-z][A-Za-z\s.]{1,49}$/,

    // Address: Letters, numbers, spaces, and common punctuation. Min 5 chars
    address: /^[A-Za-z0-9\s,.\-\/#()':&]{5,150}$/,

    // Phone: Indian mobile number starting with 6-9, exactly 10 digits
    phone: /^[6-9]\d{9}$/,

    // City: Letters, spaces, dots, hyphens. Min 2 chars
    city: /^[A-Za-z][A-Za-z\s.-]{1,49}$/,

    // State: Letters, spaces, dots, hyphens. Min 2 chars
    state: /^[A-Za-z][A-Za-z\s.-]{1,49}$/,

    // Pincode: Exactly 6 digits, Indian pincode (starts with 1-9)
    pincode: /^[1-9]\d{5}$/
};

// Validate Address Form
function validateAddressForm(data) {
    let isValid = true;

    // Label validation
    if (!data.label || data.label.trim() === '') {
        showFieldError('labelError', 'Please select an address label');
        isValid = false;
    }

    // Full Name validation
    if (!data.fullName) {
        showFieldError('fullNameError', 'Full name is required');
        isValid = false;
    } else if (data.fullName.length < 2) {
        showFieldError('fullNameError', 'Name must be at least 2 characters');
        isValid = false;
    } else if (data.fullName.length > 50) {
        showFieldError('fullNameError', 'Name cannot exceed 50 characters');
        isValid = false;
    } else if (!VALIDATION_PATTERNS.fullName.test(data.fullName)) {
        showFieldError('fullNameError', 'Name should only contain letters, spaces, and dots');
        isValid = false;
    }

    // Address Line 1 validation
    if (!data.addressLine1) {
        showFieldError('addressLine1Error', 'Address is required');
        isValid = false;
    } else if (data.addressLine1.length < 5) {
        showFieldError('addressLine1Error', 'Address must be at least 5 characters');
        isValid = false;
    } else if (data.addressLine1.length > 150) {
        showFieldError('addressLine1Error', 'Address cannot exceed 150 characters');
        isValid = false;
    } else if (!VALIDATION_PATTERNS.address.test(data.addressLine1)) {
        showFieldError('addressLine1Error', 'Address contains invalid characters');
        isValid = false;
    }

    // Address Line 2 validation (optional, but if provided must be valid)
    if (data.addressLine2 && data.addressLine2.length > 0) {
        if (data.addressLine2.length > 150) {
            showFieldError('addressLine2Error', 'Address cannot exceed 150 characters');
            isValid = false;
        } else if (!VALIDATION_PATTERNS.address.test(data.addressLine2)) {
            showFieldError('addressLine2Error', 'Address contains invalid characters');
            isValid = false;
        }
    }

    // Phone Number validation
    const cleanPhone = data.phone.replace(/\D/g, '');
    if (!data.phone) {
        showFieldError('phoneError', 'Phone number is required');
        isValid = false;
    } else if (!VALIDATION_PATTERNS.phone.test(cleanPhone)) {
        showFieldError('phoneError', 'Enter a valid 10-digit mobile number starting with 6-9');
        isValid = false;
    }

    // Alternative Phone validation (optional, but if provided must be valid)
    if (data.altPhone && data.altPhone.trim() !== '') {
        const cleanAltPhone = data.altPhone.replace(/\D/g, '');
        if (!VALIDATION_PATTERNS.phone.test(cleanAltPhone)) {
            showFieldError('altPhoneError', 'Enter a valid 10-digit mobile number starting with 6-9');
            isValid = false;
        }
        // Check if alt phone is same as primary phone
        if (cleanAltPhone === cleanPhone) {
            showFieldError('altPhoneError', 'Alternative phone must be different from primary phone');
            isValid = false;
        }
    }

    // City validation
    if (!data.city) {
        showFieldError('cityError', 'City is required');
        isValid = false;
    } else if (data.city.length < 2) {
        showFieldError('cityError', 'City name must be at least 2 characters');
        isValid = false;
    } else if (data.city.length > 50) {
        showFieldError('cityError', 'City name cannot exceed 50 characters');
        isValid = false;
    } else if (!VALIDATION_PATTERNS.city.test(data.city)) {
        showFieldError('cityError', 'City should only contain letters and spaces');
        isValid = false;
    }

    // State validation
    if (!data.state) {
        showFieldError('stateError', 'State is required');
        isValid = false;
    } else if (data.state.length < 2) {
        showFieldError('stateError', 'State name must be at least 2 characters');
        isValid = false;
    } else if (data.state.length > 50) {
        showFieldError('stateError', 'State name cannot exceed 50 characters');
        isValid = false;
    } else if (!VALIDATION_PATTERNS.state.test(data.state)) {
        showFieldError('stateError', 'State should only contain letters and spaces');
        isValid = false;
    }

    // Pincode validation
    if (!data.pincode) {
        showFieldError('pincodeError', 'Pincode is required');
        isValid = false;
    } else if (!VALIDATION_PATTERNS.pincode.test(data.pincode)) {
        showFieldError('pincodeError', 'Enter a valid 6-digit pincode');
        isValid = false;
    }

    return isValid;
}

// Show Field Error
function showFieldError(fieldId, message) {
    const errorEl = document.getElementById(fieldId);
    if (errorEl) {
        errorEl.textContent = message;
        // Also add error class to the input
        const inputId = fieldId.replace('Error', '');
        const input = document.getElementById(inputId);
        if (input) input.classList.add('error');
    }
}

// Clear Errors
function clearErrors() {
    document.querySelectorAll('.field-error').forEach(el => el.textContent = '');
    document.querySelectorAll('.form-input').forEach(el => el.classList.remove('error'));
}

// Set Default Address
async function setDefaultAddress(addressId) {
    try {
        const result = await Swal.fire({
            title: 'Set as Default?',
            text: 'This address will be used as your default delivery address.',
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#002366',
            cancelButtonColor: '#64748b',
            confirmButtonText: 'Yes, set default'
        });

        if (result.isConfirmed) {
            const response = await axios.patch(`/api/user/addresses/${addressId}/default`);

            const data = response.data;

            if (data.success) {
                Swal.fire({
                    icon: 'success',
                    title: 'Updated!',
                    text: 'Default address has been updated.',
                    showConfirmButton: false,
                    timer: 1500
                }).then(() => {
                    window.location.reload();
                });
            } else {
                throw new Error(data.message);
            }
        }
    } catch (error) {
        console.error('Set default error:', error);
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: error.message || 'Failed to update default address.',
            confirmButtonColor: '#002366'
        });
    }
}

// Edit Address - Opens form with existing data
async function editAddress(addressId) {
    try {
        // Fetch address data from API for reliable data
        const response = await axios.get(`/api/user/addresses/${addressId}`);

        const data = response.data;

        if (!data.success || !data.data) {
            throw new Error(data.message || 'Failed to load address');
        }

        const address = data.data;

        // Set editingAddressId
        editingAddressId = addressId;

        // Close form if open, then open in edit mode
        const dropdown = document.getElementById('addressFormDropdown');
        if (dropdown && dropdown.classList.contains('show')) {
            dropdown.classList.remove('show');
        }

        // Populate form fields
        setTimeout(() => {
            document.getElementById('addressLabel').value = address.label || '';
            document.getElementById('fullName').value = address.fullName || '';
            document.getElementById('addressLine1').value = address.addressLine1 || '';
            document.getElementById('addressLine2').value = address.addressLine2 || '';
            document.getElementById('phone').value = address.phone || '';
            document.getElementById('altPhone').value = address.altPhone || '';
            document.getElementById('city').value = address.city || '';
            document.getElementById('state').value = address.state || '';
            document.getElementById('pincode').value = address.pincode || '';

            // Open form in edit mode
            toggleAddressForm(true);
        }, 100);

    } catch (error) {
        console.error('Edit address error:', error);
        if (typeof Swal !== 'undefined') {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: error.message || 'Failed to load address. Please try again.',
                confirmButtonColor: '#002366'
            });
        } else {
            alert(error.message || 'Failed to load address');
        }
    }
}

// Delete Address
async function deleteAddress(addressId) {
    try {
        const result = await Swal.fire({
            title: 'Delete Address?',
            text: 'This action cannot be undone.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            cancelButtonColor: '#64748b',
            confirmButtonText: 'Yes, delete it'
        });

        if (result.isConfirmed) {
            const response = await axios.delete(`/api/user/addresses/${addressId}`);

            const data = response.data;

            if (data.success) {
                Swal.fire({
                    icon: 'success',
                    title: 'Deleted!',
                    text: 'Address has been removed.',
                    showConfirmButton: false,
                    timer: 1500
                }).then(() => {
                    window.location.reload();
                });
            } else {
                throw new Error(data.message);
            }
        }
    } catch (error) {
        console.error('Delete error:', error);
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: error.message || 'Failed to delete address.',
            confirmButtonColor: '#002366'
        });
    }
}

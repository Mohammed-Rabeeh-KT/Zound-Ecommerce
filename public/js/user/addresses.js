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

        let url = '/user/addresses';
        let method = 'POST';

        if (isEditing) {
            url = `/user/addresses/${editingAddressId}`;
            method = 'PUT';
        }

        const response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });

        const data = await response.json();

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

// Validate Address Form
function validateAddressForm(data) {
    let isValid = true;

    if (!data.label) {
        showFieldError('labelError', 'Please select an address label');
        isValid = false;
    }

    if (!data.fullName || data.fullName.length < 2) {
        showFieldError('fullNameError', 'Please enter a valid name');
        isValid = false;
    }

    if (!data.addressLine1 || data.addressLine1.length < 5) {
        showFieldError('addressLine1Error', 'Please enter a valid address');
        isValid = false;
    }

    if (!data.phone || !/^[6-9]\d{9}$/.test(data.phone.replace(/\D/g, ''))) {
        showFieldError('phoneError', 'Please enter a valid 10-digit phone number');
        isValid = false;
    }

    if (!data.city || data.city.length < 2) {
        showFieldError('cityError', 'Please enter a valid city');
        isValid = false;
    }

    if (!data.state || data.state.length < 2) {
        showFieldError('stateError', 'Please enter a valid state');
        isValid = false;
    }

    if (!data.pincode || !/^\d{6}$/.test(data.pincode)) {
        showFieldError('pincodeError', 'Please enter a valid 6-digit pincode');
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
            const response = await fetch(`/user/addresses/${addressId}/default`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            const data = await response.json();

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
function editAddress(addressId) {
    // Get the address card data
    const addressCard = document.querySelector(`.address-card[data-id="${addressId}"]`);
    if (!addressCard) {
        console.error('Address card not found');
        return;
    }

    // Extract data from the card
    const label = addressCard.querySelector('.address-label')?.textContent?.trim();
    const fullName = addressCard.querySelector('.address-name')?.textContent?.trim();
    const addressTexts = addressCard.querySelectorAll('.address-text');
    const phoneEl = addressCard.querySelector('.address-phone:not(.alt-phone)');
    const altPhoneEl = addressCard.querySelector('.address-phone.alt-phone');

    // Parse address lines and location
    let addressLine1 = '';
    let addressLine2 = '';
    let cityStatePin = '';

    if (addressTexts.length >= 1) addressLine1 = addressTexts[0]?.textContent?.trim() || '';
    if (addressTexts.length >= 3) {
        addressLine2 = addressTexts[1]?.textContent?.trim() || '';
        cityStatePin = addressTexts[2]?.textContent?.trim() || '';
    } else if (addressTexts.length >= 2) {
        cityStatePin = addressTexts[1]?.textContent?.trim() || '';
    }

    // Parse city, state, pincode from "City, State - Pincode"
    let city = '', state = '', pincode = '';
    if (cityStatePin) {
        const match = cityStatePin.match(/^(.+),\s*(.+)\s*-\s*(\d{6})$/);
        if (match) {
            city = match[1].trim();
            state = match[2].trim();
            pincode = match[3].trim();
        }
    }

    // Get phone numbers
    let phone = phoneEl?.textContent?.trim() || '';
    let altPhone = altPhoneEl?.textContent?.replace('(Alt)', '')?.trim() || '';

    // Set editingAddressId
    editingAddressId = addressId;

    // Close form if open, then open in edit mode
    const dropdown = document.getElementById('addressFormDropdown');
    if (dropdown.classList.contains('show')) {
        dropdown.classList.remove('show');
    }

    // Populate form fields
    setTimeout(() => {
        document.getElementById('addressLabel').value = label || '';
        document.getElementById('fullName').value = fullName || '';
        document.getElementById('addressLine1').value = addressLine1 || '';
        document.getElementById('addressLine2').value = addressLine2 || '';
        document.getElementById('phone').value = phone || '';
        document.getElementById('altPhone').value = altPhone || '';
        document.getElementById('city').value = city || '';
        document.getElementById('state').value = state || '';
        document.getElementById('pincode').value = pincode || '';

        // Open form in edit mode
        toggleAddressForm(true);
    }, 100);
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
            const response = await fetch(`/user/addresses/${addressId}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            const data = await response.json();

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

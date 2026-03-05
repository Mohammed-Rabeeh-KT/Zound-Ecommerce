// Global State
let isEmailVerified = true;
let emailChanged = false;
let isOtpRequestInProgress = false;
let otpTimer = null;
let hasFormChanges = false;
let profilePictureChanged = false;

// Profile Picture Upload State
let cropper = null;
let selectedImageFile = null;

// Original values for change tracking
let originalValues = {
    name: '',
    phone: '',
    email: ''
};

// Check if Google User
const isGoogleUser = document.getElementById('isGoogleUser')?.value === 'true';

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    initializeImageUpload();
    initializeChangeTracking();
});

// DOM Elements
const emailInput = document.getElementById('email');
const originalEmail = document.getElementById('originalEmail')?.value || '';
const verifyBtn = document.getElementById('btn-trigger-verify');
const verifiedBadge = document.getElementById('verified-badge');
const feedbackText = document.getElementById('email-feedback');
const otpSection = document.getElementById('inline-otp-section');
const saveBtn = document.getElementById('saveBtn');
const form = document.getElementById('editProfileForm');
const nameInput = document.getElementById('name');
const phoneInput = document.getElementById('phone');

// Initialize Change Tracking
function initializeChangeTracking() {
    // Store original values
    originalValues.name = document.getElementById('originalName')?.value || nameInput?.value || '';
    originalValues.phone = document.getElementById('originalPhone')?.value || phoneInput?.value || '';
    originalValues.email = originalEmail;

    // Add input listeners for change detection and validation
    if (nameInput) {
        nameInput.addEventListener('input', () => {
            validateName();
            checkForChanges();
        });
        nameInput.addEventListener('blur', validateName);
    }
    if (phoneInput) {
        phoneInput.addEventListener('input', () => {
            validatePhone();
            checkForChanges();
        });
        phoneInput.addEventListener('blur', validatePhone);
    }
    if (emailInput && !isGoogleUser) {
        emailInput.addEventListener('blur', validateEmail);
    }
}

// ========================================
// REGEX VALIDATION PATTERNS
// ========================================

const validationPatterns = {
    // Name: Letters (including unicode), spaces, min 2 chars, max 50
    name: /^[A-Za-z\s]{2,50}$/,
    // Phone: Indian format - 10 digits, optionally with +91 or 0 prefix
    phone: /^(\+91[\-\s]?)?[0]?(91)?[6789]\d{9}$/,
    // Email: Standard email format
    email: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
};

// Validation error messages
const validationMessages = {
    name: {
        empty: 'Name is required',
        invalid: 'Name should only contain letters and spaces (2-50 characters)',
        tooShort: 'Name must be at least 2 characters',
        tooLong: 'Name cannot exceed 50 characters'
    },
    phone: {
        invalid: 'Please enter a valid 10-digit Indian phone number',
        format: 'Phone number should start with 6, 7, 8, or 9'
    },
    email: {
        empty: 'Email is required',
        invalid: 'Please enter a valid email address'
    }
};

// ========================================
// VALIDATION FUNCTIONS
// ========================================

function validateName() {
    const name = nameInput?.value?.trim() || '';
    const errorDiv = getOrCreateErrorDiv('name');

    // Clear previous error
    clearFieldError(nameInput, errorDiv);

    if (!name) {
        showFieldError(nameInput, errorDiv, validationMessages.name.empty);
        return false;
    }

    if (name.length < 2) {
        showFieldError(nameInput, errorDiv, validationMessages.name.tooShort);
        return false;
    }

    if (name.length > 50) {
        showFieldError(nameInput, errorDiv, validationMessages.name.tooLong);
        return false;
    }

    if (!validationPatterns.name.test(name)) {
        showFieldError(nameInput, errorDiv, validationMessages.name.invalid);
        return false;
    }

    showFieldSuccess(nameInput);
    return true;
}

function validatePhone() {
    const phone = phoneInput?.value?.trim() || '';
    const errorDiv = getOrCreateErrorDiv('phone');

    // Clear previous error
    clearFieldError(phoneInput, errorDiv);

    // Phone is optional, but if provided, must be valid
    if (!phone) {
        return true;
    }

    // Remove spaces, dashes for validation
    const cleanPhone = phone.replace(/[\s\-]/g, '');

    // Check if it's a valid Indian phone number
    if (!validationPatterns.phone.test(cleanPhone)) {
        showFieldError(phoneInput, errorDiv, validationMessages.phone.invalid);
        return false;
    }

    showFieldSuccess(phoneInput);
    return true;
}

function validateEmail() {
    if (isGoogleUser) return true;

    const email = emailInput?.value?.trim() || '';
    const errorDiv = getOrCreateErrorDiv('email');

    // Clear previous error (but not feedback text used for OTP)
    clearFieldError(emailInput, errorDiv);

    if (!email) {
        showFieldError(emailInput, errorDiv, validationMessages.email.empty);
        return false;
    }

    if (!validationPatterns.email.test(email)) {
        showFieldError(emailInput, errorDiv, validationMessages.email.invalid);
        return false;
    }

    showFieldSuccess(emailInput);
    return true;
}

// Validate all fields
function validateAllFields() {
    const isNameValid = validateName();
    const isPhoneValid = validatePhone();
    const isEmailValid = validateEmail();

    return isNameValid && isPhoneValid && isEmailValid;
}

// ========================================
// ERROR DISPLAY HELPERS
// ========================================

function getOrCreateErrorDiv(fieldId) {
    let errorDiv = document.getElementById(`${fieldId}-validation-error`);

    if (!errorDiv) {
        const input = document.getElementById(fieldId);
        if (input) {
            errorDiv = document.createElement('div');
            errorDiv.id = `${fieldId}-validation-error`;
            errorDiv.className = 'field-validation-error';
            errorDiv.style.cssText = 'color: #dc2626; font-size: 0.75rem; margin-top: 0.25rem; display: none;';

            // Determine insert position
            const inputWrapper = input.closest('.input-wrapper');

            if (inputWrapper) {
                // Insert AFTER the input-wrapper to prevent layout overlap
                if (inputWrapper.nextSibling) {
                    inputWrapper.parentNode.insertBefore(errorDiv, inputWrapper.nextSibling);
                } else {
                    inputWrapper.parentNode.appendChild(errorDiv);
                }
            } else {
                // Standard positioning for simple inputs
                if (input.nextSibling) {
                    input.parentNode.insertBefore(errorDiv, input.nextSibling);
                } else {
                    input.parentNode.appendChild(errorDiv);
                }
            }
        }
    }

    return errorDiv;
}

function showFieldError(input, errorDiv, message) {
    if (input) {
        input.classList.add('validation-error');
        input.classList.remove('validation-success');
        input.style.borderColor = '#dc2626';
    }
    if (errorDiv) {
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';
    }
}

function showFieldSuccess(input) {
    if (input) {
        input.classList.remove('validation-error');
        input.classList.add('validation-success');
        input.style.borderColor = '#16a34a';
    }
}

function clearFieldError(input, errorDiv) {
    if (input) {
        input.classList.remove('validation-error', 'validation-success');
        input.style.borderColor = '';
    }
    if (errorDiv) {
        errorDiv.textContent = '';
        errorDiv.style.display = 'none';
    }
}

// Check if form has changes
function checkForChanges() {
    const currentName = nameInput?.value || '';
    const currentPhone = phoneInput?.value || '';
    const currentEmail = emailInput?.value || '';

    const nameChanged = currentName !== originalValues.name;
    const phoneChanged = currentPhone !== originalValues.phone;
    const emailChangedLocal = !isGoogleUser && currentEmail !== originalValues.email;

    hasFormChanges = nameChanged || phoneChanged || emailChangedLocal || profilePictureChanged;

    updateSaveButtonState();
}

// Mark profile picture as changed (called after successful upload)
function markProfilePictureChanged() {
    profilePictureChanged = true;
    checkForChanges();
}

// Email Input Handler
if (emailInput && !isGoogleUser) {
    emailInput.addEventListener('input', handleEmailInput);
}

// Form Submission Handler
if (form) {
    form.addEventListener('submit', handleProfileUpdate);
}

// Verify Button Click Handler
if (verifyBtn) {
    verifyBtn.addEventListener('click', initiateEmailVerification);
}

// OTP Verification Handler
const otpInput = document.getElementById('inlineOtpInput');
const verifyOtpBtn = document.querySelector('.btn-verify-small');
if (verifyOtpBtn) {
    verifyOtpBtn.addEventListener('click', verifyInlineOtp);
}

async function handleEmailInput(e) {
    const currentEmail = e.target.value.trim();

    // Reset UI states
    if (feedbackText) {
        feedbackText.textContent = '';
        feedbackText.className = 'feedback-text';
    }

    const errorDiv = document.getElementById('inline-otp-error');
    if (errorDiv) errorDiv.textContent = '';

    if (otpSection) otpSection.classList.remove('show');

    if (currentEmail !== originalEmail) {
        emailChanged = true;
        isEmailVerified = false;
        toggleVerifyUI(true);
    } else {
        emailChanged = false;
        isEmailVerified = true;
        toggleVerifyUI(false);
    }

    // Also check for overall form changes
    checkForChanges();
}

async function initiateEmailVerification() {
    // Clear any previous feedback to ensure a clean state
    showFeedback('', '');

    if (isOtpRequestInProgress) {
        console.log('OTP request already in progress, ignoring duplicate call');
        return;
    }

    // Use strict validation before sending OTP
    if (!validateEmail()) {
        return;
    }

    const newEmail = emailInput.value.trim();

    isOtpRequestInProgress = true;

    try {
        const response = await axios.post('/api/user/send-email-otp', { email: newEmail });

        const data = response.data;

        if (data.success) {
            showFeedback('Verification code sent to your email', 'success');
            if (otpSection) otpSection.classList.add('show');
            startTimer(120); // 2 minutes timer
        } else {
            showFeedback(data.message || 'Failed to send verification code', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showFeedback('Failed to send verification code. Please try again.', 'error');
    } finally {
        setTimeout(() => {
            isOtpRequestInProgress = false;
        }, 3000)
    }
}

async function verifyInlineOtp() {
    const otp = document.getElementById('inlineOtpInput')?.value.trim();
    const email = emailInput.value.trim();

    if (!otp || otp.length !== 6) {
        showOtpError('Please enter a valid 6-digit code');
        return;
    }

    try {
        const response = await axios.post('/api/user/verify-email-otp', { email, otp: parseInt(otp, 10) });

        const data = response.data;

        if (data.success) {
            isEmailVerified = true;
            toggleVerifyUI(false, true);
            showFeedback('Email verified successfully!', 'success');
            if (otpSection) otpSection.classList.remove('show');
            updateSaveButtonState();
        } else {
            showOtpError(data.message || 'Invalid verification code');
        }
    } catch (error) {
        console.error('Error:', error);
        showOtpError(error.response?.data?.message || 'Incorrect OTP');
    }
}

async function handleProfileUpdate(e) {
    e.preventDefault();

    // Validate all fields first
    if (!validateAllFields()) {
        Swal.fire({
            icon: 'warning',
            title: 'Validation Error',
            text: 'Please fix the errors in the form before saving.',
            confirmButtonColor: '#002366'
        });
        return;
    }

    if (!isEmailVerified && emailChanged) {
        showFeedback('Please verify your email before saving', 'error');
        return;
    }

    const formData = {
        name: document.getElementById('name').value.trim(),
        phone: document.getElementById('phone').value.trim(),
        email: emailInput.value.trim()
    };

    const originalText = saveBtn?.innerHTML || 'Save';

    try {
        if (saveBtn) {
            saveBtn.innerHTML = 'Saving...';
            saveBtn.disabled = true;
        }

        const { data: data } = await axios.put('/api/user/profile/edit', formData);

        if (data.success) {
            await Swal.fire({
                icon: 'success',
                title: 'Profile Updated',
                showConfirmButton: false,
                timer: 1500
            });
            window.location.href = '/user/profile';
        } else {
            throw new Error(data.message || 'Failed to update profile');
        }
    } catch (err) {
        console.error('Update error:', err);
        Swal.fire('Error', err.message || 'Something went wrong', 'error');
    } finally {
        if (saveBtn) {
            saveBtn.innerHTML = originalText;
            saveBtn.disabled = false;
        }
    }
}

// Helper Functions
function toggleVerifyUI(showVerify, showVerified = false) {
    if (verifyBtn) verifyBtn.style.display = showVerify ? 'flex' : 'none';
    if (verifiedBadge) verifiedBadge.style.display = showVerified ? 'flex' : 'none';
}

function updateSaveButtonState() {
    if (!saveBtn) return;

    // Disable if email changed but not verified
    const emailNeedsVerification = emailChanged && !isEmailVerified && !isGoogleUser;

    // Enable only if there are changes AND email is verified (if changed)
    const shouldEnable = hasFormChanges && !emailNeedsVerification;

    saveBtn.disabled = !shouldEnable;
    saveBtn.style.opacity = shouldEnable ? '1' : '0.5';
    saveBtn.style.cursor = shouldEnable ? 'pointer' : 'not-allowed';
}

function showFeedback(message, type = 'info') {
    if (!feedbackText) return;

    feedbackText.textContent = message;
    feedbackText.className = `feedback-text ${type}`;
}

function showOtpError(message) {
    const errorDiv = document.getElementById('inline-otp-error');
    if (errorDiv) {
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';
    }
}

function startTimer(duration) {
    let timer = duration;
    const display = document.getElementById('inline-timer');

    if (window.otpInterval) clearInterval(window.otpInterval);

    const updateTimer = () => {
        const minutes = Math.floor(timer / 60);
        const seconds = timer % 60;

        if (display) {
            display.textContent = `Resend code in ${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
        }

        if (--timer < 0) {
            clearInterval(window.otpInterval);
            if (display) {
                display.textContent = 'Didn\'t receive code? Resend';
                display.style.cursor = 'pointer';
                display.onclick = () => {
                    if (display.textContent.includes('Resend')) {
                        initiateEmailVerification();
                    }
                };
            }
        }
    };

    updateTimer();
    window.otpInterval = setInterval(updateTimer, 1000);
}

// Initialize
updateSaveButtonState();

// ========================================
// CHANGE PASSWORD SECTION
// ========================================

// Toggle Password Section Dropdown
function togglePasswordSection() {
    const dropdown = document.getElementById('password-dropdown');
    const chevron = document.getElementById('password-chevron');

    if (dropdown && chevron) {
        dropdown.classList.toggle('show');
        chevron.classList.toggle('rotated');
    }
}

// Toggle Password Visibility
function togglePasswordVisibility(inputId, button) {
    const input = document.getElementById(inputId);
    if (!input) return;

    const eyeIcon = button.querySelector('.eye-icon');

    if (input.type === 'password') {
        input.type = 'text';
        // Change to eye-off icon
        eyeIcon.innerHTML = `
            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
            <line x1="1" y1="1" x2="23" y2="23"></line>
        `;
    } else {
        input.type = 'password';
        // Change back to eye icon
        eyeIcon.innerHTML = `
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
            <circle cx="12" cy="12" r="3"></circle>
        `;
    }
}

// Validate New Password (Real-time)
function validateNewPassword() {
    const newPassword = document.getElementById('newPassword')?.value || '';
    const requirements = {
        length: newPassword.length >= 8,
        upper: /[A-Z]/.test(newPassword),
        lower: /[a-z]/.test(newPassword),
        number: /[0-9]/.test(newPassword)
    };

    // Update requirement indicators
    updateRequirement('req-length', requirements.length);
    updateRequirement('req-upper', requirements.upper);
    updateRequirement('req-lower', requirements.lower);
    updateRequirement('req-number', requirements.number);

    // Update input styling
    const input = document.getElementById('newPassword');
    const allValid = Object.values(requirements).every(v => v);

    if (newPassword.length > 0) {
        input.classList.remove('error', 'success');
        input.classList.add(allValid ? 'success' : 'error');
    } else {
        input.classList.remove('error', 'success');
    }

    // Also validate confirm password if it has value
    const confirmPassword = document.getElementById('confirmPassword')?.value;
    if (confirmPassword) {
        validateConfirmPassword();
    }

    return allValid;
}

function updateRequirement(id, isValid) {
    const element = document.getElementById(id);
    if (!element) return;

    if (isValid) {
        element.classList.add('valid');
        element.textContent = element.textContent.replace('✗', '✓');
    } else {
        element.classList.remove('valid');
        element.textContent = element.textContent.replace('✓', '✗');
    }
}

// Validate Confirm Password
function validateConfirmPassword() {
    const newPassword = document.getElementById('newPassword')?.value || '';
    const confirmPassword = document.getElementById('confirmPassword')?.value || '';
    const errorDiv = document.getElementById('confirmPassword-error');
    const input = document.getElementById('confirmPassword');

    if (!confirmPassword) {
        input?.classList.remove('error', 'success');
        if (errorDiv) errorDiv.textContent = '';
        return false;
    }

    if (newPassword !== confirmPassword) {
        input?.classList.remove('success');
        input?.classList.add('error');
        if (errorDiv) errorDiv.textContent = 'Passwords do not match';
        return false;
    } else {
        input?.classList.remove('error');
        input?.classList.add('success');
        if (errorDiv) errorDiv.textContent = '';
        return true;
    }
}

// Clear Password Errors
function clearPasswordErrors() {
    document.getElementById('currentPassword-error').textContent = '';
    document.getElementById('newPassword-error').textContent = '';
    document.getElementById('confirmPassword-error').textContent = '';

    const feedback = document.getElementById('password-feedback');
    if (feedback) {
        feedback.textContent = '';
        feedback.className = 'password-feedback';
    }
}

// Show Password Feedback
function showPasswordFeedback(message, type) {
    const feedback = document.getElementById('password-feedback');
    if (feedback) {
        feedback.textContent = message;
        feedback.className = `password-feedback ${type}`;
    }
}

// Handle Change Password
async function handleChangePassword() {
    clearPasswordErrors();

    const currentPassword = document.getElementById('currentPassword')?.value || '';
    const newPassword = document.getElementById('newPassword')?.value || '';
    const confirmPassword = document.getElementById('confirmPassword')?.value || '';
    const btn = document.getElementById('changePasswordBtn');

    // Validation
    let hasError = false;

    if (!currentPassword) {
        document.getElementById('currentPassword-error').textContent = 'Current password is required';
        document.getElementById('currentPassword')?.classList.add('error');
        hasError = true;
    }

    if (!newPassword) {
        document.getElementById('newPassword-error').textContent = 'New password is required';
        document.getElementById('newPassword')?.classList.add('error');
        hasError = true;
    } else if (!validateNewPassword()) {
        document.getElementById('newPassword-error').textContent = 'Password does not meet requirements';
        hasError = true;
    }

    if (!confirmPassword) {
        document.getElementById('confirmPassword-error').textContent = 'Please confirm your new password';
        document.getElementById('confirmPassword')?.classList.add('error');
        hasError = true;
    } else if (newPassword !== confirmPassword) {
        document.getElementById('confirmPassword-error').textContent = 'Passwords do not match';
        document.getElementById('confirmPassword')?.classList.add('error');
        hasError = true;
    }

    if (currentPassword === newPassword) {
        document.getElementById('newPassword-error').textContent = 'New password must be different from current password';
        document.getElementById('newPassword')?.classList.add('error');
        hasError = true;
    }

    if (hasError) return;

    // Submit
    const originalText = btn?.innerHTML || 'Update Password';

    try {
        if (btn) {
            btn.innerHTML = '<svg class="spinner" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle></svg> Updating...';
            btn.disabled = true;
        }

        const response = await axios.post('/api/user/change-password', { currentPassword, newPassword });

        const data = response.data;

        if (data.success) {
            showPasswordFeedback('Password changed successfully!', 'success');

            // Clear inputs
            document.getElementById('currentPassword').value = '';
            document.getElementById('newPassword').value = '';
            document.getElementById('confirmPassword').value = '';

            // Reset input styles
            document.getElementById('currentPassword')?.classList.remove('error', 'success');
            document.getElementById('newPassword')?.classList.remove('error', 'success');
            document.getElementById('confirmPassword')?.classList.remove('error', 'success');

            // Reset requirements
            ['req-length', 'req-upper', 'req-lower', 'req-number'].forEach(id => {
                const el = document.getElementById(id);
                if (el) {
                    el.classList.remove('valid');
                    el.textContent = el.textContent.replace('✓', '✗');
                }
            });

            // Optional: Close dropdown after success
            setTimeout(() => {
                togglePasswordSection();
            }, 2000);

        } else {
            showPasswordFeedback(data.message || 'Failed to change password', 'error');

            if (data.message?.toLowerCase().includes('current password')) {
                document.getElementById('currentPassword')?.classList.add('error');
                document.getElementById('currentPassword-error').textContent = data.message;
            }
        }
    } catch (error) {
        console.error('Password change error:', error);
        showPasswordFeedback('An error occurred. Please try again.', 'error');
    } finally {
        if (btn) {
            btn.innerHTML = originalText;
            btn.disabled = false;
        }
    }
}

// ========================================
// PROFILE PICTURE UPLOAD SECTION
// ========================================

function initializeImageUpload() {
    const uploadZone = document.getElementById('uploadZone');
    if (!uploadZone) return;

    // Drag and Drop Events
    uploadZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadZone.classList.add('dragover');
    });

    uploadZone.addEventListener('dragleave', (e) => {
        e.preventDefault();
        uploadZone.classList.remove('dragover');
    });

    uploadZone.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadZone.classList.remove('dragover');

        const files = e.dataTransfer.files;
        if (files.length > 0) {
            processImageFile(files[0]);
        }
    });
}

function openImageUploadModal() {
    const modal = document.getElementById('uploadModal');
    if (modal) {
        modal.classList.add('show');
        document.body.style.overflow = 'hidden';
    }
}

function closeImageUploadModal() {
    const modal = document.getElementById('uploadModal');
    if (modal) {
        modal.classList.remove('show');
        document.body.style.overflow = '';
        resetUploadModal();
    }
}

function resetUploadModal() {
    // Destroy cropper if exists
    if (cropper) {
        cropper.destroy();
        cropper = null;
    }

    selectedImageFile = null;

    // Reset UI
    document.getElementById('uploadZone').style.display = 'block';
    document.getElementById('cropperZone').style.display = 'none';
    document.getElementById('cancelCropBtn').style.display = 'none';
    document.getElementById('saveCropBtn').style.display = 'none';
    document.getElementById('profileImageInput').value = '';
}

function handleImageSelect(event) {
    const file = event.target.files[0];
    if (file) {
        processImageFile(file);
    }
}

function processImageFile(file) {
    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!validTypes.includes(file.type)) {
        Swal.fire({
            icon: 'error',
            title: 'Invalid File Type',
            text: 'Please select a valid image file (JPG, PNG, GIF, or WebP)',
            confirmButtonColor: '#002366'
        });
        return;
    }

    // Validate file size (5MB max)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
        Swal.fire({
            icon: 'error',
            title: 'File Too Large',
            text: 'Please select an image smaller than 5MB',
            confirmButtonColor: '#002366'
        });
        return;
    }

    selectedImageFile = file;

    // Create object URL for cropper
    const imageUrl = URL.createObjectURL(file);

    // Show cropper zone, hide upload zone
    document.getElementById('uploadZone').style.display = 'none';
    document.getElementById('cropperZone').style.display = 'block';
    document.getElementById('cancelCropBtn').style.display = 'inline-flex';
    document.getElementById('saveCropBtn').style.display = 'inline-flex';

    // Initialize cropper
    const cropperImage = document.getElementById('cropperImage');
    cropperImage.src = imageUrl;

    // Destroy previous cropper if exists
    if (cropper) {
        cropper.destroy();
    }

    // Initialize Cropper.js with circular aspect ratio (1:1)
    cropper = new Cropper(cropperImage, {
        aspectRatio: 1,
        viewMode: 1,
        dragMode: 'move',
        autoCropArea: 1,
        restore: false,
        guides: true,
        center: true,
        highlight: false,
        cropBoxMovable: true,
        cropBoxResizable: true,
        toggleDragModeOnDblclick: false,
        responsive: true,
        minCropBoxWidth: 100,
        minCropBoxHeight: 100
    });
}

function cancelCrop() {
    resetUploadModal();
}

async function saveCroppedImage() {
    if (!cropper) return;

    const saveBtn = document.getElementById('saveCropBtn');
    const originalText = saveBtn.innerHTML;

    try {
        saveBtn.innerHTML = '<svg class="spinner" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle></svg> Saving...';
        saveBtn.disabled = true;

        // Get cropped canvas
        const canvas = cropper.getCroppedCanvas({
            width: 300,
            height: 300,
            imageSmoothingEnabled: true,
            imageSmoothingQuality: 'high'
        });

        // Convert to blob
        const blob = await new Promise(resolve => {
            canvas.toBlob(resolve, 'image/jpeg', 0.9);
        });

        // Create form data
        const formData = new FormData();
        formData.append('profileImage', blob, 'profile.jpg');

        // Upload to server
        const { data: data } = await axios.post('/api/user/upload-profile-picture', formData);

        if (data.success) {
            // Update avatar in UI
            updateAvatarUI(data.imageUrl);

            closeImageUploadModal();

            Swal.fire({
                icon: 'success',
                title: 'Photo Updated!',
                text: 'Your profile picture has been updated successfully.',
                showConfirmButton: false,
                timer: 1500
            });
        } else {
            throw new Error(data.message || 'Failed to upload image');
        }
    } catch (error) {
        console.error('Upload error:', error);
        Swal.fire({
            icon: 'error',
            title: 'Upload Failed',
            text: error.message || 'Failed to upload profile picture. Please try again.',
            confirmButtonColor: '#002366'
        });
    } finally {
        saveBtn.innerHTML = originalText;
        saveBtn.disabled = false;
    }
}

function updateAvatarUI(imageUrl) {
    const avatarRing = document.getElementById('avatarRing');
    if (!avatarRing) return;

    // Check if there's already an image or placeholder
    let avatarImage = document.getElementById('avatarImage');
    const avatarPlaceholder = document.getElementById('avatarPlaceholder');

    if (avatarImage) {
        // Update existing image
        avatarImage.src = imageUrl;
    } else {
        // Create new image element and replace placeholder
        avatarImage = document.createElement('img');
        avatarImage.src = imageUrl;
        avatarImage.alt = 'Profile';
        avatarImage.className = 'avatar-image';
        avatarImage.id = 'avatarImage';

        // Remove placeholder if exists
        if (avatarPlaceholder) {
            avatarPlaceholder.remove();
        }

        avatarRing.appendChild(avatarImage);
    }
}
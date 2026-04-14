
document.addEventListener('DOMContentLoaded', () => {
    const signupForm = document.getElementById('signform');
    const nameInput = document.getElementById('name');
    const emailInput = document.getElementById('emailInput');
    const passwordInput = document.getElementById('password');
    const confirmInput = document.getElementById('confirmPassword');
    const referralInput = document.getElementById('referralCode');

    // Helper to get error element or create if missing
    const getErrorElement = (id) => document.getElementById(id);

    const error1 = getErrorElement('error1');
    const error2 = getErrorElement('error2');
    const error3 = getErrorElement('error3');
    const error4 = getErrorElement('error4');

    // Toggle Password Support
    const setupToggle = (btnId, inputId) => {
        const btn = document.getElementById(btnId);
        const input = document.getElementById(inputId);
        if (btn && input) {
            btn.addEventListener("click", () => {
                const isHidden = input.type === "password";
                input.type = isHidden ? "text" : "password";
                btn.textContent = isHidden ? "visibility_off" : "visibility";
            });
        }
    };
    setupToggle("togglePass", "password");
    setupToggle("togglePass2", "confirmPassword");

    // Validation Logic
    const validateName = () => {
        const value = nameInput.value.trim();
        const pattern = /^[a-zA-Z\s.'-]+$/;
        if (!value) {
            showError(error1, "Name is required");
            return false;
        } else if (value.length < 3) {
            showError(error1, "Name must be at least 3 characters");
            return false;
        } else if (value.length > 40) {
            showError(error1, "Name cannot exceed 40 characters");
            return false;
        } else if (!pattern.test(value)) {
            showError(error1, "Name can only contain letters, spaces, dots, hyphens, and apostrophes");
            return false;
        }
        hideError(error1);
        return true;
    };

    const validateEmail = () => {
        const value = emailInput.value.trim();
        const pattern = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
        if (!value) {
            showError(error2, "Email is required");
            return false;
        } else if (!pattern.test(value)) {
            showError(error2, "Please enter a valid email address");
            return false;
        } else if (value.length > 254) {
            showError(error2, "Email is too long");
            return false;
        }
        hideError(error2);
        return true;
    };

    const validatePasswords = () => {
        const pass = passwordInput.value;
        const confirm = confirmInput.value;
        const passPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*])/;
        let isValid = true;

        if (!pass) {
            showError(error3, "Password is required");
            isValid = false;
        } else if (pass.length < 8) {
            showError(error3, "Password must be at least 8 characters long");
            isValid = false;
        } else if (pass.length > 30) {
            showError(error3, "Password cannot exceed 30 characters");
            isValid = false;
        } else if (!passPattern.test(pass)) {
            showError(error3, "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character");
            isValid = false;
        } else {
            hideError(error3);
        }

        if (!confirm) {
            showError(error4, "Please confirm password");
            isValid = false;
        } else if (pass !== confirm) {
            showError(error4, "Passwords do not match");
            isValid = false;
        } else {
            hideError(error4);
        }

        return isValid;
    };

    function showError(el, message) {
        if (el) {
            el.textContent = message;
            el.style.display = 'block';
            el.className = 'error-message text-red-500 text-xs mt-1';
        }
    }

    function hideError(el) {
        if (el) {
            el.textContent = '';
            el.style.display = 'none';
        }
    }

    // Event Listeners for feedback
    [nameInput, emailInput, passwordInput, confirmInput].forEach(input => {
        input.addEventListener('input', () => {
            if (input === nameInput) validateName();
            if (input === emailInput) validateEmail();
            if (input === passwordInput || input === confirmInput) validatePasswords();
        });
    });

    // Form Submission
    let isSubmitting = false;

    signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        if (isSubmitting) return;

        const nameEmpty = nameInput.value.trim() === '';
        const emailEmpty = emailInput.value.trim() === '';
        const passEmpty = passwordInput.value.trim() === '';
        const confirmEmpty = confirmInput.value.trim() === '';

        if (nameEmpty && emailEmpty && passEmpty && confirmEmpty) {
            validateName();
            validateEmail();
            validatePasswords();
            window.showToast('Please fill out all required fields', 'warning');
            return;
        }

        const isNameValid = validateName();
        const isEmailValid = validateEmail();
        const arePasswordsValid = validatePasswords();

        if (!isNameValid || !isEmailValid || !arePasswordsValid) {
            window.showToast('Please correct the errors in the form', 'warning');
            return;
        }

        isSubmitting = true;
        const submitBtn = signupForm.querySelector('button[type="submit"]');
        const originalBtnText = submitBtn ? submitBtn.innerText : 'Submit';
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = 'Processing...';
        }

        try {
            const response = await axios.post('/api/user/signup', {
                name: nameInput.value.trim(),
                email: emailInput.value.trim(),
                password: passwordInput.value,
                confirmPassword: confirmInput.value,
                referralCode: referralInput ? referralInput.value.trim() : ''
            });

            if (response.data.success) {
                // Clear any existing timer so the next page starts fresh
                localStorage.removeItem('otp_expiry_signup');

                window.showToast(response.data.message || 'OTP sent to your email!', 'success');
                setTimeout(() => {
                    window.location.href = response.data.redirectUrl || '/user/verify-otp';
                }, 1000);
            }
        } catch (err) {
            isSubmitting = false;
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerText = originalBtnText;
            }
            const message = err.response?.data?.message || 'Signup failed. Please try again.';
            window.showToast(message, 'error');
        }
    });
});

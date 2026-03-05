
document.addEventListener('DOMContentLoaded', () => {
    const resetForm = document.getElementById('resetForm');
    const passwordInput = document.getElementById('password');
    const confirmInput = document.getElementById('confirmPassword');
    const error1 = document.getElementById('error1');
    const error2 = document.getElementById('error2');

    // Toggle Visibility
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

    const validatePasswords = () => {
        const pass = passwordInput.value;
        const confirm = confirmInput.value;
        const alpha = /[A-Za-z]/;
        const digit = /\d/;
        let isValid = true;

        if (!pass) {
            showError(error1, "Password is required");
            isValid = false;
        } else if (pass.length < 8) {
            showError(error1, "Minimum 8 characters");
            isValid = false;
        } else if (!alpha.test(pass) || !digit.test(pass)) {
            showError(error1, "Must contain letters and numbers");
            isValid = false;
        } else {
            hideError(error1);
        }

        if (!confirm) {
            showError(error2, "Please confirm password");
            isValid = false;
        } else if (pass !== confirm) {
            showError(error2, "Passwords do not match");
            isValid = false;
        } else {
            hideError(error2);
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

    [passwordInput, confirmInput].forEach(input => {
        input.addEventListener('input', validatePasswords);
    });

    resetForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const passEmpty = passwordInput.value === '';
        const confirmEmpty = confirmInput.value === '';

        if (passEmpty && confirmEmpty) {
            validatePasswords();
            window.showToast("Please fill out all required fields", "warning");
            return;
        }

        if (!validatePasswords()) {
            window.showToast('Please correct the errors in the form', 'warning');
            return;
        }

        try {
            const response = await axios.post('/api/user/fp-reset-password', {
                password: passwordInput.value,
                confirmPassword: confirmInput.value
            });

            if (response.data.success) {
                window.showSuccess(response.data.message || 'Password reset successful!', '/user/login');
            } else {
                window.showError(response.data.message || 'Failed to reset password');
            }
        } catch (error) {
            const errMsg = error.response?.data?.message || 'Something went wrong. Please try again.';
            window.showError(errMsg);
        }
    });
});



document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.querySelector('.login-card');
    const emailInput = document.getElementById('emailInput');
    const passwordInput = document.getElementById('passwordInput');
    const togglePassword = document.getElementById("togglePassword");

    const emailError = document.getElementById('emailError');
    const passwordError = document.getElementById('passwordError');

    // Toggle Password Visibility
    if (togglePassword && passwordInput) {
        togglePassword.addEventListener("click", () => {
            const isPassword = passwordInput.type === "password";
            passwordInput.type = isPassword ? "text" : "password";
            togglePassword.textContent = isPassword ? "visibility_off" : "visibility";
        });
    }

    // Validation Functions
    const validateEmail = () => {
        const value = emailInput.value.trim();
        const pattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!value) {
            showError(emailInput, emailError, "Email is required");
            return false;
        } else if (!pattern.test(value)) {
            showError(emailInput, emailError, "Please enter a valid email address");
            return false;
        }
        hideError(emailInput, emailError);
        return true;
    };

    const validatePassword = () => {
        const value = passwordInput.value;
        if (!value) {
            showError(passwordInput, passwordError, "Password is required");
            return false;
        } else if (value.length < 8) {
            showError(passwordInput, passwordError, "Password must be at least 8 characters");
            return false;
        }
        hideError(passwordInput, passwordError);
        return true;
    };

    // Helper to show/hide errors
    function showError(input, errorEl, message) {
        errorEl.textContent = message;
        errorEl.style.display = 'block';
        input.classList.add('border-red-500');
    }

    function hideError(input, errorEl) {
        errorEl.textContent = '';
        errorEl.style.display = 'none';
        input.classList.remove('border-red-500');
    }

    // Real-time validation
    emailInput.addEventListener('blur', validateEmail);
    passwordInput.addEventListener('blur', validatePassword);
    emailInput.addEventListener('input', () => hideError(emailInput, emailError));
    passwordInput.addEventListener('input', () => hideError(passwordInput, passwordError));

    // Form Submission
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const isEmailEmpty = emailInput.value.trim() === '';
        const isPasswordEmpty = passwordInput.value.trim() === '';

        if (isEmailEmpty && isPasswordEmpty) {
            validateEmail();
            validatePassword();
            window.showToast("Please enter your email and password", "warning");
            return;
        }

        const isEmailValid = validateEmail();
        const isPasswordValid = validatePassword();

        if (!isEmailValid || !isPasswordValid) {
            window.showToast("Please fix the errors before submitting", "warning");
            return;
        }

        try {
            const response = await axios.post('/api/user/login', {
                email: emailInput.value.trim(),
                password: passwordInput.value,
                remember: loginForm.querySelector('[name="remember"]')?.checked || false
            });

            if (response.data.success) {
                window.showToast("Login successful!", "success");
                setTimeout(() => {
                    window.location.href = response.data.redirectUrl || '/user/home';
                }, 1000);
            }
        } catch (err) {
            const message = err.response?.data?.message || "Login failed. Please try again.";
            window.showToast(message, "error");
        }
    });
});

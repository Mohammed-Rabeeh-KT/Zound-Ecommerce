
document.addEventListener('DOMContentLoaded', () => {

    // Password visibility toggle
    const togglePassword = document.getElementById("togglePassword");
    const passwordInput = document.getElementById("passwordInput");

    togglePassword.addEventListener("click", () => {
        const type = passwordInput.type === "password" ? "text" : "password";
        passwordInput.type = type;
        togglePassword.textContent = type === "password" ? "visibility_off" : "visibility";
    });

    // Get form elements
    const emailInput = document.getElementById('emailInput');
    const adminLoginForm = document.querySelector('.admin-login-card');
    const emailError = document.getElementById('emailError');
    const passwordError = document.getElementById('passwordError');

    // Email validation
    function emailValidateChecking() {
        const emailVal = emailInput.value;
        const emailPattern = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;

        if (emailVal.trim() === "") {
            emailError.style.display = "block";
            emailError.textContent = "Please enter your email address";
            emailInput.style.borderColor = "#dc3545";
            return false;
        } else if (!emailPattern.test(emailVal)) {
            emailError.style.display = "block";
            emailError.textContent = "Invalid email format. Please enter a valid email address.";
            emailInput.style.borderColor = "#dc3545";
            return false;
        } else {
            emailError.style.display = "none";
            emailError.textContent = "";
            emailInput.style.borderColor = "";
            return true;
        }
    }

    // Password validation
    function passwordValidateChecking() {
        const passVal = passwordInput.value;

        if (passVal.trim() === "") {
            passwordError.style.display = "block";
            passwordError.textContent = "Please enter your password";
            passwordInput.style.borderColor = "#dc3545";
            return false;
        } else if (passVal.length < 8) {
            passwordError.style.display = "block";
            passwordError.textContent = "Password must be at least 8 characters long";
            passwordInput.style.borderColor = "#dc3545";
            return false;
        } else {
            passwordError.style.display = "none";
            passwordError.textContent = "";
            passwordInput.style.borderColor = "";
            return true;
        }
    }

    // Real-time validation on blur
    emailInput.addEventListener('blur', emailValidateChecking);
    passwordInput.addEventListener('blur', passwordValidateChecking);

    // Clear errors on input
    emailInput.addEventListener('input', () => {
        if (emailInput.value.trim() !== '') {
            emailError.style.display = "none";
            emailInput.style.borderColor = "";
        }
    });

    passwordInput.addEventListener('input', () => {
        if (passwordInput.value !== '') {
            passwordError.style.display = "none";
            passwordInput.style.borderColor = "";
        }
    });

    // Form submission validation
    adminLoginForm.addEventListener('submit', (e) => {
        const isEmailValid = emailValidateChecking();
        const isPasswordValid = passwordValidateChecking();

        if (!isEmailValid || !isPasswordValid) {
            e.preventDefault();

            // Focus on first invalid field
            if (!isEmailValid) {
                emailInput.focus();
            } else if (!isPasswordValid) {
                passwordInput.focus();
            }
        }
    });


    // SWEET ALERT HANDLING
    const successMessage = window.__adminLoginData?.successMessage || '';
    const redirectTo = window.__adminLoginData?.redirectTo || '';

    if (successMessage && typeof window.showSuccess === 'function') {
        window.showSuccess(successMessage, redirectTo);
    }

});

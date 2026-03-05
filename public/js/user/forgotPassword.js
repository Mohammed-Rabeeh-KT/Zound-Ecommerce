

document.addEventListener('DOMContentLoaded', () => {
    const forgotForm = document.querySelector('form[action="/user/forgot-password"]');
    const emailInput = document.getElementById('emailInput');
    const errorEl = document.getElementById('emailError');

    const validateEmail = () => {
        const value = emailInput.value.trim();
        const pattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!value) {
            errorEl.textContent = "Email is required";
            errorEl.classList.remove('hidden');
            errorEl.style.display = 'block';
            return false;
        } else if (!pattern.test(value)) {
            errorEl.textContent = "Invalid email format";
            errorEl.classList.remove('hidden');
            errorEl.style.display = 'block';
            return false;
        }
        errorEl.classList.add('hidden');
        errorEl.style.display = 'none';
        return true;
    };

    emailInput.addEventListener('input', () => {
        errorEl.classList.add('hidden');
        errorEl.style.display = 'none';
    });

    forgotForm.addEventListener('submit', (e) => {
        if (emailInput.value.trim() === '') {
            e.preventDefault();
            validateEmail();
            window.showToast("Please enter your email address", "warning");
            return;
        }

        if (!validateEmail()) {
            e.preventDefault();
            window.showToast("Please enter a valid email", "warning");
        }
    });
});

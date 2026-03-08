/**
 * Zound - OTP Verification (Signup)
 * Handles 2-minute persistent timer, auto-focus inputs, and AJAX verification/resend.
 */

document.addEventListener('DOMContentLoaded', () => {
    const otpForm = document.getElementById('otpForm');
    const inputs = document.querySelectorAll(".otp-input");
    const timerSpan = document.getElementById("otp-timer");
    const resendBtn = document.getElementById("resendBtn");
    const verifyBtn = document.querySelector("button[type='submit']");

    let otpInterval;
    const TIMER_KEY = 'otp_expiry_signup';
    const TOTAL_TIME = 120; // 2 minutes

    // --- Input Handling ---
    if (inputs.length > 0) {
        inputs[0].focus();
        inputs.forEach((input, index) => {
            input.addEventListener("input", () => {
                if (input.value.length === 1 && index < inputs.length - 1) {
                    inputs[index + 1].focus();
                }
            });

            input.addEventListener("keydown", (e) => {
                if (e.key === "Backspace" && !input.value && index > 0) {
                    inputs[index - 1].focus();
                }
            });

            // Handle paste - fill all boxes
            input.addEventListener("paste", (e) => {
                e.preventDefault();
                const pastedData = (e.clipboardData || window.clipboardData).getData("text").trim();
                const digits = pastedData.replace(/\D/g, "").split("").slice(0, inputs.length);
                digits.forEach((digit, i) => {
                    if (inputs[i]) inputs[i].value = digit;
                });
                if (digits.length > 0) {
                    inputs[Math.min(digits.length, inputs.length) - 1].focus();
                }
            });
        });
    }

    // --- Timer Logic ---
    function startTimer() {
        let expiry = localStorage.getItem(TIMER_KEY);

        if (!expiry) {
            expiry = Date.now() + (TOTAL_TIME * 1000);
            localStorage.setItem(TIMER_KEY, expiry);
        }

        updateTimerUI(expiry);

        clearInterval(otpInterval);
        otpInterval = setInterval(() => {
            if (!updateTimerUI(expiry)) {
                clearInterval(otpInterval);
            }
        }, 1000);
    }

    function updateTimerUI(expiry) {
        const now = Date.now();
        const timeLeft = Math.max(0, Math.floor((expiry - now) / 1000));

        if (timeLeft <= 0) {
            timerSpan.innerText = "Expired";
            timerSpan.classList.add("text-red-600");
            resendBtn.classList.remove("pointer-events-none", "text-gray-400", "opacity-50");
            resendBtn.style.cursor = "pointer";

            // Disable verify
            verifyBtn.disabled = true;
            verifyBtn.classList.add("opacity-50", "cursor-not-allowed");
            return false;
        }

        const min = String(Math.floor(timeLeft / 60)).padStart(2, "0");
        const sec = String(timeLeft % 60).padStart(2, "0");
        timerSpan.innerText = `${min}:${sec}`;
        timerSpan.classList.remove("text-red-600");

        // Disable resend while timer active
        resendBtn.classList.add("pointer-events-none", "text-gray-400", "opacity-50");
        resendBtn.style.cursor = "not-allowed";

        // Enable verify
        verifyBtn.disabled = false;
        verifyBtn.classList.remove("opacity-50", "cursor-not-allowed");
        return true;
    }

    // --- Form Submission ---
    let isSubmitting = false;
    otpForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        if (isSubmitting) return;

        let otpVal = "";
        inputs.forEach(input => otpVal += input.value);

        if (otpVal.length !== 6) {
            window.showToast("Please enter all 6 digits", "warning");
            return;
        }

        isSubmitting = true;
        const originalBtnText = verifyBtn ? verifyBtn.innerText : 'Verify';
        if (verifyBtn) {
            verifyBtn.disabled = true;
            verifyBtn.innerHTML = 'Verifying...';
        }

        try {
            const response = await axios.post('/api/user/verify-otp', { otp: otpVal.split('') });

            if (response.data.success) {
                localStorage.removeItem(TIMER_KEY);
                window.showSuccess(response.data.message || 'Verification successful!', response.data.redirectUrl || '/user/login');
            } else {
                if (response.data.expired) {
                    localStorage.removeItem(TIMER_KEY);
                    startTimer(); // This will show as expired
                }
                window.showError(response.data.message || "Invalid OTP");
                isSubmitting = false;
                if (verifyBtn) {
                    verifyBtn.disabled = false;
                    verifyBtn.innerText = originalBtnText;
                }
            }
        } catch (error) {
            isSubmitting = false;
            if (verifyBtn) {
                verifyBtn.disabled = false;
                verifyBtn.innerText = originalBtnText;
            }
            const data = error.response?.data;
            if (data?.expired) {
                localStorage.removeItem(TIMER_KEY);
                startTimer();
            }
            window.showError(data?.message || "An error occurred during OTP verification");
        }
    });

    // --- Resend Logic ---
    resendBtn.addEventListener('click', async () => {
        if (resendBtn.classList.contains("pointer-events-none")) return;

        try {
            window.showToast("Resending OTP...", "info");
            const response = await axios.post('/api/user/resend-otp');

            if (response.data.success) {
                localStorage.removeItem(TIMER_KEY); // Reset on success
                startTimer();
                inputs.forEach(input => input.value = '');
                inputs[0].focus();

                let attemptsStr = response.data.attemptsLeft !== undefined
                    ? ` (${response.data.attemptsLeft} attempts left)`
                    : "";
                window.showSuccess("OTP Resent successfully!" + attemptsStr);
            } else {
                window.showError(response.data.message || "Failed to resend OTP");
            }
        } catch (error) {
            window.showError(error.response?.data?.message || "Error resending OTP");
        }
    });

    // Start on load
    startTimer();
});

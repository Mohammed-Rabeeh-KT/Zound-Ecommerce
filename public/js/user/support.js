// support.js

function toggleFaq(headerEl) {
    const content = headerEl.nextElementSibling;
    const isVisible = content.style.display === 'block';

    // Close all other
    document.querySelectorAll('.faq-content').forEach(el => el.style.display = 'none');
    document.querySelectorAll('.faq-header svg').forEach(el => el.style.transform = 'rotate(0deg)');

    if (!isVisible) {
        content.style.display = 'block';
        headerEl.querySelector('svg').style.transform = 'rotate(180deg)';
        headerEl.querySelector('svg').style.transition = 'transform 0.2s';
    }
}

function handleContactSubmit(e) {
    e.preventDefault();
    const name = document.getElementById('contactName').value.trim();
    const email = document.getElementById('contactEmail').value.trim();
    const msg = document.getElementById('contactMessage').value.trim();

    if (!name || !email || !msg) {
        if (window.showToast) window.showToast('Please fill all required fields', 'error');
        else alert('Please fill all required fields');
        return;
    }

    if (window.showToast) window.showToast('Message sent successfully! Our team will contact you soon.', 'success');
    else alert('Message sent successfully!');

    e.target.reset();
}

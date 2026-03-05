const canvas = document.getElementById('heroCanvas');
const ctx = canvas.getContext('2d');

let width, height;
let particles = [];

// Configuration for LIGHT THEME
const particleCount = 70;
const connectionDistance = 150;
const mouseDistance = 220;
// Deep Royal Blue color
const particleColor = '0, 35, 102'; // RGB for #002366

let mouse = { x: null, y: null };

window.addEventListener('mousemove', (e) => {
    mouse.x = e.x;
    mouse.y = e.y;
});

function resize() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
}
window.addEventListener('resize', resize);
resize();

class Particle {
    constructor() {
        this.x = Math.random() * width;
        this.y = Math.random() * height;
        this.vx = (Math.random() - 0.5) * 0.4; // Very slow, graceful
        this.vy = (Math.random() - 0.5) * 0.4;
        this.size = Math.random() * 2 + 0.5;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;

        if (this.x < 0 || this.x > width) this.vx *= -1;
        if (this.y < 0 || this.y > height) this.vy *= -1;

        if (mouse.x != null) {
            let dx = mouse.x - this.x;
            let dy = mouse.y - this.y;
            let distance = Math.sqrt(dx * dx + dy * dy);
            if (distance < mouseDistance) {
                const forceDirectionX = dx / distance;
                const forceDirectionY = dy / distance;
                const force = (mouseDistance - distance) / mouseDistance;
                const directionX = forceDirectionX * force * 0.6;
                const directionY = forceDirectionY * force * 0.6;
                this.vx -= directionX;
                this.vy -= directionY;
            }
        }
    }

    draw() {
        // Use Royal Blue with opacity
        ctx.fillStyle = `rgba(${particleColor}, 0.5)`;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
    }
}

function init() {
    particles = [];
    for (let i = 0; i < particleCount; i++) {
        particles.push(new Particle());
    }
}

function animate() {
    ctx.clearRect(0, 0, width, height); // Clear to white (transparent)

    for (let i = 0; i < particles.length; i++) {
        particles[i].update();
        particles[i].draw();

        for (let j = i; j < particles.length; j++) {
            let dx = particles[i].x - particles[j].x;
            let dy = particles[i].y - particles[j].y;
            let distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < connectionDistance) {
                ctx.beginPath();
                let opacity = 1 - (distance / connectionDistance);
                // Connections are very faint royal blue
                ctx.strokeStyle = `rgba(${particleColor}, ${opacity * 0.1})`;
                ctx.lineWidth = 1;
                ctx.moveTo(particles[i].x, particles[i].y);
                ctx.lineTo(particles[j].x, particles[j].y);
                ctx.stroke();
            }
        }
    }
    requestAnimationFrame(animate);
}

init();
animate();

window.addEventListener('click', () => {
    particles.forEach(p => {
        p.vx = (Math.random() - 0.5) * 3;
        p.vy = (Math.random() - 0.5) * 3;
    });
});

// Client-side cart logic helper
if (typeof addToCartQuick === 'undefined') {
    window.addToCartQuick = function (productId, variantId) {
        axios.post('/api/user/cart/add', {
            productId, variantId, quantity: 1
        }).then(res => {
            Swal.fire({
                icon: 'success',
                title: 'Added to Cart',
                text: 'Item added successfully',
                toast: true,
                position: 'bottom-end',
                showConfirmButton: false,
                timer: 1500,
                confirmButtonColor: '#002366'
            });
            const countBadge = document.getElementById('cart-count');
            if (countBadge) countBadge.innerText = parseInt(countBadge.innerText || 0) + 1;
        }).catch(err => {
            Swal.fire({
                icon: 'error',
                title: 'Oops',
                text: err.response?.data?.message || 'Failed to add item',
                toast: true,
                position: 'bottom-end',
                showConfirmButton: false,
                timer: 1500
            });
        });
    }
}

// Wishlist Toggle Helper (Updated for #002366 color)
if (typeof toggleWishlist === 'undefined') {
    window.toggleWishlist = async function (productId, variantId, btnElement) {
        const icon = btnElement.querySelector('i');
        const svgIcon = btnElement.querySelector('svg');
        const isInWishlist = btnElement.classList.contains('active');

        try {
            if (isInWishlist) {
                // Remove from wishlist
                await axios.delete(`/api/user/wishlist/remove/${productId}?variantId=${variantId || ''}`);
                btnElement.classList.remove('active');
                if (icon) {
                    icon.classList.remove('bi-heart-fill', 'text-[#002366]');
                    icon.classList.add('bi-heart');
                }
                if (svgIcon) {
                    svgIcon.style.fill = 'none';
                }
                Swal.fire({ icon: 'success', title: 'Removed from Wishlist', toast: true, position: 'bottom-end', timer: 1500, showConfirmButton: false });
            } else {
                // Add to wishlist
                await axios.post('/api/user/wishlist/add', { productId, variantId: variantId || null });
                btnElement.classList.add('active');
                if (icon) {
                    icon.classList.remove('bi-heart');
                    icon.classList.add('bi-heart-fill', 'text-[#002366]');
                }
                if (svgIcon) {
                    svgIcon.style.fill = '#ef4444'; // Use consistent color
                }
                Swal.fire({ icon: 'success', title: 'Added to Wishlist', toast: true, position: 'bottom-end', timer: 1500, showConfirmButton: false });
            }
        } catch (err) {
            console.error('Wishlist error:', err);
            if (err.response && err.response.status === 401) {
                Swal.fire({ icon: 'warning', title: 'Login Required', text: 'Please login to use wishlist', toast: true, position: 'bottom-end', timer: 1500, showConfirmButton: false });
            } else {
                Swal.fire({ icon: 'error', title: 'Error', text: err.response?.data?.message || 'Failed to update wishlist', toast: true, position: 'bottom-end', timer: 1500 });
            }
        }
    }
}
// 3D Tilt Effect for Hero Product
const heroContainer = document.getElementById('heroProductContainer');
const heroImg = document.getElementById('heroProduct');

// Start with auto animation
if (heroContainer) {
    heroContainer.classList.add('animate-slow-turn');

    heroContainer.addEventListener('mousemove', (e) => {
        // Pause auto animation and engage manual tilt
        heroContainer.classList.remove('animate-slow-turn');

        const rect = heroContainer.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const centerX = rect.width / 2;
        const centerY = rect.height / 2;

        // Calculate rotation (max 15 degrees)
        const rotateX = ((y - centerY) / centerY) * -20;
        const rotateY = ((x - centerX) / centerX) * 20;

        heroContainer.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
    });

    heroContainer.addEventListener('mouseleave', () => {
        // Resume auto animation and clear manual transform
        heroContainer.style.transform = '';
        heroContainer.classList.add('animate-slow-turn');
    });
}

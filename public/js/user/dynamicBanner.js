// Dynamic Premium Banner Carousel
class DynamicBanner {
    constructor() {
        this.banners = [];
        this.currentBannerIndex = 0;
        this.rotationInterval = null;
        this.isPaused = false;
        this.init();
    }

    async init() {
        await this.loadBanners();
        if (this.banners.length > 0) {
            this.buildCarousel();
            this.setupEventListeners();

            if (this.banners.length > 1) {
                this.startAutoRotation();
            }
        }
    }

    async loadBanners() {
        try {
            const response = await fetch('/api/user/banners/active');
            const data = await response.json();
            if (data.success && data.data.length > 0) {
                this.banners = data.data;
            }
        } catch (error) {
            console.error('Error loading banners:', error);
        }
    }

    buildCarousel() {
        const heroSection = document.querySelector('.hero-section');
        if (!heroSection) return;

        // Container replacing hero section
        heroSection.innerHTML = '';
        heroSection.className = 'dynamic-carousel-section relative w-full overflow-hidden';
        heroSection.style.height = '600px';
        heroSection.style.backgroundColor = '#000';

        // Create the sliding track
        this.track = document.createElement('div');
        this.track.className = 'carousel-track flex h-full transition-transform duration-700 ease-in-out';
        this.track.style.width = `${this.banners.length * 100}%`;

        this.banners.forEach((banner) => {
            const slide = document.createElement('div');
            slide.className = 'carousel-slide relative h-full flex items-center justify-center';
            slide.style.width = `${100 / this.banners.length}%`;

            slide.innerHTML = `
                <div class="absolute inset-0 bg-cover bg-center" style="
                    background-image: url('${banner.image || '/images/placeholder.png'}');
                "></div>
                
                <div class="relative z-10 text-center px-6 max-w-4xl mx-auto transform transition-all duration-700 translate-y-4 opacity-0 slide-content" style="
                        text-align: center;
                        color: white;
                        max-width: 1200px;
                        width: 90%;
                        padding: 40px 20px;
                ">
                    ${banner.subtitle ? `<div class="banner-subtitle" style="font-size: 14px; margin-bottom: 12px; opacity: 0.9; text-transform: uppercase; letter-spacing: 2px; font-weight: 300;">${banner.subtitle}</div>` : ''}
                    <h1 class="banner-title" style="font-size: clamp(2.5rem, 5vw, 4.5rem); font-weight: 700; margin-bottom: 20px; line-height: 1.1; text-shadow: 2px 2px 4px rgba(0,0,0,0.3);">
                        ${banner.title}
                    </h1>
                    ${banner.description ? `<p class="banner-description" style="font-size: clamp(1rem, 2vw, 1.2rem); margin-bottom: 30px; opacity: 0.95; line-height: 1.5; max-width: 700px; margin-left: auto; margin-right: auto;">${banner.description}</p>` : ''}
                    <div class="banner-actions" style="display: flex; gap: 16px; justify-content: center; flex-wrap: wrap;">
                        ${banner.buttonText ? `
                            <a href="${banner.buttonLink || '/user/products'}" class="banner-button" style="
                                display: inline-block;
                                padding: 14px 32px;
                                background: rgba(255, 255, 255, 0.15);
                                color: white;
                                text-decoration: none;
                                border-radius: 50px;
                                font-weight: 600;
                                font-size: 14px;
                                border: 2px solid rgba(255, 255, 255, 0.3);
                                backdrop-filter: blur(10px);
                                transition: all 0.3s ease;
                                transform: translateY(0);
                                box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
                            " onmouseover="this.style.background='rgba(255, 255, 255, 0.25)'; this.style.transform='translateY(-2px)'; this.style.boxShadow='0 8px 25px rgba(0, 0, 0, 0.2)'" 
                               onmouseout="this.style.background='rgba(255, 255, 255, 0.15)'; this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 20px rgba(0, 0, 0, 0.1)'">
                                ${banner.buttonText}
                            </a>
                        ` : ''}
                    </div>
                </div>
            `;
            this.track.appendChild(slide);
        });

        heroSection.appendChild(this.track);

        // Add navigation controls if multiple banners exist
        if (this.banners.length > 1) {
            this.createControls(heroSection);
            this.createDots(heroSection);
        }

        // Trigger first slide animation
        this.animateSlideContent(0);
    }

    createControls(container) {
        const controls = document.createElement('div');
        controls.className = 'absolute inset-0 flex items-center justify-between px-4 md:px-12 pointer-events-none z-20';

        controls.innerHTML = `
            <button class="prev-btn pointer-events-auto w-12 h-12 rounded-full border border-white/30 bg-black/20 backdrop-blur-md flex items-center justify-center text-white hover:bg-white/20 hover:scale-110 transition-all">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 18l-6-6 6-6"/></svg>
            </button>
            <button class="next-btn pointer-events-auto w-12 h-12 rounded-full border border-white/30 bg-black/20 backdrop-blur-md flex items-center justify-center text-white hover:bg-white/20 hover:scale-110 transition-all">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18l6-6-6-6"/></svg>
            </button>
        `;

        controls.querySelector('.prev-btn').addEventListener('click', () => {
            this.previous();
            this.resetRotation();
        });
        controls.querySelector('.next-btn').addEventListener('click', () => {
            this.next();
            this.resetRotation();
        });

        container.appendChild(controls);
    }

    createDots(container) {
        this.dotsContainer = document.createElement('div');
        this.dotsContainer.className = 'absolute bottom-8 left-1/2 transform -translate-x-1/2 flex gap-3 z-30';

        this.banners.forEach((_, i) => {
            const dot = document.createElement('button');
            dot.className = `w-3 h-3 rounded-full border border-white/50 transition-all ${i === 0 ? 'bg-white scale-125' : 'bg-transparent hover:bg-white/50'}`;
            dot.addEventListener('click', () => {
                this.goTo(i);
                this.resetRotation();
            });
            this.dotsContainer.appendChild(dot);
        });

        container.appendChild(this.dotsContainer);
    }

    updateDots() {
        if (!this.dotsContainer) return;
        Array.from(this.dotsContainer.children).forEach((dot, i) => {
            if (i === this.currentBannerIndex) {
                dot.className = 'w-3 h-3 rounded-full border border-white/50 transition-all bg-white scale-125';
            } else {
                dot.className = 'w-3 h-3 rounded-full border border-white/50 transition-all bg-transparent hover:bg-white/50';
            }
        });
    }

    animateSlideContent(index) {
        const slides = this.track.querySelectorAll('.carousel-slide');
        slides.forEach((slide, i) => {
            const content = slide.querySelector('.slide-content');
            if (i === index) {
                content.style.opacity = '1';
                content.style.transform = 'translateY(0)';
            } else {
                content.style.opacity = '0';
                content.style.transform = 'translateY(20px)';
            }
        });
    }

    goTo(index) {
        this.currentBannerIndex = index;
        const offset = -(100 / this.banners.length) * this.currentBannerIndex;
        this.track.style.transform = `translateX(${offset}%)`;

        this.updateDots();
        this.animateSlideContent(this.currentBannerIndex);
    }

    next() {
        let newIndex = this.currentBannerIndex + 1;
        if (newIndex >= this.banners.length) newIndex = 0;
        this.goTo(newIndex);
    }

    previous() {
        let newIndex = this.currentBannerIndex - 1;
        if (newIndex < 0) newIndex = this.banners.length - 1;
        this.goTo(newIndex);
    }

    startAutoRotation() {
        this.rotationInterval = setInterval(() => {
            if (!this.isPaused) this.next();
        }, 5000);
    }

    resetRotation() {
        if (this.rotationInterval) {
            clearInterval(this.rotationInterval);
            this.startAutoRotation();
        }
    }

    setupEventListeners() {
        const heroSection = document.querySelector('.dynamic-carousel-section');
        if (!heroSection) return;

        heroSection.addEventListener('mouseenter', () => this.isPaused = true);
        heroSection.addEventListener('mouseleave', () => this.isPaused = false);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new DynamicBanner();
});


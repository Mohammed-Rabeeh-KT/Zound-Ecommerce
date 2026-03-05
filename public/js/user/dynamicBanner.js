// Dynamic Banner Management for Homepage
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
        this.setupEventListeners();
        
        // Debug: Log banner data
        console.log('Dynamic Banner initialized with', this.banners.length, 'banners');
        if (this.banners.length > 0) {
            console.log('Banner data:', this.banners);
        }
    }

    async loadBanners() {
        try {
            console.log('Loading banners from API...');
            const response = await fetch('/api/user/banners/active');
            console.log('API response status:', response.status);
            
            const data = await response.json();
            console.log('API response:', data);

            if (data.success) {
                this.banners = data.data;
                console.log('Banners loaded successfully:', this.banners.length);
                
                if (this.banners.length > 0) {
                    console.log('Banner details:', this.banners.map(b => ({ title: b.title, isActive: b.isActive })));
                }
                
                this.updateHomepageBanner();
                
                // Create navigation dots after banners are loaded
                if (this.banners.length > 1) {
                    console.log('Creating navigation dots for', this.banners.length, 'banners');
                    this.createNavigationDots();
                    this.startAutoRotation();
                } else {
                    console.log('Not enough banners for carousel (', this.banners.length, ')');
                }
            } else {
                console.log('API returned success:false, message:', data.message);
            }
        } catch (error) {
            console.error('Error loading banners:', error);
        }
    }

    updateHomepageBanner() {
        if (this.banners.length === 0) {
            console.log('No banners to display');
            return;
        }

        const banner = this.banners[this.currentBannerIndex];
        console.log('Updating banner to index:', this.currentBannerIndex, banner.title);
        
        const heroSection = document.querySelector('.hero-section');
        
        if (banner) {
            // Create banner container that replaces the entire hero section
            const bannerHTML = `
                <div class="dynamic-banner-container" data-banner-index="${this.currentBannerIndex}">
                    <div class="dynamic-banner" style="
                        background: linear-gradient(135deg, rgba(0, 35, 102, 0.85), rgba(0, 123, 255, 0.75));
                        background-image: url('${banner.image}');
                        background-size: cover;
                        background-position: center;
                        background-repeat: no-repeat;
                        background-blend-mode: overlay;
                        height: 500px;
                        min-height: 400px;
                        max-height: 600px;
                        width: 100%;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        position: relative;
                        overflow: hidden;
                        border-radius: 24px;
                        margin: 20px;
                        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
                    ">
                        <div class="banner-content" style="
                            text-align: center;
                            color: white;
                            max-width: 1200px;
                            width: 90%;
                            padding: 40px 20px;
                            z-index: 2;
                            position: relative;
                        ">
                            ${banner.subtitle ? `<div class="banner-subtitle" style="font-size: 14px; margin-bottom: 12px; opacity: 0.9; text-transform: uppercase; letter-spacing: 2px; font-weight: 300;">${banner.subtitle}</div>` : ''}
                            <h1 class="banner-title" style="font-size: clamp(2rem, 4vw, 3.5rem); font-weight: 700; margin-bottom: 20px; line-height: 1.1; text-shadow: 2px 2px 4px rgba(0,0,0,0.3);">
                                ${banner.title}
                            </h1>
                            ${banner.description ? `<p class="banner-description" style="font-size: clamp(1rem, 2vw, 1.2rem); margin-bottom: 30px; opacity: 0.95; line-height: 1.5; max-width: 700px; margin-left: auto; margin-right: auto;">${banner.description}</p>` : ''}
                            <div class="banner-actions" style="display: flex; gap: 16px; justify-content: center; flex-wrap: wrap;">
                                ${banner.buttonText ? `
                                    <a href="${this.getBannerLink(banner)}" class="banner-button" style="
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
                        <div class="banner-overlay" style="
                            position: absolute;
                            top: 0;
                            left: 0;
                            right: 0;
                            bottom: 0;
                            background: linear-gradient(135deg, rgba(0, 35, 102, 0.7), rgba(0, 123, 255, 0.5));
                            z-index: 1;
                            border-radius: 24px;
                        "></div>
                    </div>
                    
                    <!-- Banner Navigation -->
                    <div class="banner-controls">
                        <button class="banner-nav-btn banner-prev" onclick="window.dynamicBanner.previousBanner()">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M15 18l-6-6 6-6"/>
                            </svg>
                        </button>
                        <button class="banner-nav-btn banner-next" onclick="window.dynamicBanner.nextBanner()">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M9 18l6-6-6-6"/>
                            </svg>
                        </button>
                    </div>
                    
                    <!-- Banner Counter -->
                    <div class="banner-counter">
                        <span class="current-index">${this.currentBannerIndex + 1}</span>
                        <span class="separator">/</span>
                        <span class="total-index">${this.banners.length}</span>
                    </div>
                </div>
            `;
            
            // Replace the entire hero section content
            heroSection.innerHTML = bannerHTML;
            
            // Add slide-in animation
            const bannerElement = heroSection.querySelector('.dynamic-banner');
            if (bannerElement) {
                bannerElement.style.animation = 'slideIn 0.6s ease-out';
            }
            
            // Update navigation dots
            this.updateNavigationDots();
            
            // Store reference globally for button access
            window.dynamicBanner = this;
        }
    }

    getBannerLink(banner) {
        if (banner.product) {
            return `/user/products/${banner.product._id}`;
        } else if (banner.buttonLink) {
            return banner.buttonLink;
        } else {
            return '/user/products';
        }
    }

    // Carousel navigation functions
    nextBanner() {
        if (this.banners.length <= 1) return;
        
        this.currentBannerIndex = (this.currentBannerIndex + 1) % this.banners.length;
        this.updateBannerWithTransition('next');
    }

    previousBanner() {
        if (this.banners.length <= 1) return;
        
        this.currentBannerIndex = this.currentBannerIndex === 0 
            ? this.banners.length - 1 
            : this.currentBannerIndex - 1;
        this.updateBannerWithTransition('prev');
    }

    goToBanner(index) {
        if (this.banners.length <= 1 || index === this.currentBannerIndex) return;
        
        this.currentBannerIndex = index;
        this.updateBannerWithTransition('goto');
    }

    updateBannerWithTransition(direction) {
        const bannerContainer = document.querySelector('.dynamic-banner');
        if (!bannerContainer) return;

        // Add transition class based on direction
        bannerContainer.style.animation = '';
        
        setTimeout(() => {
            this.updateHomepageBanner();
            
            // Update counter
            this.updateCounter();
        }, 50);
    }

    updateCounter() {
        const currentIndexEl = document.querySelector('.banner-counter .current-index');
        const totalIndexEl = document.querySelector('.banner-counter .total-index');
        
        if (currentIndexEl) currentIndexEl.textContent = this.currentBannerIndex + 1;
        if (totalIndexEl) totalIndexEl.textContent = this.banners.length;
    }

    startAutoRotation() {
        if (this.banners.length <= 1 || this.rotationInterval) return;
        
        this.rotationInterval = setInterval(() => {
            if (!this.isPaused) {
                this.nextBanner();
            }
        }, 4000);
    }

    stopAutoRotation() {
        if (this.rotationInterval) {
            clearInterval(this.rotationInterval);
            this.rotationInterval = null;
        }
    }

    pauseRotation() {
        this.isPaused = true;
    }

    resumeRotation() {
        this.isPaused = false;
    }

    setupBannerRotation() {
        if (this.banners.length <= 1) return;

        // Rotate banners every 4 seconds
        setInterval(() => {
            this.currentBannerIndex = (this.currentBannerIndex + 1) % this.banners.length;
            this.updateHomepageBanner();
        }, 4000);
    }

    setupEventListeners() {
        // Handle banner visibility changes
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) {
                // Resume rotation when page becomes visible
                this.startAutoRotation();
            } else {
                // Pause when page is hidden
                this.pauseRotation();
            }
        });

        // Pause on hover
        document.addEventListener('mouseover', (e) => {
            if (e.target.closest('.dynamic-banner-container')) {
                this.pauseRotation();
            }
        });

        // Resume on mouse leave
        document.addEventListener('mouseout', (e) => {
            if (e.target.closest('.dynamic-banner-container')) {
                this.resumeRotation();
            }
        });

        // Keyboard navigation
        document.addEventListener('keydown', (e) => {
            if (e.target.closest('.dynamic-banner-container')) {
                if (e.key === 'ArrowLeft') {
                    this.previousBanner();
                } else if (e.key === 'ArrowRight') {
                    this.nextBanner();
                }
            }
        });
    }

    createNavigationDots() {
        console.log('Creating navigation dots...');
        
        // Remove existing dots if any
        const existingDots = document.querySelector('.banner-navigation');
        if (existingDots) {
            console.log('Removing existing navigation dots');
            existingDots.remove();
        }

        // Create navigation container
        const navContainer = document.createElement('div');
        navContainer.className = 'banner-navigation';
        navContainer.style.cssText = `
            position: fixed;
            bottom: 30px;
            right: 30px;
            display: flex;
            gap: 12px;
            z-index: 9999;
            background: rgba(0, 0, 0, 0.7);
            padding: 12px 16px;
            border-radius: 30px;
            backdrop-filter: blur(15px);
            border: 1px solid rgba(255, 255, 255, 0.2);
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
        `;

        console.log('Creating dots for', this.banners.length, 'banners');
        
        // Create dots for each banner
        this.banners.forEach((banner, index) => {
            console.log('Creating dot', index, 'for banner:', banner.title);
            
            const dot = document.createElement('button');
            dot.className = `banner-dot ${index === this.currentBannerIndex ? 'active' : ''}`;
            dot.style.cssText = `
                width: 12px;
                height: 12px;
                border-radius: 50%;
                border: 2px solid rgba(255, 255, 255, 0.8);
                background: ${index === this.currentBannerIndex ? 'rgba(255, 255, 255, 0.9)' : 'rgba(255, 255, 255, 0.4)'};
                cursor: pointer;
                transition: all 0.3s ease;
                backdrop-filter: blur(5px);
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
            `;
            
            dot.setAttribute('data-index', index);
            dot.setAttribute('aria-label', `Go to banner ${index + 1}`);
            
            dot.addEventListener('click', () => {
                console.log('Dot clicked for banner', index);
                this.goToBanner(index);
            });

            dot.addEventListener('mouseenter', () => {
                dot.style.background = 'rgba(255, 255, 255, 0.8)';
                dot.style.transform = 'scale(1.3)';
                dot.style.borderColor = 'rgba(255, 255, 255, 1)';
            });

            dot.addEventListener('mouseleave', () => {
                if (index !== this.currentBannerIndex) {
                    dot.style.background = 'rgba(255, 255, 255, 0.4)';
                    dot.style.transform = 'scale(1)';
                    dot.style.borderColor = 'rgba(255, 255, 255, 0.8)';
                }
            });

            navContainer.appendChild(dot);
        });

        document.body.appendChild(navContainer);
        console.log('Navigation dots added to DOM');
        console.log('Navigation container element:', navContainer);
        console.log('Navigation container styles:', navContainer.style.cssText);
        console.log('Total dots created:', navContainer.children.length);
    }

    updateNavigationDots() {
        const dots = document.querySelectorAll('.banner-dot');
        dots.forEach((dot, index) => {
            if (index === this.currentBannerIndex) {
                dot.style.background = 'rgba(255, 255, 255, 0.9)';
                dot.style.transform = 'scale(1.2)';
                dot.style.borderColor = 'rgba(255, 255, 255, 1)';
            } else {
                dot.style.background = 'rgba(255, 255, 255, 0.4)';
                dot.style.transform = 'scale(1)';
                dot.style.borderColor = 'rgba(255, 255, 255, 0.8)';
            }
        });
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, checking for hero section...');
    const heroSection = document.querySelector('.hero-section');
    console.log('Hero section found:', !!heroSection);
    
    // Only initialize on homepage
    if (heroSection) {
        console.log('Initializing Dynamic Banner...');
        new DynamicBanner();
    } else {
        console.log('Not on homepage - no hero section found');
    }
});

// CSS for carousel animation and enhanced styling
const bannerStyles = `
    @keyframes slideIn {
        from {
            opacity: 0;
            transform: translateX(100px);
        }
        to {
            opacity: 1;
            transform: translateX(0);
        }
    }
    
    @keyframes slideOut {
        from {
            opacity: 1;
            transform: translateX(0);
        }
        to {
            opacity: 0;
            transform: translateX(-100px);
        }
    }
    
    @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
    }
    
    .dynamic-banner-container {
        position: relative;
        width: 100%;
    }
    
    .dynamic-banner {
        transition: all 0.6s cubic-bezier(0.4, 0, 0.2, 1);
        position: relative;
        overflow: hidden;
    }
    
    .dynamic-banner:hover {
        transform: translateY(-5px);
        box-shadow: 0 25px 70px rgba(0, 0, 0, 0.4);
    }
    
    /* Banner Controls */
    .banner-controls {
        position: absolute;
        top: 50%;
        transform: translateY(-50%);
        width: 100%;
        display: flex;
        justify-content: space-between;
        padding: 0 20px;
        pointer-events: none;
        z-index: 10;
    }
    
    .banner-nav-btn {
        width: 50px;
        height: 50px;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.2);
        border: 2px solid rgba(255, 255, 255, 0.4);
        color: white;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.3s ease;
        backdrop-filter: blur(10px);
        pointer-events: all;
    }
    
    .banner-nav-btn:hover {
        background: rgba(255, 255, 255, 0.3);
        border-color: rgba(255, 255, 255, 0.6);
        transform: scale(1.1);
    }
    
    .banner-nav-btn:active {
        transform: scale(0.95);
    }
    
    /* Banner Counter */
    .banner-counter {
        position: absolute;
        top: 20px;
        right: 20px;
        background: rgba(0, 0, 0, 0.6);
        color: white;
        padding: 8px 16px;
        border-radius: 20px;
        font-size: 14px;
        font-weight: 600;
        backdrop-filter: blur(10px);
        border: 1px solid rgba(255, 255, 255, 0.2);
        z-index: 10;
    }
    
    .banner-counter .current-index {
        color: #fff;
        font-weight: 700;
    }
    
    .banner-counter .separator {
        margin: 0 4px;
        opacity: 0.7;
    }
    
    .banner-counter .total-index {
        opacity: 0.8;
    }
    
    /* Navigation Dots */
    .banner-navigation {
        position: fixed;
        bottom: 30px;
        right: 30px;
        display: flex;
        gap: 12px;
        z-index: 9999;
        background: rgba(0, 0, 0, 0.7);
        padding: 12px 16px;
        border-radius: 30px;
        backdrop-filter: blur(15px);
        border: 1px solid rgba(255, 255, 255, 0.2);
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
    }
    
    .banner-dot {
        width: 12px;
        height: 12px;
        border-radius: 50%;
        border: 2px solid rgba(255, 255, 255, 0.8);
        background: rgba(255, 255, 255, 0.4);
        cursor: pointer;
        transition: all 0.3s ease;
        backdrop-filter: blur(5px);
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
    }
    
    .banner-dot.active {
        background: rgba(255, 255, 255, 0.9);
        transform: scale(1.2);
        border-color: rgba(255, 255, 255, 1);
    }
    
    .banner-dot:hover {
        background: rgba(255, 255, 255, 0.8);
        transform: scale(1.3);
        border-color: rgba(255, 255, 255, 1);
    }
    
    /* Mobile Responsive */
    @media (max-width: 768px) {
        .banner-controls {
            padding: 0 10px;
        }
        
        .banner-nav-btn {
            width: 40px;
            height: 40px;
        }
        
        .banner-counter {
            top: 10px;
            right: 10px;
            font-size: 12px;
            padding: 6px 12px;
        }
        
        .banner-navigation {
            bottom: 20px;
            right: 20px;
            padding: 8px 12px;
        }
        
        .banner-dot {
            width: 10px;
            height: 10px;
        }
    }
`;

// Inject styles
const styleSheet = document.createElement('style');
styleSheet.textContent = bannerStyles;
document.head.appendChild(styleSheet);

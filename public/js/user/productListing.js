const pageTitleEl = document.querySelector('.page-header h1');
const pageDescEl = document.querySelector('.page-subtitle');

const DEFAULT_TITLE = 'All Products';
const DEFAULT_DESC =
    'Explore our premium collection of audio products engineered for exceptional sound.';


// Filter Toggle Functionality
document.querySelectorAll('.filter-toggle').forEach(toggle => {
    toggle.addEventListener('click', function () {
        const filterName = this.getAttribute('data-filter');
        const content = document.querySelector(`[data-content="${filterName}"]`);
        const isOpen = content.classList.contains('open');

        // Close all other filters
        document.querySelectorAll('.filter-content').forEach(c => c.classList.remove('open'));
        document.querySelectorAll('.filter-toggle').forEach(t => t.classList.remove('active'));

        // Toggle current filter
        if (!isOpen) {
            content.classList.add('open');
            this.classList.add('active');
        }
    });
});

// Search Functionality
const searchInput = document.getElementById('searchInput');
const clearSearch = document.getElementById('clearSearch');

if (searchInput) {
    searchInput.addEventListener('keypress', function (e) {
        if (e.key === 'Enter') {
            applyFiltersAndSearch();
        }
    });
}

if (clearSearch) {
    clearSearch.addEventListener('click', function () {
        searchInput.value = '';
        applyFiltersAndSearch();
    });
}

// Sort Functionality
const sortSelect = document.getElementById('sortBy');
if (sortSelect) {
    sortSelect.addEventListener('change', function () {
        applyFiltersAndSearch();
    });
}

// Apply Filters Button
const applyFiltersBtn = document.getElementById('applyFilters');
if (applyFiltersBtn) {
    applyFiltersBtn.addEventListener('click', function () {
        applyFiltersAndSearch();
    });
}

// Clear All Filters
const clearFiltersBtn = document.getElementById('clearFilters');
if (clearFiltersBtn) {
    clearFiltersBtn.addEventListener('click', function () {
        // Uncheck all checkboxes
        document.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
            checkbox.checked = false;
        });

       /* Reset price slider + inputs */
        minRange.value = minInput.value = MIN_PRICE;
        maxRange.value = maxInput.value = MAX_PRICE;

        updateSliderFill();

        // Reset sort to default (if exists)
        if (sortSelect) {
            sortSelect.selectedIndex = 0;
        }

        // Clear search
        if (searchInput) searchInput.value = '';

         /*Clear active filter chips */
        activeFiltersContainer.innerHTML = '';

        /* Reset heading instantly */
        pageTitleEl.textContent = DEFAULT_TITLE;
        pageDescEl.textContent = DEFAULT_DESC;

        /* Redirect to clean URL */
        window.location.href = '/user/products';
    });
}

// Main function to gather all filters and redirect
function applyFiltersAndSearch(page = 1) {
    const params = new URLSearchParams();

    if (searchInput?.value.trim()) {
        params.set('search', searchInput.value.trim());
    }

    if (sortSelect?.value) {
        params.set('sort', sortSelect.value);
    }

    const brands = [...document.querySelectorAll('input[name="brand"]:checked')]
        .map(cb => cb.value);
    if (brands.length) params.set('brand', brands.join(','));

    const categories = [...document.querySelectorAll('input[name="category"]:checked')]
        .map(cb => cb.value);
    if (categories.length) params.set('category', categories.join(','));

    params.set('page', page);

    const minPrice = minInput.value;
    const maxPrice = maxInput.value;
    if (minPrice > MIN_PRICE || maxPrice < MAX_PRICE) {
        params.set('minPrice', minPrice);
        params.set('maxPrice', maxPrice);
    }

    window.location.href = `/user/products?${params.toString()}`;
}

// Handle "All" checkbox behavior for price range
document.querySelectorAll('input[name="priceRange"]').forEach(checkbox => {
    checkbox.addEventListener('change', function () {
        if (this.value === 'all' && this.checked) {
            // Uncheck all other price range options
            document.querySelectorAll('input[name="priceRange"]').forEach(cb => {
                if (cb.value !== 'all') {
                    cb.checked = false;
                }
            });
        } else if (this.value !== 'all' && this.checked) {
            // Uncheck "All" if any specific option is selected
            const allCheckbox = document.querySelector('input[name="priceRange"][value="all"]');
            if (allCheckbox) {
                allCheckbox.checked = false;
            }
        }

        // If no checkboxes are checked, check "All"
        const anyChecked = Array.from(document.querySelectorAll('input[name="priceRange"]')).some(cb => cb.checked);
        if (!anyChecked) {
            const allCheckbox = document.querySelector('input[name="priceRange"][value="all"]');
            if (allCheckbox) {
                allCheckbox.checked = true;
            }
        }
    });
});

// Add hover effects to product cards
document.querySelectorAll('.product-card').forEach(card => {
    card.addEventListener('mouseenter', function () {
        this.style.transform = 'translateY(-8px)';
    });

    card.addEventListener('mouseleave', function () {
        this.style.transform = 'translateY(0)';
    });
});

// Initialize filters on page load
document.addEventListener('DOMContentLoaded', function () {
    // Open all filter sections by default
    document.querySelectorAll('.filter-content').forEach(content => {
        content.classList.add('open');
    });

    document.querySelectorAll('.filter-toggle').forEach(toggle => {
        toggle.classList.add('active');
    });

    renderActiveFilters();
    updateFilterActionsUI()
});

document.querySelectorAll(
  'input[type="checkbox"], input[type="range"], input[type="number"], select'
).forEach(el => {
  el.addEventListener('change', updateFilterActionsUI);
  el.addEventListener('input', updateFilterActionsUI);
});


function hasActiveFilters() {
    const hasCategory = document.querySelectorAll('input[name="category"]:checked').length > 0;
    const hasBrand = document.querySelectorAll('input[name="brand"]:checked').length > 0;
    const hasPresetPrice = document.querySelectorAll('input[name="priceRange"]:checked')
        .length > 0 &&
        !document.querySelector('input[name="priceRange"][value="all"]')?.checked;

    const hasPriceRange =
        Number(minInput.value) > MIN_PRICE ||
        Number(maxInput.value) < MAX_PRICE;

    const hasSearch = searchInput?.value.trim().length > 0;
    const hasSort = sortSelect?.value !== 'newest';

    return (
        hasCategory ||
        hasBrand ||
        hasPresetPrice ||
        hasPriceRange ||
        hasSearch ||
        hasSort
    );
}

function updateFilterActionsUI() {
    const active = hasActiveFilters();

    // Apply Filters button
    applyFiltersBtn.disabled = !active;

    // Clear All button fade
    if (active) {
        clearFiltersBtn.classList.add('visible');
    } else {
        clearFiltersBtn.classList.remove('visible');
    }
}



//PAGINATION LOGIC
const productGrid = document.querySelector('.products-grid');
const pagination = document.querySelector('.pagination');

// Pagination click handler
if (pagination) {
    pagination.addEventListener('click', (e) => {
        const btn = e.target.closest('.page-btn');
        if (!btn || btn.classList.contains('active')) return;

        const page = parseInt(btn.dataset.page);
        applyFiltersAndSearch(page);
    });
}

// async function fetchProducts(page = 1,params = null) {
//     try {
//         if (!params) {
//             params = new URLSearchParams(window.location.search);
//             params.set('page', page);
//         }

//         const res = await axios.get(`/user/products?${params.toString()}`, {
//             headers: { 'X-Requested-With': 'XMLHttpRequest' }
//         });

//         renderProducts(res.data.products);
//         renderPagination(res.data.currentPage, res.data.totalPages);
//         renderActiveFilters();

//         history.pushState(null, '', `/user/products?${params.toString()}`);
//         window.scrollTo({ top: 0, behavior: 'smooth' });

//     } catch (err) {
//         console.error('Pagination error', err);
//     }
// }

function renderProducts(products) {
    productGrid.innerHTML = '';

    if (!products.length) {
        productGrid.innerHTML = `
      <div class="no-products">
        <h3>No products found</h3>
        <p>Try adjusting your filters</p>
      </div>`;
        return;
    }

    products.forEach(product => {
        const variant = product.primaryVariant;
        const salePrice = variant?.salePrice;
        const basePrice = variant?.basePrice;

        productGrid.insertAdjacentHTML('beforeend', `
      <div class="product-card">
        <div class="product-image-container premium-card">
          <img src="${product.listingImage}" 
               alt="${product.productName}" 
               class="product-image">

          <div class="card-action-overlay">
            ${variant && variant.stock > 0 ? `
              <button class="card-btn primary" data-product-id="${product._id}">
                <svg viewBox="0 0 24 24">
                  <circle cx="9" cy="21" r="1"></circle>
                  <circle cx="20" cy="21" r="1"></circle>
                  <path d="M1 1h4l2.68 13.39h9.72L23 6H6"></path>
                </svg>
                <span>Add to Cart</span>
              </button>
            ` : ``}

            <button class="card-btn secondary" data-product-id="${product._id}">
              <svg viewBox="0 0 24 24">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67
                         l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78
                         L12 21.23l7.78-7.78a5.5 5.5 0 0 0 0-7.78z"/>
              </svg>
            </button>
          </div>
        </div>

        <div class="product-info">
          <div class="product-brand">
            ${product.brand?.brandName || 'ZOUND'}
          </div>

          <h3 class="product-name">${product.productName}</h3>

          <div class="product-pricing">
            ${salePrice ? `
              <span class="current-price">₹${salePrice.toLocaleString()}</span>
              ${basePrice > salePrice ? `
                <span class="original-price">₹${basePrice.toLocaleString()}</span>
              ` : ``}
            ` : `<span class="text-red-500">Price Unavailable</span>`}
          </div>

          <a href="/user/products/${product.slug}" class="view-details-btn">
            View Details
          </a>
        </div>
      </div>
    `);
    });
}


// function renderPagination(currentPage, totalPages) {
//     pagination.innerHTML = '';

//     if (currentPage > 1) {
//         pagination.innerHTML += `
//             <button class="page-btn" data-page="${currentPage - 1}">←</button>`;
//     }

//     for (let i = 1; i <= totalPages; i++) {
//         pagination.innerHTML += `
//             <button class="page-btn ${i === currentPage ? 'active' : ''}" data-page="${i}">
//                 ${i}
//             </button>`;
//     }

//     if (currentPage < totalPages) {
//         pagination.innerHTML += `
//             <button class="page-btn" data-page="${currentPage + 1}">→</button>`;
//     }
// }

const activeFiltersContainer = document.getElementById('activeFilters');

function renderActiveFilters() {
    activeFiltersContainer.innerHTML = '';

    const addChip = (label, value, name) => {
        const chip = document.createElement('div');
        chip.className = 'filter-chip';
        chip.innerHTML = `
      ${label}: ${value}
      <button data-name="${name}" data-value="${value}">✕</button>
    `;
        activeFiltersContainer.appendChild(chip);
    };

    // Brand
    document.querySelectorAll('input[name="brand"]:checked')
        .forEach(cb => addChip('Brand', cb.nextElementSibling.innerText, 'brand'));

    // Category
    document.querySelectorAll('input[name="category"]:checked')
        .forEach(cb => addChip('Category', cb.nextElementSibling.innerText, 'category'));

    // Price
    document.querySelectorAll('input[name="priceRange"]:checked')
        .forEach(cb => {
            if (cb.value !== 'all') addChip('Price', cb.value, 'priceRange');
        });

    // Price Range Chip
    const minPrice = Number(minInput.value);
    const maxPrice = Number(maxInput.value);

    if (minPrice > MIN_PRICE || maxPrice < MAX_PRICE) {
        addChip(
            'Price',
            `₹${minPrice.toLocaleString()} – ₹${maxPrice.toLocaleString()}`,
            'price'
        );
    }
}


activeFiltersContainer.addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;

    const { name, value } = btn.dataset;

    document.querySelectorAll(`input[name="${name}"]`).forEach(cb => {
        if (
            cb.value === value ||
            cb.nextElementSibling?.innerText === value
        ) {
            cb.checked = false;
        }
    });

    // Ensure price "all" fallback
    if (name === 'priceRange') {
        const anyChecked = document.querySelectorAll('input[name="priceRange"]:checked').length;
        if (!anyChecked) {
            document.querySelector('input[value="all"]').checked = true;
        }
    }

    if (name === 'price') {
        minRange.value = minInput.value = MIN_PRICE;
        maxRange.value = maxInput.value = MAX_PRICE;
        document.querySelectorAll('.price-preset').forEach(cb => cb.checked = false);
    }

    applyFiltersAndSearch();
});



function updateHeadingPreview() {
    const checkedCategories = [
        ...document.querySelectorAll('input[name="category"]:checked')
    ];

    // Exactly ONE category selected
    if (checkedCategories.length === 1) {
        const cat = checkedCategories[0];
        pageTitleEl.textContent = cat.dataset.name;
        pageDescEl.textContent =
            cat.dataset.description ||
            'Discover premium products in this category.';
        return;
    }

    // Zero or MULTIPLE categories
    pageTitleEl.textContent = DEFAULT_TITLE;
    pageDescEl.textContent = DEFAULT_DESC;
}

function getPriceFromURL() {
    const params = new URLSearchParams(window.location.search);

    const min = params.get('minPrice');
    const max = params.get('maxPrice');

    return {
        min: min ? Number(min) : null,
        max: max ? Number(max) : null
    };
}

// FIlTER PRICE RANGE

const minRange = document.getElementById('priceMinRange');
const maxRange = document.getElementById('priceMaxRange');
const minInput = document.getElementById('priceMinInput');
const maxInput = document.getElementById('priceMaxInput');

const MIN_PRICE = 0;
const MAX_PRICE = 229999;
const GAP = 500;

// INIT FROM URL 
const { min, max } = getPriceFromURL();

if (min !== null || max !== null) {
    minRange.value = minInput.value = min ?? MIN_PRICE;
    maxRange.value = maxInput.value = max ?? MAX_PRICE;
} else {
    minRange.value = minInput.value = MIN_PRICE;
    maxRange.value = maxInput.value = MAX_PRICE;
}


//ACTIVE RANGE FILL
function updateSliderFill() {
    const minPercent = (minRange.value / MAX_PRICE) * 100;
    const maxPercent = (maxRange.value / MAX_PRICE) * 100;

    const slider = document.querySelector('.price-slider');
    if (!slider) return;

    slider.style.setProperty('--min', minPercent);
    slider.style.setProperty('--max', maxPercent);
}


// Sync range → input
minRange.addEventListener('input', () => {
    if (+maxRange.value - +minRange.value < GAP) {
        minRange.value = maxRange.value - GAP;
    }
    minInput.value = minRange.value;

    // reset presets
    document.querySelectorAll('.price-preset').forEach(cb => cb.checked = false);
    updateSliderFill();
});

maxRange.addEventListener('input', () => {
    if (+maxRange.value - +minRange.value < GAP) {
        maxRange.value = +minRange.value + GAP;
    }
    maxInput.value = maxRange.value;

    // reset presets
    document.querySelectorAll('.price-preset').forEach(cb => cb.checked = false);
    updateSliderFill();
});

// Sync input → range
minInput.addEventListener('change', () => {
    minInput.value = Math.max(MIN_PRICE, Math.min(minInput.value, maxRange.value - GAP));
    minRange.value = minInput.value;
    document.querySelectorAll('.price-preset').forEach(cb => cb.checked = false);
    updateSliderFill();

});

maxInput.addEventListener('change', () => {
    maxInput.value = Math.min(MAX_PRICE, Math.max(maxInput.value, +minRange.value + GAP));
    maxRange.value = maxInput.value;
    document.querySelectorAll('.price-preset').forEach(cb => cb.checked = false);
    updateSliderFill();
});

// PRICE PRESET -> SLIDER SYNC
document.querySelectorAll('.price-preset').forEach(cb => {
    cb.addEventListener('change', () => {
        document.querySelectorAll('.price-preset').forEach(c => {
            if (c !== cb) c.checked = false;
        });

        if (cb.checked) {
            minRange.value = minInput.value = cb.dataset.min;
            maxRange.value = maxInput.value = cb.dataset.max;
            updateSliderFill();

        }
    });
});

updateSliderFill();


document.addEventListener('DOMContentLoaded', () => {
    const searchForm = document.getElementById('globalSearchForm');
    const searchInput = document.getElementById('searchInput');

    if (!searchForm || !searchInput) return;

    searchForm.addEventListener('submit', (e) => {
        e.preventDefault();

        const query = searchInput.value.trim();
        const params = new URLSearchParams(window.location.search);

        if (query) {
            params.set('search', query);
        } else {
            params.delete('search');
        }

        params.set('page', 1);

        window.location.href = `/user/products?${params.toString()}`;
    });
});

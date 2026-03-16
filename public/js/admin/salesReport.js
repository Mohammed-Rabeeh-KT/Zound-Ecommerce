// =====================================================
// SALES REPORT PAGE - CLIENT-SIDE LOGIC
// =====================================================

// State
let currentData = { orders: [], summary: {} };
let allOrders = []; // Store all orders for client-side filtering
let currentFilter = 'monthly';

// Chart instances
let salesChart = null;
let revenueChart = null;
let paymentChart = null;
let trendChart = null;
let allProducts = []; // Store products for autocomplete filter

// Initialize on page load
document.addEventListener('DOMContentLoaded', function () {
    // Setup event listener for report type dropdown
    document.getElementById('reportFilter').addEventListener('change', handleFilterChange);

    // Load products for filter dropdown
    loadProducts();

    // Initial data fetch with Monthly
    fetchSalesData();

    // Initialize Lucide icons
    lucide.createIcons();
});

// Handle report type filter change
function handleFilterChange() {
    const filter = document.getElementById('reportFilter').value;
    currentFilter = filter;

    // If custom is selected, show the panel
    if (filter === 'custom') {
        document.getElementById('customFiltersPanel').style.display = 'block';
        return; // Don't auto-fetch, wait for Apply Filters
    }

    // Auto-fetch for preset filters
    fetchSalesData();
}

// Toggle custom filters panel
function toggleCustomFilters() {
    const panel = document.getElementById('customFiltersPanel');
    const isVisible = panel.style.display !== 'none';
    panel.style.display = isVisible ? 'none' : 'block';

    // Re-initialize Lucide icons for the panel
    if (!isVisible) {
        lucide.createIcons();
    }
}

// Load products for filter search
async function loadProducts() {
    try {
        const { data } = await axios.get('/api/admin/sales/products');

        if (data.success && data.products) {
            allProducts = data.products;
            console.log('Products loaded for filter:', allProducts.length);
        }
    } catch (error) {
        console.error('Error loading products for filter:', error);
    }
}

// Search products
document.getElementById('productSearch').addEventListener('input', function (e) {
    const query = e.target.value.toLowerCase();
    const suggestionsDiv = document.getElementById('productSuggestions');

    if (!query) {
        suggestionsDiv.style.display = 'none';
        document.getElementById('productFilter').value = ''; // Clear selected if input cleared
        if (currentFilter !== 'custom') {
            applyClientFilters({ summary: currentData.summary });
        }
        return;
    }

    const filtered = allProducts.filter(p => p.productName.toLowerCase().includes(query));

    if (filtered.length > 0) {
        suggestionsDiv.innerHTML = filtered.map(p =>
            `<div class="suggestion-item" onclick="selectProduct('${p._id}', '${p.productName.replace(/'/g, "\\'")}')">${p.productName}</div>`
        ).join('');
        suggestionsDiv.style.display = 'block';
    } else {
        suggestionsDiv.innerHTML = '<div class="suggestion-item no-results">No products found</div>';
        suggestionsDiv.style.display = 'block';
    }
});

// Select product from suggestions
window.selectProduct = function (id, name) {
    document.getElementById('productSearch').value = name;
    document.getElementById('productFilter').value = id;
    document.getElementById('productSuggestions').style.display = 'none';

    // Apply filtering immediately for responsive feedback
    applyClientFilters({ summary: currentData.summary });
};

// Close suggestions on click outside
document.addEventListener('click', function (e) {
    const container = document.querySelector('.filter-item[style="position: relative;"]');
    if (container && !container.contains(e.target)) {
        document.getElementById('productSuggestions').style.display = 'none';
    }
});

// Apply Filters (from custom filters panel)
function applyFilters() {
    currentFilter = 'custom';
    document.getElementById('reportFilter').value = 'custom';
    fetchSalesData();
}

// Clear Filters
function clearFilters() {
    document.getElementById('productFilter').value = '';
    document.getElementById('productSearch').value = '';
    document.getElementById('startDate').value = '';
    document.getElementById('endDate').value = '';
    document.getElementById('minUnits').value = '';
    document.getElementById('statusFilter').value = '';
    document.getElementById('reportFilter').value = 'monthly';
    currentFilter = 'monthly';
    document.getElementById('customFiltersPanel').style.display = 'none';
    fetchSalesData();
}

// Add event listener for min units change
document.getElementById('minUnits')?.addEventListener('input', function () {
    applyClientFilters({ summary: currentData.summary });
});

// Retry loading products on search focus if list is empty
document.getElementById('productSearch')?.addEventListener('focus', function () {
    if (allProducts.length === 0) {
        loadProducts();
    }
});

// Fetch sales data via AJAX
async function fetchSalesData() {
    const filter = currentFilter;
    const startDate = document.getElementById('startDate')?.value || '';
    const endDate = document.getElementById('endDate')?.value || '';

    // Show loading
    hideAllSections();
    document.getElementById('loadingState').style.display = 'block';

    try {
        const status = document.getElementById('statusFilter')?.value || '';
        const { data } = await axios.get(`/api/admin/sales/data?filter=${filter}&startDate=${startDate}&endDate=${endDate}&status=${status}`);

        if (data.success) {
            allOrders = data.orders || [];
            applyClientFilters(data);
        } else {
            showEmptyState();
        }
    } catch (error) {
        console.error('Error fetching sales data:', error);
        showEmptyState();
    }
}

// Hide all sections
function hideAllSections() {
    document.getElementById('loadingState').style.display = 'none';
    document.getElementById('statsSection').style.display = 'none';
    document.getElementById('chartsSection').style.display = 'none';
    document.getElementById('tableSection').style.display = 'none';
    document.getElementById('emptyState').style.display = 'none';
}

// Show empty state
function showEmptyState() {
    hideAllSections();
    document.getElementById('emptyState').style.display = 'block';
    lucide.createIcons();
}

// Apply client-side filters
function applyClientFilters(data) {
    const productFilter = document.getElementById('productFilter').value;
    const statusFilter = document.getElementById('statusFilter').value;
    const minUnits = parseInt(document.getElementById('minUnits').value) || 0;

    let filteredOrders = [...allOrders];

    // Filter by product (check if order contains the selected product)
    if (productFilter) {
        filteredOrders = filteredOrders.filter(order =>
            order.productIds && order.productIds.includes(productFilter)
        );
    }

    // Filter by status
    if (statusFilter) {
        filteredOrders = filteredOrders.filter(order => order.status === statusFilter);
    }

    // Filter by min units
    if (minUnits > 0) {
        filteredOrders = filteredOrders.filter(order => (order.units || 0) >= minUnits);
    }

    // Recalculate summary for filtered orders
    const filteredSummary = {
        salesCount: filteredOrders.length,
        totalOrderAmount: filteredOrders.reduce((sum, o) => sum + (o.totalPrice || 0), 0),
        offerDiscount: filteredOrders.reduce((sum, o) => sum + (o.offerDiscount || 0), 0),
        couponDeduction: filteredOrders.reduce((sum, o) => sum + (o.couponDiscount || 0), 0),
        netRevenue: filteredOrders.reduce((sum, o) => sum + (o.finalAmount || 0), 0),
        totalDiscount: filteredOrders.reduce((sum, o) => sum + (o.offerDiscount || 0) + (o.couponDiscount || 0), 0),
        dateRange: data?.summary?.dateRange || currentData?.summary?.dateRange
    };

    currentData = { orders: filteredOrders, summary: filteredSummary };
    renderReport(currentData);
}

// Pagination State
let currentPage = 1;
const itemsPerPage = 10;

// Render Report Data
function renderReport(data) {
    const { summary, orders } = data;

    if (!orders || orders.length === 0) {
        showEmptyState();
        return;
    }

    hideAllSections();

    // Update Stats Cards
    document.getElementById('salesCount').innerText = summary.salesCount || 0;
    document.getElementById('orderAmount').innerText = formatCurrency(summary.totalOrderAmount);
    document.getElementById('offerDiscount').innerText = formatCurrency(summary.offerDiscount);
    document.getElementById('couponDeduction').innerText = formatCurrency(summary.couponDeduction);
    document.getElementById('netRevenue').innerText = formatCurrency(summary.netRevenue);

    // Update order count badge
    document.getElementById('orderCountBadge').innerText = `${orders.length} order${orders.length !== 1 ? 's' : ''}`;

    // Render Charts
    renderCharts(data);

    // Render Table with Pagination
    currentPage = 1;
    updatePagination();

    // Show sections
    document.getElementById('statsSection').style.display = 'block';
    document.getElementById('chartsSection').style.display = 'block';
    document.getElementById('tableSection').style.display = 'block';

    lucide.createIcons();
}

// Update Pagination Display
function updatePagination() {
    const orders = currentData.orders; // Use global currentData
    if (!orders) return;

    const totalPages = Math.ceil(orders.length / itemsPerPage);

    // Ensure currentPage is valid
    if (currentPage > totalPages) currentPage = totalPages || 1;
    if (currentPage < 1) currentPage = 1;

    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedOrders = orders.slice(startIndex, endIndex);

    renderTable(paginatedOrders);
    renderPaginationControls(totalPages);
}

// Render Pagination Controls
function renderPaginationControls(totalPages) {
    const container = document.getElementById('paginationControls');
    if (!container) return;

    if (totalPages <= 1) {
        container.style.display = 'none';
        return;
    }

    container.style.display = 'flex';
    let html = '';

    // Previous Button
    html += `<button class="btn-icon btn-sm" style="padding: 0.25rem 0.5rem; border: 1px solid #e2e8f0; border-radius: 4px; background: ${currentPage === 1 ? '#f1f5f9' : 'white'}; cursor: ${currentPage === 1 ? 'default' : 'pointer'}" 
             onclick="changePage(${currentPage - 1})" ${currentPage === 1 ? 'disabled' : ''}>
             <i data-lucide="chevron-left" style="width: 16px; height: 16px;"></i>
             </button>`;

    // Page Numbers
    for (let i = 1; i <= totalPages; i++) {
        if (i === 1 || i === totalPages || (i >= currentPage - 1 && i <= currentPage + 1)) {
            const isActive = currentPage === i;
            html += `<button class="btn-sm" style="padding: 0.25rem 0.75rem; border: 1px solid ${isActive ? '#2563eb' : '#e2e8f0'}; border-radius: 4px; background: ${isActive ? '#eff6ff' : 'white'}; color: ${isActive ? '#2563eb' : '#64748b'}; font-weight: 500;" 
                     onclick="changePage(${i})">${i}</button>`;
        } else if (i === currentPage - 2 || i === currentPage + 2) {
            html += `<span style="color: #94a3b8; padding: 0 0.25rem;">...</span>`;
        }
    }

    // Next Button
    html += `<button class="btn-icon btn-sm" style="padding: 0.25rem 0.5rem; border: 1px solid #e2e8f0; border-radius: 4px; background: ${currentPage === totalPages ? '#f1f5f9' : 'white'}; cursor: ${currentPage === totalPages ? 'default' : 'pointer'}" 
             onclick="changePage(${currentPage + 1})" ${currentPage === totalPages ? 'disabled' : ''}>
             <i data-lucide="chevron-right" style="width: 16px; height: 16px;"></i>
             </button>`;

    container.innerHTML = html;
    lucide.createIcons();
}

// Change Page
window.changePage = function (page) {
    const orders = currentData.orders;
    if (!orders) return;

    const totalPages = Math.ceil(orders.length / itemsPerPage);
    if (page < 1 || page > totalPages) return;

    currentPage = page;
    updatePagination();
};

// Render all charts
function renderCharts(data) {
    const { summary, orders } = data;

    renderSalesChart(summary);
    renderRevenueChart(summary);
    renderPaymentChart(orders);
    renderTrendChart(orders);
}

// Sales Overview Bar Chart
function renderSalesChart(summary) {
    const ctx = document.getElementById('salesChart').getContext('2d');

    if (salesChart) salesChart.destroy();

    salesChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Order Amount', 'Offer Discount', 'Coupon Discount', 'Net Revenue'],
            datasets: [{
                label: 'Amount (₹)',
                data: [
                    summary.totalOrderAmount || 0,
                    summary.offerDiscount || 0,
                    summary.couponDeduction || 0,
                    summary.netRevenue || 0
                ],
                backgroundColor: [
                    'rgba(99, 102, 241, 0.8)',
                    'rgba(249, 115, 22, 0.8)',
                    'rgba(236, 72, 153, 0.8)',
                    'rgba(34, 197, 94, 0.8)'
                ],
                borderColor: [
                    'rgb(99, 102, 241)',
                    'rgb(249, 115, 22)',
                    'rgb(236, 72, 153)',
                    'rgb(34, 197, 94)'
                ],
                borderWidth: 2,
                borderRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: value => '₹' + value.toLocaleString('en-IN')
                    }
                }
            }
        }
    });
}

// Revenue Breakdown Doughnut Chart
function renderRevenueChart(summary) {
    const ctx = document.getElementById('revenueChart').getContext('2d');

    if (revenueChart) revenueChart.destroy();

    const totalDiscount = (summary.offerDiscount || 0) + (summary.couponDeduction || 0);

    revenueChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Net Revenue', 'Total Discount'],
            datasets: [{
                data: [summary.netRevenue || 0, totalDiscount],
                backgroundColor: [
                    'rgba(34, 197, 94, 0.85)',
                    'rgba(239, 68, 68, 0.85)'
                ],
                borderColor: ['rgb(34, 197, 94)', 'rgb(239, 68, 68)'],
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '65%',
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { padding: 15, usePointStyle: true }
                }
            }
        }
    });
}

// Payment Methods Doughnut Chart
function renderPaymentChart(orders) {
    const ctx = document.getElementById('paymentChart').getContext('2d');

    if (paymentChart) paymentChart.destroy();

    // Count payment methods
    const paymentCounts = orders.reduce((acc, order) => {
        acc[order.paymentMethod] = (acc[order.paymentMethod] || 0) + 1;
        return acc;
    }, {});

    paymentChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: Object.keys(paymentCounts),
            datasets: [{
                data: Object.values(paymentCounts),
                backgroundColor: [
                    'rgba(245, 158, 11, 0.85)',
                    'rgba(59, 130, 246, 0.85)',
                    'rgba(139, 92, 246, 0.85)'
                ],
                borderColor: [
                    'rgb(245, 158, 11)',
                    'rgb(59, 130, 246)',
                    'rgb(139, 92, 246)'
                ],
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '65%',
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { padding: 15, usePointStyle: true }
                }
            }
        }
    });
}

// Daily Trend Line Chart
function renderTrendChart(orders) {
    const ctx = document.getElementById('trendChart').getContext('2d');

    if (trendChart) trendChart.destroy();

    // Group orders by date
    const dailyData = orders.reduce((acc, order) => {
        const date = new Date(order.createdOn).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
        if (!acc[date]) {
            acc[date] = { count: 0, revenue: 0 };
        }
        acc[date].count++;
        acc[date].revenue += order.finalAmount || 0;
        return acc;
    }, {});

    const labels = Object.keys(dailyData).reverse();
    const revenueData = labels.map(date => dailyData[date].revenue);
    const countData = labels.map(date => dailyData[date].count);

    trendChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Revenue (₹)',
                    data: revenueData,
                    borderColor: 'rgb(34, 197, 94)',
                    backgroundColor: 'rgba(34, 197, 94, 0.1)',
                    fill: true,
                    tension: 0.4,
                    yAxisID: 'y'
                },
                {
                    label: 'Orders',
                    data: countData,
                    borderColor: 'rgb(99, 102, 241)',
                    backgroundColor: 'rgba(99, 102, 241, 0.1)',
                    fill: false,
                    tension: 0.4,
                    yAxisID: 'y1'
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false
            },
            plugins: {
                legend: {
                    position: 'top',
                    labels: { usePointStyle: true, padding: 15 }
                }
            },
            scales: {
                y: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    ticks: {
                        callback: value => '₹' + value.toLocaleString('en-IN')
                    }
                },
                y1: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    grid: { drawOnChartArea: false }
                }
            }
        }
    });
}

// Render orders table
function renderTable(orders) {
    const tbody = document.getElementById('tableBody');
    tbody.innerHTML = '';

    orders.forEach(order => {
        const row = document.createElement('tr');
        const initials = getInitials(order.customerName);
        const paymentClass = getPaymentClass(order.paymentMethod);
        const statusClass = getStatusClass(order.status);
        let couponText = order.couponApplied;
        if (couponText === true || couponText === 'true') {
            couponText = 'Applied';
        }
        const couponDisplay = (order.couponApplied && order.couponApplied !== 'false') ? `<span class="coupon-badge">${couponText}</span>` : '<span class="no-coupon">-</span>';

        row.innerHTML = `
            <td><span class="order-id">${order.orderId || 'N/A'}</span></td>
            <td class="date-cell">${formatDate(order.createdOn)}</td>
            <td>
                <div class="customer-name">
                    <div class="customer-avatar">${initials}</div>
                    <span>${order.customerName}</span>
                </div>
            </td>
            <td class="text-center"><span class="units-badge">${order.units || 0}</span></td>
            <td><span class="payment-badge ${paymentClass}">${order.paymentMethod}</span></td>
            <td class="text-center"><span class="status-badge ${statusClass}">${order.status}</span></td>
            <td class="text-center">${couponDisplay}</td>
            <td class="text-right amount-positive">${formatCurrency(order.finalAmount)}</td>
            <td class="text-center">
                <button class="btn-view" onclick="openOrderDetail('${order._id}')" title="View Details">
                    <i data-lucide="eye"></i>
                    View
                </button>
            </td>
        `;
        tbody.appendChild(row);
    });

    // Re-initialize Lucide icons for the new buttons
    lucide.createIcons();
}

// Open order detail page
function openOrderDetail(orderId) {
    if (orderId) {
        window.location.href = `/admin/orders/${orderId}`;
    }
}

// Helper Functions
function getInitials(name) {
    if (!name) return 'NA';
    const parts = name.trim().split(' ');
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function getPaymentClass(method) {
    return { 'COD': 'payment-cod', 'Razorpay': 'payment-razorpay', 'Wallet': 'payment-wallet' }[method] || 'payment-cod';
}

function getStatusClass(status) {
    const classes = {
        'Delivered': 'status-delivered',
        'Processing': 'status-processing',
        'Shipped': 'status-shipped',
        'Pending': 'status-pending',
        'Cancelled': 'status-cancelled',
        'Returned': 'status-returned'
    };
    return classes[status] || 'status-pending';
}

function formatCurrency(amount) {
    return '₹' + (parseFloat(amount) || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });
}

function formatDate(dateStr) {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });
}

function getFilterLabel() {
    const summary = currentData.summary;
    if (summary && summary.dateRange && summary.dateRange.start && summary.dateRange.end) {
        const start = formatDate(summary.dateRange.start);
        const end = formatDate(summary.dateRange.end);
        const label = { 'daily': 'Daily', 'weekly': 'Weekly', 'monthly': 'Monthly', 'yearly': 'Yearly' }[currentFilter] || 'Custom Range';
        return `${label} (${start} - ${end})`;
    }
    return { 'daily': 'Today', 'weekly': 'This Week', 'monthly': 'This Month', 'yearly': 'This Year', 'custom': 'Custom Range' }[currentFilter] || currentFilter;
}

function getStatusLabel() {
    const status = document.getElementById('statusFilter')?.value;
    return status || 'All (Delivered, Processing, Shipped, Pending)';
}

function getProductLabel() {
    return document.getElementById('productSearch')?.value || 'All Products';
}

// =====================================================
// PDF DOWNLOAD - Premium Professional Design
// =====================================================
function downloadPDF() {
    if (!currentData.orders?.length) {
        alert('No data available to download.');
        return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const summary = currentData.summary;
    const pageWidth = doc.internal.pageSize.getWidth();

    // Helper function for currency (use Rs. for PDF compatibility)
    const formatPDFCurrency = (amount) => {
        const num = parseFloat(amount) || 0;
        return 'Rs. ' + num.toLocaleString('en-IN', { maximumFractionDigits: 0 });
    };

    // ===== HEADER SECTION =====
    // Brand header background
    doc.setFillColor(37, 99, 235); // Blue
    doc.rect(0, 0, pageWidth, 35, 'F');

    // Company name
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.text('ZOUND', 14, 18);

    // Report title
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text('Sales Report', 14, 28);

    // Report period badge (right side)
    doc.setFontSize(9);
    doc.text(`Period: ${getFilterLabel()}`, pageWidth - 14, 12, { align: 'right' });
    doc.text(`Status: ${getStatusLabel()}`, pageWidth - 14, 19, { align: 'right' });
    doc.text(`Product: ${getProductLabel()}`, pageWidth - 14, 26, { align: 'right' });
    doc.text(`Generated: ${new Date().toLocaleDateString('en-IN', {
        day: '2-digit', month: 'long', year: 'numeric'
    })}`, pageWidth - 14, 33, { align: 'right' });

    // ===== SUMMARY SECTION =====
    let yPos = 50;

    // Summary title
    doc.setTextColor(30, 41, 59);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Summary Overview', 14, yPos);
    yPos += 10;

    // Summary cards (2 rows)
    const cardWidth = 58;
    const cardHeight = 20;
    const cardGap = 6;

    const summaryItems = [
        { label: 'Sales Count', value: summary.salesCount.toString(), color: [59, 130, 246] },
        { label: 'Order Amount', value: formatPDFCurrency(summary.totalOrderAmount), color: [124, 58, 237] },
        { label: 'Offer Discount', value: formatPDFCurrency(summary.offerDiscount), color: [249, 115, 22] }
    ];

    const summaryItems2 = [
        { label: 'Coupon Deduction', value: formatPDFCurrency(summary.couponDeduction), color: [236, 72, 153] },
        { label: 'Total Discount', value: formatPDFCurrency(summary.totalDiscount || 0), color: [239, 68, 68] },
        { label: 'Net Revenue', value: formatPDFCurrency(summary.netRevenue), color: [34, 197, 94] }
    ];

    // Draw first row of cards
    summaryItems.forEach((item, i) => {
        const x = 14 + (cardWidth + cardGap) * i;
        // Card background
        doc.setFillColor(248, 250, 252);
        doc.roundedRect(x, yPos, cardWidth, cardHeight, 3, 3, 'F');
        // Left color bar
        doc.setFillColor(...item.color);
        doc.rect(x, yPos, 3, cardHeight, 'F');
        // Label
        doc.setTextColor(100, 116, 139);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.text(item.label, x + 8, yPos + 7);
        // Value
        doc.setTextColor(30, 41, 59);
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text(item.value, x + 8, yPos + 15);
    });

    yPos += cardHeight + 5;

    // Draw second row of cards
    summaryItems2.forEach((item, i) => {
        const x = 14 + (cardWidth + cardGap) * i;
        doc.setFillColor(248, 250, 252);
        doc.roundedRect(x, yPos, cardWidth, cardHeight, 3, 3, 'F');
        doc.setFillColor(...item.color);
        doc.rect(x, yPos, 3, cardHeight, 'F');
        doc.setTextColor(100, 116, 139);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.text(item.label, x + 8, yPos + 7);
        doc.setTextColor(30, 41, 59);
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text(item.value, x + 8, yPos + 15);
    });

    yPos += cardHeight + 15;

    // ===== ORDER DETAILS TABLE =====
    doc.setTextColor(30, 41, 59);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Order Details', 14, yPos);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text(`(${currentData.orders.length} orders)`, 55, yPos);
    yPos += 5;

    // Table data
    const tableRows = currentData.orders.map(order => [
        order.orderId || '-',
        formatDate(order.createdOn),
        order.customerName || 'Guest',
        (order.units || 0).toString(),
        order.paymentMethod || 'N/A',
        formatPDFCurrency(order.finalAmount),
        order.status || 'N/A'
    ]);

    doc.autoTable({
        head: [['Order ID', 'Date', 'Customer', 'Units', 'Payment', 'Amount', 'Status']],
        body: tableRows,
        startY: yPos,
        theme: 'plain',
        headStyles: {
            fillColor: [241, 245, 249],
            textColor: [71, 85, 105],
            fontStyle: 'bold',
            fontSize: 8,
            cellPadding: 4
        },
        bodyStyles: {
            fontSize: 8,
            cellPadding: 3,
            textColor: [51, 65, 85]
        },
        alternateRowStyles: {
            fillColor: [248, 250, 252]
        },
        columnStyles: {
            0: { cellWidth: 28 },
            1: { cellWidth: 22 },
            2: { cellWidth: 35 },
            3: { halign: 'center', cellWidth: 15 },
            4: { cellWidth: 22 },
            5: { halign: 'right', cellWidth: 28, fontStyle: 'bold', textColor: [34, 197, 94] },
            6: { cellWidth: 24 }
        },
        margin: { left: 14, right: 14 },
        didDrawPage: function (data) {
            // Footer on each page
            const pageCount = doc.internal.getNumberOfPages();
            doc.setFontSize(8);
            doc.setTextColor(150);
            doc.text(
                `Page ${data.pageNumber} of ${pageCount}`,
                pageWidth / 2,
                doc.internal.pageSize.getHeight() - 10,
                { align: 'center' }
            );
            doc.text(
                'Generated by ZOUND Admin',
                14,
                doc.internal.pageSize.getHeight() - 10
            );
        }
    });

    // Save
    doc.save(`ZOUND_Sales_Report_${currentFilter.toUpperCase()}.pdf`);
}

// =====================================================
// EXCEL DOWNLOAD - Professional Format
// =====================================================
function downloadExcel() {
    if (!currentData.orders?.length) {
        alert('No data available to download.');
        return;
    }

    const summary = currentData.summary;

    // Helper function for currency formatting
    const formatExcelCurrency = (amount) => {
        const num = parseFloat(amount) || 0;
        return 'Rs. ' + num.toLocaleString('en-IN', { maximumFractionDigits: 0 });
    };

    // Build worksheet data
    const wsData = [
        // Header Section
        ['ZOUND ELECTRONICS'],
        ['Sales Report'],
        [''],
        ['Report Period:', getFilterLabel()],
        ['Order Status:', getStatusLabel()],
        ['Product Filter:', getProductLabel()],
        ['Generated On:', new Date().toLocaleDateString('en-IN', {
            weekday: 'long',
            day: '2-digit',
            month: 'long',
            year: 'numeric'
        })],
        ['Total Orders:', summary.salesCount],
        [''],

        // Summary Section
        ['SUMMARY'],
        ['Metric', 'Value'],
        ['Total Order Amount', formatExcelCurrency(summary.totalOrderAmount)],
        ['Offer Discount', formatExcelCurrency(summary.offerDiscount)],
        ['Coupon Deduction', formatExcelCurrency(summary.couponDeduction)],
        ['Total Discount', formatExcelCurrency((summary.offerDiscount || 0) + (summary.couponDeduction || 0))],
        ['Net Revenue', formatExcelCurrency(summary.netRevenue)],
        [''],

        // Order Details Section
        ['ORDER DETAILS'],
        ['S.No', 'Order ID', 'Date', 'Customer Name', 'Units', 'Payment Method', 'Amount', 'Status']
    ];

    // Add order rows with serial numbers
    currentData.orders.forEach((order, index) => {
        wsData.push([
            index + 1,
            order.orderId || '-',
            formatDate(order.createdOn),
            order.customerName || 'Guest',
            order.units || 0,
            order.paymentMethod || 'N/A',
            formatExcelCurrency(order.finalAmount),
            order.status || 'N/A'
        ]);
    });

    // Add totals row
    wsData.push([]);
    const totalUnits = currentData.orders.reduce((sum, o) => sum + (o.units || 0), 0);
    wsData.push([
        '',
        'TOTAL',
        '',
        `${currentData.orders.length} Orders`,
        totalUnits,
        '',
        formatExcelCurrency(summary.netRevenue),
        ''
    ]);

    // Create worksheet
    const ws = XLSX.utils.aoa_to_sheet(wsData);

    // Set column widths
    ws['!cols'] = [
        { wch: 6 },   // S.No
        { wch: 18 },  // Order ID
        { wch: 14 },  // Date
        { wch: 22 },  // Customer Name
        { wch: 8 },   // Units
        { wch: 16 },  // Payment Method
        { wch: 16 },  // Amount
        { wch: 12 }   // Status
    ];

    // Merge header cells
    ws['!merges'] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: 3 } },  // Company name
        { s: { r: 1, c: 0 }, e: { r: 1, c: 3 } },  // Report title
        { s: { r: 7, c: 0 }, e: { r: 7, c: 3 } },  // Summary header
        { s: { r: 16, c: 0 }, e: { r: 16, c: 3 } } // Order details header
    ];

    // Create workbook
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Sales Report');

    // Save file
    XLSX.writeFile(wb, `ZOUND_Sales_Report_${currentFilter.toUpperCase()}.xlsx`);
}


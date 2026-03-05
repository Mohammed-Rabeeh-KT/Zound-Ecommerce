document.addEventListener('DOMContentLoaded', () => {
    let salesChartInstance = null;

    // =============================================
    // SALES OVERVIEW CHART
    // =============================================
    function initSalesChart(data) {
        const salesChartCanvas = document.getElementById('salesChart');
        if (!salesChartCanvas) return;

        const salesCtx = salesChartCanvas.getContext('2d');

        // Destroy existing chart if exists
        if (salesChartInstance) {
            salesChartInstance.destroy();
        }

        // Create gradient
        const gradient = salesCtx.createLinearGradient(0, 0, 0, 280);
        gradient.addColorStop(0, 'rgba(44, 90, 160, 0.3)');
        gradient.addColorStop(1, 'rgba(44, 90, 160, 0.02)');

        salesChartInstance = new Chart(salesCtx, {
            type: 'line',
            data: {
                labels: data.labels,
                datasets: [{
                    data: data.values,
                    borderColor: '#2c5aa0',
                    backgroundColor: gradient,
                    borderWidth: 2.5,
                    tension: 0.4,
                    pointRadius: 4,
                    pointHoverRadius: 6,
                    pointBackgroundColor: '#2c5aa0',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    intersect: false,
                    mode: 'index'
                },
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: '#1a1a2e',
                        titleColor: '#fff',
                        bodyColor: '#e0e0e0',
                        padding: 12,
                        cornerRadius: 8,
                        displayColors: false,
                        callbacks: {
                            label: function (context) {
                                return '₹' + context.parsed.y.toLocaleString('en-IN');
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(0,0,0,0.06)',
                            drawBorder: false
                        },
                        ticks: {
                            callback: function (value) {
                                if (value >= 100000) return '₹' + (value / 100000).toFixed(1) + 'L';
                                if (value >= 1000) return '₹' + (value / 1000).toFixed(1) + 'K';
                                return '₹' + value.toLocaleString('en-IN');
                            },
                            font: { size: 11 },
                            color: '#888'
                        }
                    },
                    x: {
                        grid: { display: false },
                        ticks: {
                            font: { size: 11 },
                            color: '#888',
                            maxRotation: 45,
                            minRotation: 0
                        }
                    }
                }
            }
        });
    }

    // Init with default data
    if (typeof window.salesData !== 'undefined') {
        initSalesChart(window.salesData);
    }

    // =============================================
    // CHART FILTER FUNCTIONALITY
    // =============================================
    window.changeChartFilter = async function (filter) {
        // Update active button
        document.querySelectorAll('.chart-filter-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`.chart-filter-btn[data-filter="${filter}"]`)?.classList.add('active');

        try {
            const { data: result } = await axios.get(`/api/admin/dashboard/chart-data?filter=${filter}`);

            if (result.success && result.data.salesChartData) {
                initSalesChart(result.data.salesChartData);
            }
        } catch (error) {
            console.error('Error fetching chart data:', error);
        }
    };

    // =============================================
    // CATEGORY CHART
    // =============================================
    const categoryChartCanvas = document.getElementById('categoryChart');
    if (categoryChartCanvas && typeof window.categoryData !== 'undefined') {
        const categoryCtx = categoryChartCanvas.getContext('2d');
        const categoryData = window.categoryData;

        const categoryColors = [
            '#4c8bf5', '#f97316', '#10b981', '#8b5cf6', '#ec4899',
            '#06b6d4', '#eab308', '#ef4444', '#14b8a6', '#6366f1'
        ];

        new Chart(categoryCtx, {
            type: 'doughnut',
            data: {
                labels: categoryData.labels,
                datasets: [{
                    data: categoryData.values,
                    backgroundColor: categoryColors.slice(0, categoryData.labels.length),
                    borderWidth: 2,
                    borderColor: '#fff',
                    hoverBorderWidth: 3,
                    hoverOffset: 8
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '55%',
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            padding: 16,
                            usePointStyle: true,
                            pointStyle: 'circle',
                            font: { size: 12 }
                        }
                    },
                    tooltip: {
                        backgroundColor: '#1a1a2e',
                        titleColor: '#fff',
                        bodyColor: '#e0e0e0',
                        padding: 12,
                        cornerRadius: 8,
                        callbacks: {
                            label: function (context) {
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = total > 0 ? ((context.parsed / total) * 100).toFixed(1) : 0;
                                return `${context.label}: ₹${context.parsed.toLocaleString('en-IN')} (${percentage}%)`;
                            }
                        }
                    }
                }
            }
        });
    }

    // =============================================
    // BEST SELLING TABS
    // =============================================
    window.switchBestSellingTab = function (tab) {
        // Update tab buttons
        document.querySelectorAll('.best-tab').forEach(btn => btn.classList.remove('active'));
        document.querySelector(`.best-tab[data-tab="${tab}"]`)?.classList.add('active');

        // Update tab content
        document.querySelectorAll('.best-selling-content').forEach(content => content.classList.remove('active'));
        document.getElementById(`tab-${tab}`)?.classList.add('active');
    };
});

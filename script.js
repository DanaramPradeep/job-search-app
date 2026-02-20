// API Configuration
const BASE_URL = 'https://remotive.com/api';

// DOM Elements
const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');
const jobsGrid = document.getElementById('jobsGrid');
const loader = document.getElementById('loader');
const errorMessage = document.getElementById('errorMessage');
const noResults = document.getElementById('noResults');
const resultsTitle = document.getElementById('resultsTitle');
const resultsCount = document.getElementById('resultsCount');
const jobModal = document.getElementById('jobModal');
const modalBody = document.getElementById('modalBody');
const modalClose = document.getElementById('modalClose');
const favoritesModal = document.getElementById('favoritesModal');
const favoritesBody = document.getElementById('favoritesBody');
const favoritesClose = document.getElementById('favoritesClose');
const favoritesBtn = document.getElementById('favoritesBtn');
const favoritesCount = document.getElementById('favoritesCount');
const themeToggle = document.getElementById('themeToggle');
const categoryFilter = document.getElementById('categoryFilter');
const jobTypeFilter = document.getElementById('jobTypeFilter');
const locationFilter = document.getElementById('locationFilter');
const companyFilter = document.getElementById('companyFilter');
const sortBy = document.getElementById('sortBy');
const clearFiltersBtn = document.getElementById('clearFiltersBtn');
const activeFiltersSection = document.getElementById('activeFiltersSection');
const activeFiltersList = document.getElementById('activeFiltersList');
const loadMoreBtn = document.getElementById('loadMoreBtn');
const loadMoreSection = document.getElementById('loadMoreSection');
const retryBtn = document.getElementById('retryBtn');
const toast = document.getElementById('toast');
const toastMessage = document.getElementById('toastMessage');

// State
let allJobs = [];
let displayedJobs = [];
let currentSearch = '';
let currentCategory = '';
let currentJobType = '';
let currentLocation = '';
let currentCompany = '';
let currentSort = 'date';
let favorites = JSON.parse(localStorage.getItem('jobFavorites')) || [];
let jobsPerPage = 12;
let currentPage = 1;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadJobs();
    setupEventListeners();
    updateFavoritesCount();
    loadTheme();
});

// Setup Event Listeners
function setupEventListeners() {
    // Search
    searchBtn.addEventListener('click', handleSearch);
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleSearch();
    });
    searchInput.addEventListener('input', debounce(handleSearchInput, 500));

    // Filters
    categoryFilter.addEventListener('change', handleFilterChange);
    jobTypeFilter.addEventListener('change', handleFilterChange);
    locationFilter.addEventListener('input', debounce(handleFilterChange, 500));
    companyFilter.addEventListener('input', debounce(handleFilterChange, 500));
    sortBy.addEventListener('change', handleSortChange);
    clearFiltersBtn.addEventListener('click', clearFilters);

    // Load More
    loadMoreBtn.addEventListener('click', loadMoreJobs);

    // Retry
    retryBtn.addEventListener('click', loadJobs);

    // Modal
    modalClose.addEventListener('click', closeModal);
    jobModal.addEventListener('click', (e) => {
        if (e.target === jobModal) closeModal();
    });

    // Favorites Modal
    favoritesClose.addEventListener('click', closeFavoritesModal);
    favoritesModal.addEventListener('click', (e) => {
        if (e.target === favoritesModal) closeFavoritesModal();
    });

    favoritesBtn.addEventListener('click', showFavorites);

    // Theme Toggle
    themeToggle.addEventListener('click', toggleTheme);

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeModal();
            closeFavoritesModal();
        }
    });
}

// Debounce function
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Load Jobs from API
async function loadJobs(search = '') {
    showLoader();
    hideError();
    hideNoResults();
    hideLoadMore();

    try {
        let url = `${BASE_URL}/remote-jobs`;
        if (search) {
            url += `?search=${encodeURIComponent(search)}`;
        }

        const response = await fetch(url);
        const data = await response.json();

        if (data.jobs && data.jobs.length > 0) {
            allJobs = data.jobs;
            currentSearch = search;
            currentPage = 1;
            applyFiltersAndSort();
            updateResultsTitle(search);
        } else {
            showNoResults();
            clearJobs();
        }
    } catch (error) {
        console.error('Error fetching jobs:', error);
        showError();
    } finally {
        hideLoader();
    }
}

// Handle Search
function handleSearch() {
    const query = searchInput.value.trim();
    loadJobs(query);
}

// Handle Search Input (for dynamic filtering)
function handleSearchInput() {
    const query = searchInput.value.trim();
    if (query.length >= 2 || query.length === 0) {
        loadJobs(query);
    }
}

// Handle Filter Change
function handleFilterChange() {
    currentCategory = categoryFilter.value;
    currentJobType = jobTypeFilter.value;
    currentLocation = locationFilter.value.trim().toLowerCase();
    currentCompany = companyFilter.value.trim().toLowerCase();
    
    currentPage = 1;
    applyFiltersAndSort();
    updateActiveFilters();
}

// Handle Sort Change
function handleSortChange() {
    currentSort = sortBy.value;
    currentPage = 1;
    applyFiltersAndSort();
}

// Apply Filters and Sort
function applyFiltersAndSort() {
    let filtered = [...allJobs];

    // Apply category filter
    if (currentCategory) {
        filtered = filtered.filter(job => 
            job.category && job.category.toLowerCase().includes(currentCategory.toLowerCase())
        );
    }

    // Apply job type filter
    if (currentJobType) {
        filtered = filtered.filter(job => 
            job.job_type && job.job_type.toLowerCase().includes(currentJobType.toLowerCase())
        );
    }

    // Apply location filter
    if (currentLocation) {
        filtered = filtered.filter(job => 
            job.candidate_required_location && 
            job.candidate_required_location.toLowerCase().includes(currentLocation)
        );
    }

    // Apply company filter
    if (currentCompany) {
        filtered = filtered.filter(job => 
            job.company_name && job.company_name.toLowerCase().includes(currentCompany)
        );
    }

    // Apply sorting
    switch (currentSort) {
        case 'company':
            filtered.sort((a, b) => (a.company_name || '').localeCompare(b.company_name || ''));
            break;
        case 'title':
            filtered.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
            break;
        case 'date':
        default:
            filtered.sort((a, b) => new Date(b.published_at) - new Date(a.published_at));
            break;
    }

    displayedJobs = filtered;
    
    // Show limited jobs per page
    const startIndex = 0;
    const endIndex = currentPage * jobsPerPage;
    const jobsToShow = filtered.slice(startIndex, endIndex);

    if (jobsToShow.length === 0) {
        showNoResults();
        clearJobs();
    } else {
        displayJobs(jobsToShow);
        updateResultsCount(filtered.length);
        
        // Show load more if there are more jobs
        if (endIndex < filtered.length) {
            showLoadMore();
        } else {
            hideLoadMore();
        }
    }
}

// Load More Jobs
function loadMoreJobs() {
    currentPage++;
    const startIndex = 0;
    const endIndex = currentPage * jobsPerPage;
    const jobsToShow = displayedJobs.slice(startIndex, endIndex);
    
    displayJobs(jobsToShow);
    
    if (endIndex >= displayedJobs.length) {
        hideLoadMore();
    }
}

// Display Jobs
function displayJobs(jobs) {
    // Clear existing jobs if it's the first page
    if (currentPage === 1) {
        clearJobs();
    }
    
    if (!jobs || jobs.length === 0) {
        showNoResults();
        return;
    }

    jobs.forEach((job, index) => {
        const card = createJobCard(job, index);
        jobsGrid.appendChild(card);
    });
}

// Create Job Card
function createJobCard(job, index) {
    const card = document.createElement('div');
    card.className = 'job-card';
    card.style.animationDelay = `${index * 0.05}s`;

    const isFavorite = favorites.some(f => f.id === job.id);

    card.innerHTML = `
        <button class="favorite-btn ${isFavorite ? 'active' : ''}" data-id="${job.id}">
            <i class="fas fa-heart"></i>
        </button>
        <div class="job-card-header">
            <div class="company-logo">
                ${job.company_logo ? `<img src="${job.company_logo}" alt="${job.company_name}" loading="lazy">` : '<i class="fas fa-building"></i>'}
            </div>
            <div class="job-card-title-section">
                <h3 class="job-card-title">${job.title}</h3>
                <p class="company-name"><i class="fas fa-building"></i> ${job.company_name}</p>
            </div>
        </div>
        <div class="job-card-body">
            <span class="job-tag remote"><i class="fas fa-home"></i> Remote</span>
            ${job.job_type ? `<span class="job-tag"><i class="fas fa-clock"></i> ${formatJobType(job.job_type)}</span>` : ''}
            ${job.salary ? `<span class="job-tag salary"><i class="fas fa-dollar-sign"></i> ${job.salary}</span>` : ''}
            ${job.category ? `<span class="job-tag"><i class="fas fa-tag"></i> ${job.category}</span>` : ''}
        </div>
        <div class="job-card-footer">
            <span class="posted-date"><i class="fas fa-calendar-alt"></i> ${formatDate(job.published_at)}</span>
            <a href="${job.url}" target="_blank" class="apply-btn" onclick="event.stopPropagation();">Apply Now</a>
        </div>
    `;

    // Event Listeners
    const favoriteBtn = card.querySelector('.favorite-btn');
    favoriteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleFavorite(job);
    });

    card.addEventListener('click', () => {
        openJobDetails(job);
    });

    return card;
}

// Open Job Details Modal
function openJobDetails(job) {
    jobModal.classList.add('show');
    document.body.style.overflow = 'hidden';

    const isFavorite = favorites.some(f => f.id === job.id);

    modalBody.innerHTML = `
        <div class="job-details-header">
            <div class="job-details-logo">
                ${job.company_logo ? `<img src="${job.company_logo}" alt="${job.company_name}">` : '<i class="fas fa-building"></i>'}
            </div>
            <div class="job-details-title-section">
                <h2>${job.title}</h2>
                <p class="job-details-company">${job.company_name}</p>
                <div class="job-details-tags">
                    ${job.category ? `<span class="job-tag"><i class="fas fa-tag"></i> ${job.category}</span>` : ''}
                    ${job.job_type ? `<span class="job-tag"><i class="fas fa-clock"></i> ${formatJobType(job.job_type)}</span>` : ''}
                </div>
            </div>
        </div>
        
        <div class="job-details-meta">
            <span><i class="fas fa-map-marker-alt"></i> ${job.candidate_required_location || 'Worldwide'}</span>
            ${job.salary ? `<span><i class="fas fa-dollar-sign"></i> ${job.salary}</span>` : ''}
            <span><i class="fas fa-calendar-alt"></i> ${formatDate(job.published_at)}</span>
        </div>

        <div class="job-details-section">
            <h3>Job Description</h3>
            <div>${job.description || 'No description available'}</div>
        </div>

        ${job.requirements && job.requirements.length > 0 ? `
            <div class="job-details-section">
                <h3>Requirements</h3>
                <ul>
                    ${job.requirements.map(req => `<li>${req}</li>`).join('')}
                </ul>
            </div>
        ` : ''}

        <div class="job-details-section">
            <h3>How to Apply</h3>
            <p>Click the button below to apply for this position. You will be redirected to the company's website.</p>
        </div>

        <a href="${job.url}" target="_blank" class="modal-apply-btn">
            <i class="fas fa-external-link-alt"></i> Apply for this Job
        </a>

        <button class="favorite-btn-modal ${isFavorite ? 'active' : ''}" data-id="${job.id}" style="position: absolute; top: 1rem; right: 4rem; width: 36px; height: 36px; border-radius: 50%; background: var(--bg-input); border: 1px solid var(--border-color); color: var(--text-light); cursor: pointer; display: flex; align-items: center; justify-content: center;">
            <i class="fas fa-heart"></i>
        </button>
    `;

    // Add favorite button event listener in modal
    const modalFavoriteBtn = modalBody.querySelector('.favorite-btn-modal');
    if (modalFavoriteBtn) {
        modalFavoriteBtn.addEventListener('click', () => {
            toggleFavorite(job);
            const newIsFavorite = favorites.some(f => f.id === job.id);
            modalFavoriteBtn.classList.toggle('active', newIsFavorite);
            modalFavoriteBtn.style.color = newIsFavorite ? 'var(--danger-color)' : 'var(--text-light)';
        });
    }
}

// Close Modal
function closeModal() {
    jobModal.classList.remove('show');
    document.body.style.overflow = 'auto';
}

// Toggle Favorite
function toggleFavorite(job) {
    const index = favorites.findIndex(f => f.id === job.id);
    
    if (index > -1) {
        favorites.splice(index, 1);
        showToast('Removed from favorites');
    } else {
        favorites.push(job);
        showToast('Added to favorites');
    }
    
    localStorage.setItem('jobFavorites', JSON.stringify(favorites));
    updateFavoritesCount();
    
    // Update current view
    applyFiltersAndSort();
}

// Update Favorites Count
function updateFavoritesCount() {
    favoritesCount.textContent = favorites.length;
}

// Show Favorites Modal
function showFavorites() {
    favoritesModal.classList.add('show');
    document.body.style.overflow = 'hidden';
    displayFavorites();
}

// Display Favorites
function displayFavorites() {
    if (favorites.length === 0) {
        favoritesBody.innerHTML = `
            <div class="favorites-empty">
                <i class="fas fa-heart"></i>
                <h3>No favorites yet</h3>
                <p>Start adding jobs to your favorites!</p>
            </div>
        `;
        return;
    }

    favoritesBody.innerHTML = `
        <div class="favorites-grid">
            ${favorites.map((job, index) => createJobCard(job, index)).join('')}
        </div>
    `;

    // Add event listeners
    favoritesBody.querySelectorAll('.favorite-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const job = favorites.find(f => f.id === btn.dataset.id);
            if (job) {
                toggleFavorite(job);
                displayFavorites();
            }
        });
    });

    favoritesBody.querySelectorAll('.job-card').forEach(card => {
        card.addEventListener('click', () => {
            const job = favorites.find(f => f.id === card.querySelector('.favorite-btn').dataset.id);
            if (job) {
                closeFavoritesModal();
                openJobDetails(job);
            }
        });
    });
}

// Close Favorites Modal
function closeFavoritesModal() {
    favoritesModal.classList.remove('show');
    document.body.style.overflow = 'auto';
}

// Clear Filters
function clearFilters() {
    categoryFilter.value = '';
    jobTypeFilter.value = '';
    locationFilter.value = '';
    companyFilter.value = '';
    searchInput.value = '';
    sortBy.value = 'date';
    
    currentCategory = '';
    currentJobType = '';
    currentLocation = '';
    currentCompany = '';
    currentSearch = '';
    currentSort = 'date';
    currentPage = 1;
    
    loadJobs();
    updateActiveFilters();
}

// Update Active Filters
function updateActiveFilters() {
    const activeFilters = [];
    
    if (currentCategory) {
        activeFilters.push({ type: 'category', value: currentCategory, label: `Category: ${getCategoryLabel(currentCategory)}` });
    }
    if (currentJobType) {
        activeFilters.push({ type: 'jobType', value: currentJobType, label: `Type: ${formatJobType(currentJobType)}` });
    }
    if (currentLocation) {
        activeFilters.push({ type: 'location', value: currentLocation, label: `Location: ${currentLocation}` });
    }
    if (currentCompany) {
        activeFilters.push({ type: 'company', value: currentCompany, label: `Company: ${currentCompany}` });
    }

    if (activeFilters.length > 0) {
        activeFiltersSection.classList.add('show');
        activeFiltersList.innerHTML = activeFilters.map(filter => `
            <span class="filter-tag">
                ${filter.label}
                <button onclick="removeFilter('${filter.type}', '${filter.value}')">&times;</button>
            </span>
        `).join('');
    } else {
        activeFiltersSection.classList.remove('show');
    }
}

// Remove Filter (global function for onclick)
window.removeFilter = function(type, value) {
    switch(type) {
        case 'category':
            categoryFilter.value = '';
            currentCategory = '';
            break;
        case 'jobType':
            jobTypeFilter.value = '';
            currentJobType = '';
            break;
        case 'location':
            locationFilter.value = '';
            currentLocation = '';
            break;
        case 'company':
            companyFilter.value = '';
            currentCompany = '';
            break;
    }
    currentPage = 1;
    applyFiltersAndSort();
    updateActiveFilters();
};

// Helper Functions
function formatJobType(type) {
    if (!type) return '';
    return type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

function formatDate(dateString) {
    if (!dateString) return 'Recently';
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
    return `${Math.floor(diffDays / 365)} years ago`;
}

function getCategoryLabel(category) {
    const labels = {
        'software-dev': 'Software Development',
        'customer-service': 'Customer Service',
        'design': 'Design',
        'marketing': 'Marketing',
        'sales': 'Sales',
        'product': 'Product',
        'data': 'Data',
        'devops': 'DevOps',
        'finance': 'Finance',
        'hr': 'Human Resources'
    };
    return labels[category] || category;
}

function updateResultsTitle(search) {
    if (search) {
        resultsTitle.textContent = `Search Results: "${search}"`;
    } else {
        resultsTitle.textContent = 'Remote Jobs';
    }
}

function updateResultsCount(count) {
    resultsCount.textContent = `${count} job${count !== 1 ? 's' : ''} found`;
}

// Clear Jobs
function clearJobs() {
    jobsGrid.innerHTML = '';
}

// Show/Hide Functions
function showLoader() {
    loader.style.display = 'flex';
}

function hideLoader() {
    loader.style.display = 'none';
}

function showError() {
    errorMessage.style.display = 'block';
    hideNoResults();
}

function hideError() {
    errorMessage.style.display = 'none';
}

function showNoResults() {
    noResults.style.display = 'block';
}

function hideNoResults() {
    noResults.style.display = 'none';
}

function showLoadMore() {
    loadMoreSection.classList.add('show');
}

function hideLoadMore() {
    loadMoreSection.classList.remove('show');
}

// Toast
function showToast(message) {
    toastMessage.textContent = message;
    toast.classList.add('show');
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// Theme Toggle
function toggleTheme() {
    const currentTheme = document.body.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    document.body.setAttribute('data-theme', newTheme);
    localStorage.setItem('jobHuntTheme', newTheme);
    
    // Update icon
    const icon = themeToggle.querySelector('i');
    icon.className = newTheme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
}

// Load Theme
function loadTheme() {
    const savedTheme = localStorage.getItem('jobHuntTheme') || 'light';
    document.body.setAttribute('data-theme', savedTheme);
    
    const icon = themeToggle.querySelector('i');
    icon.className = savedTheme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
}

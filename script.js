let usdToPkrRate = 278; // Default fallback rate
async function fetchConversionRate() {
    try {
        const response = await fetch(
            "https://v6.exchangerate-api.com/v6/dd469c4556431d9b5576d5f2/latest/USD"
        );
        const data = await response.json();
        usdToPkrRate = data.conversion_rates.PKR;
        console.log(`Updated exchange rate: 1 USD = ${usdToPkrRate} PKR`);
    } catch (error) {
        console.error("Failed to fetch USD to PKR rate:", error);
        usdToPkrRate = 278.41; // Fallback rate
    }
}

class ListingManager {
    constructor() {
        // DOM Element References
        this.listingsGrid = document.getElementById('listings-grid');
        this.loadingContainer = document.getElementById('loading');
        this.errorContainer = document.getElementById('error-container');
        this.searchInput = document.getElementById('search-input');
        this.currencyToggle = document.getElementById('currency-toggle');

        // State Variables
        this.listings = [];
        this.currentCurrency = 'PKR';

        // Setup Event Listeners
        this.setupEventListeners();
    }

    setupEventListeners() {
        this.searchInput.addEventListener('input', this.handleSearch.bind(this));
        
        // Currency Toggle Event Listener
        if (this.currencyToggle) {
            this.currencyToggle.addEventListener('change', this.toggleCurrency.bind(this));
        }
    }

    toggleCurrency() {
        this.currentCurrency = this.currentCurrency === 'USD' ? 'PKR' : 'USD';
        this.renderListings(this.listings);
    }

    handleSearch(event) {
        const searchTerm = event.target.value.toLowerCase();
        const filteredListings = this.listings.filter(listing => 
            listing.name.toLowerCase().includes(searchTerm) ||
            listing.description.toLowerCase().includes(searchTerm)
        );
        this.renderListings(filteredListings);
    }

    async fetchListings() {
        try {
            // Fetch conversion rate
            await fetchConversionRate();

            this.showLoading(true);
            this.hideError();

            // Fetch listings
            const response = await fetch('/api/listings');
            if (!response.ok) throw new Error('Failed to fetch listings');

            this.listings = await response.json();
            this.renderListings(this.listings);
            this.showLoading(false);
        } catch (error) {
            this.showError(error.message);
            this.showLoading(false);
        }
    }

    renderListings(listings) {
        this.listingsGrid.innerHTML = '';

        if (listings.length === 0) {
            this.showError('No listings found');
            return;
        }

        listings.forEach(listing => {
            const card = this.createListingCard(listing);
            this.listingsGrid.appendChild(card);
        });
    }

    createListingCard(listing) {
        const card = document.createElement('div');
        card.classList.add('listing-card');

        // Image Creation
        const image = document.createElement('img');
        image.src = this.getListingImage(listing);
        image.alt = listing.name;
        image.classList.add('listing-image');
        image.onerror = () => {
            image.src = 'https://via.placeholder.com/300';
        };

        // Details Container
        const details = document.createElement('div');
        details.classList.add('listing-details');

        // Title
        const title = document.createElement('div');
        title.classList.add('listing-title');
        title.textContent = listing.name;

        // Price 
        const price = document.createElement('div');
        price.classList.add('listing-price');
        
        // Price Conversion Logic
        const priceInUSD = parseFloat(listing.price.replace('$', ''));
        const priceInPKR = (priceInUSD * usdToPkrRate).toFixed(0);
        
        price.textContent = this.currentCurrency === 'USD' 
            ? `$${priceInUSD.toFixed(2)}` 
            : `PKR ${priceInPKR}`;

        details.appendChild(title);
        details.appendChild(price);

        card.appendChild(image);
        card. appendChild(details);
        return card;
    }

    getListingImage(listing) {
        return idToImageUrlMap[listing.id] || 'https://via.placeholder.com/300';
    }

    showLoading(isLoading) {
        this.loadingContainer.style.display = isLoading ? 'block' : 'none';
    }

    showError(message) {
        this.errorContainer.textContent = message;
        this.errorContainer.style.display = 'block';
    }

    hideError() {
        this.errorContainer.style.display = 'none';
    }
}

// Initialize the ListingManager and fetch listings
const listingManager = new ListingManager();
listingManager.fetchListings(); 
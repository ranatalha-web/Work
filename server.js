import express from 'express';
import cors from 'cors';
import axios from 'axios';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class HostawayListingManager {
    constructor() {
        this.app = express();
        this.apiBaseUrl = process.env.HOSTAWAY_API_URL || 'https://api.example.com/listings';
        this.authToken = process.env.AUTHORIZATION_TOKEN || 'default-token';
        this.port = process.env.PORT || 4000;
        this.images = [];
        this.listings = [];

        // Middleware
        this.app.use(cors());
        this.app.use(express.json());
        this.app.use(express.static(path.join(__dirname, 'public')));

        // Routes
        this.setupRoutes();
    }

    setupRoutes() {
        this.app.get('/images', this.getImages.bind(this));
        this.app.get('/api/listings', this.getAllListings.bind(this));
        this.app.get('/api/listings/:id', this.getListingById.bind(this));
        this.app.get('/', (req, res) => {
            res.sendFile(path.join(__dirname, 'public', 'index.html'));
        });
        this.app.get('/details.html', (req, res) => {
            res.sendFile(path.join(__dirname, 'public', 'details.html'));
        });
    }

    static idToImageUrlMap = {
    '288723': 'https://hostaway-platform.s3.us-west-2.amazonaws.com/listing/80066-288723-YPI4-HYu--DM4ziW7UTxU3GDIEslx6jWkegcYm-tFWYQ-67109a0d9190c-small',
    '288724': 'https://hostaway-platform.s3.us-west-2.amazonaws.com/listing/80066-288724-InJpVvFspCMzKTbi2lVFhstYAh32G2YtOx6BZ3dCz54-6703ab9376ef0-small',
    '288726': 'https://hostaway-platform.s3.us-west-2.amazonaws.com/listing/80066-288726-JpCHUfKpBKbpOxzaWNbJzT1lAzxW-h86OsmSbBJydDs-66bacf0767dc9-small',
    '305069': 'https://hostaway-platform.s3.us-west-2.amazonaws.com/listing/80066-305069-1Bgd8QKJbDi-0PLPJmwh3RrFy0C3NpGhYb6aZkSUXUo-66d5963a43a82-small',
    '306543': 'https://hostaway-platform.s3.us-west-2.amazonaws.com/listing/80066-306543-BkpdxPOXsQkuiurqt7duMHqmEcVsz7z-FkJHg7vASow-6703b16cc45e2-small',
    '307143': 'https://hostaway-platform.s3.us-west-2.amazonaws.com/listing/80066-307143-3H4Z---1QKORHRB0PmQUeHDb--JYWvqsXBEcV88fDIRHU-66ea82e905eeb-small',
    '309909': 'https://hostaway-platform.s3.us-west-2.amazonaws.com/listing/80066-309909-t5tvkyH3zdazAH9674KN6BlytU4hIyXfzswqn3--TSqg-6703b8811c802-small',
    '323229': 'https://hostaway-platform.s3.us-west-2.amazonaws.com/listing/80066-323229-R8nXr0FpgtN-KOKcwGhImqJaVde5Aj4sANCHug7J9oI-67284ff1c970e-small',
    '323258': 'https://hostaway-platform.s3.us-west-2.amazonaws.com/listing/80066-323258-S6Cl5b28EAI6rggA1AKTeteuxZOMRjVDRtXquj6XOy4-6728765e95b20-small',
    '323261': 'https://hostaway-platform.s3.us-west-2.amazonaws.com/listing/80066-323261-a3zLzj8FVe96OalhinxdQoxEApvt0VVFZ0wIzxE01-A-67285137260ac-small'
};

    // Fetch data from API
    async fetchData(type = 'images') {
        try {
            const response = await axios.get(this.apiBaseUrl, {
                headers: {
                    'Authorization': this.authToken,
                    'Content-Type': 'application/json'
                }
            });

            let parsedData = typeof response.data === 'string' 
                ? JSON.parse(response.data) 
                : response.data;

            return parsedData;
        } catch (error) {
            console.error(`${type.charAt(0).toUpperCase() + type.slice(1)} Fetch Error:`, error.message);
            throw new Error(`Failed to fetch ${type}`);
        }
    }

    // Extract images from API response
    extractImages(data) {
        if (data && data.status === 'success' && Array.isArray(data.result)) {
            return data.result
                .map(listing => {
                    const imageUrl = this.extractListingImage(listing);
                    return {
                        id: listing.id || Date.now(),
                        url: imageUrl || HostawayListingManager.idToImageUrlMap[listing.id],
                        title: listing.name || listing.externalListingName || 'Untitled Listing'
                    };
                })
                .filter(image => image.url);
        }
        return this.getFallbackImages();
    }

    // Extract listings from API response
    extractListings(data) {
        if (data && data.status === 'success' && Array.isArray(data.result) && data.result.length > 0) {
            return data.result.map(listing => {
                const price = listing.price || listing.listingPrice || 'Price not provided';

                return {
                    id: listing.id || Date.now().toString(),
                    name: listing.name || listing.externalListingName || 'Unnamed Listing',
                    description: listing.description || 'No description available',
                    address: listing.address || 'Address not provided',
                    household: listing.household || 'No household information available',
                    price: price,
                    houseRules: listing.houseRules || 'No specific house rules',
                    imageUrl: HostawayListingManager.idToImageUrlMap[listing.id] || null
                };
            });
        } else {
            console.warn('No listings found or data is incorrectly structured:', data);
            return [];
        }
    }

    // Extract image from listing
    extractListingImage(listing) {
        const imageFields = [
            'imageUrl', 
            'photo', 
            'thumbnailUrl', 
            'coverImageUrl'
        ];

        for (let field of imageFields) {
            if (listing[field]) return listing[field];
        }

        const imageArrayFields = ['images', 'photos', 'gallery'];
        for (let field of imageArrayFields) {
            if (Array.isArray(listing[field]) && listing[field].length > 0) {
                const firstImage = listing[field][0];
                return typeof firstImage === 'string' 
                    ? firstImage 
                    : firstImage.url || firstImage.imageUrl || firstImage.thumbnailUrl;
            }
        }
        return null;
    }

    // Get images endpoint
    async getImages(req, res) {
        try {
            const data = await this.fetchData('images');
            this.images = this.extractImages(data);
            res.json(this.images);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    // Get all listings endpoint
    async getAllListings(req, res) {
        try {
            const data = await this.fetchData('listings');
            this.listings = this.extractListings(data);
            res.json(this.listings);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    // Get listing by ID endpoint
    async getListingById(req, res) {
        const { id } = req.params;
        try {
            // If listings are empty, fetch data first
            if (this.listings.length === 0) {
                const data = await this.fetchData('listings');
                this.listings = this.extractListings(data);
            }

            // Find the listing, ensuring string comparison
            const listing = this.listings.find(listing => 
                listing.id.toString() === id.toString()
            );

            if (listing) {
                // Ensure image URL is included
                listing.imageUrl = listing.imageUrl || 
                    HostawayListingManager.idToImageUrlMap[listing.id] || 
                    null;
                
                res.json(listing);
            } else {
                res.status(404).json({ 
                    error: 'Listing not found', 
                    message: `No listing found with ID: ${id}` 
                });
            }
        } catch (error) {
            console.error('Error fetching listing details:', error);
            res.status(500).json({ 
                error: 'Failed to fetch listing details', 
                message: error.message 
            });
        }
    }

    // Fallback images method
    getFallbackImages() {
        return Object.entries(HostawayListingManager.idToImageUrlMap).map(([id, url]) => ({
            id,
            url,
            title: `Listing ${id}`
        }));
    }

    // Start the server
    start() {
        this.app.listen(this.port, async () => {
            console.log(`Server is running on http://localhost:${this.port}`);
            // Optionally, you can preload listings or images here
            try {
                const data = await this.fetchData('listings');
                this.listings = this.extractListings(data);
            } catch (error) {
                console.error('Error preloading listings:', error.message);
            }
        });
    }
}

const listingManager = new HostawayListingManager();
listingManager.start();
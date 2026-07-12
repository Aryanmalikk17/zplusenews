/**
 * Event Calendar Service Layer - Abstract Factory Pattern & Resilient Data Coordinator
 * Architected by Senior Lead Full-Stack Developer
 */

// ==========================================
// 1. ABSTRACT PROVIDER INTERFACE
// ==========================================
export class CalendarProvider {
    /**
     * Fetch calendar events, holidays, and moon phases for a specific month and region.
     * @param {number} year - YYYY
     * @param {number} month - 1-12
     * @param {string} regionCode - ISO country code (e.g., 'IN')
     * @returns {Promise<Array>} List of standardized event objects
     */
    async fetchEvents(year, month, regionCode) {
        throw new Error("Method 'fetchEvents()' must be implemented by the provider.");
    }
}

// ==========================================
// 2. PROKERALA PROVIDER IMPLEMENTATION (with robust mock fallback)
// ==========================================
export class ProkeralaCalendarProvider extends CalendarProvider {
    constructor(config = {}) {
        super();
        this.apiKey = config.apiKey || null;
        this.apiEndpoint = config.apiEndpoint || '/api/prokerala';
    }

    async fetchEvents(year, month, regionCode) {
        // If an API key or proxy is configured, attempt the request
        if (this.apiKey || this.apiEndpoint) {
            try {
                const response = await fetch(`${this.apiEndpoint}?year=${year}&month=${month}&region=${regionCode}`, {
                    headers: {
                        'Authorization': `Bearer ${this.apiKey}`,
                        'Accept': 'application/json'
                    }
                });

                if (response.status === 429) {
                    throw new Error("RateLimitExceeded: HTTP 429");
                }
                if (!response.ok) {
                    throw new Error(`APIError: HTTP ${response.status}`);
                }

                const data = await response.json();
                return this.standardizeData(data);
            } catch (err) {
                console.warn("Prokerala API failed, falling back to local fallback data:", err.message);
                // Propagate up so Coordinator knows it was a fallback situation
                throw err;
            }
        }
        
        throw new Error("No API endpoint configured.");
    }

    /**
     * Standardizes the raw provider response to our internal format.
     */
    standardizeData(raw) {
        if (!raw || !Array.isArray(raw.events)) return [];
        return raw.events.map(ev => ({
            id: ev.id || Math.random().toString(36).substr(2, 9),
            date: ev.date, // YYYY-MM-DD
            title: ev.title,
            type: ev.type, // 'festival' | 'holiday' | 'moon'
            description: ev.description || '',
            isPremium: ev.isPremium || false,
            muhurtaDetails: ev.muhurtaDetails || null
        }));
    }
}

// ==========================================
// 3. PROVIDER ABSTRACT FACTORY
// ==========================================
export const CalendarProviderFactory = {
    createProvider(type, config = {}) {
        switch (type.toLowerCase()) {
            case 'prokerala':
                return new ProkeralaCalendarProvider(config);
            default:
                throw new Error(`Unknown provider type: ${type}`);
        }
    }
};

// ==========================================
// 4. RICH HISTORICAL FALLBACK GENERATOR (Robust Error Recovery)
// ==========================================
// Standard Indian public holidays, major Hindu festivals, and Moon phases for 2026
const FALLBACK_EVENTS_2026 = [
    // January
    { date: '2026-01-14', title: 'Makar Sankranti', type: 'festival', description: 'Harvest festival dedicated to the Sun God Surya.', isPremium: false },
    { date: '2026-01-26', title: 'Republic Day', type: 'holiday', description: 'National holiday celebrating the Constitution of India.', isPremium: false },
    { date: '2026-01-18', title: 'Amavasya (New Moon)', type: 'moon', description: 'Ideal day for ancestral rites and prayers.', isPremium: false },
    { date: '2026-01-03', title: 'Purnima (Full Moon) Muhurta', type: 'moon', description: 'Highly auspicious moon phase for spiritual practices.', isPremium: true, muhurtaDetails: { auspiciousness: '95%', duration: '14 hrs', ritual: 'Satyanarayan Puja best between 17:30 - 20:00.' } },
    
    // February
    { date: '2026-02-15', title: 'Maha Shivaratri', type: 'festival', description: 'Great Night of Shiva, dedicated to prayers and fasting.', isPremium: false },
    { date: '2026-02-17', title: 'Amavasya (New Moon)', type: 'moon', description: 'Quiet moon phase.', isPremium: false },
    { date: '2026-02-02', title: 'Purnima (Full Moon) Muhurta', type: 'moon', description: 'Bright moon energies.', isPremium: true, muhurtaDetails: { auspiciousness: '90%', duration: '12 hrs', ritual: 'Meditation and donation rites active.' } },

    // March
    { date: '2026-03-04', title: 'Holi Festival of Colors', type: 'festival', description: 'Celebration of the arrival of spring and victory of good over evil.', isPremium: false },
    { date: '2026-03-18', title: 'Amavasya (New Moon)', type: 'moon', description: 'New Moon phase.', isPremium: false },
    { date: '2026-03-03', title: 'Purnima (Full Moon) Muhurta', type: 'moon', description: 'Full Moon phase.', isPremium: true, muhurtaDetails: { auspiciousness: '92%', duration: '13 hrs', ritual: 'Satyanarayan fast recommended.' } },
    { date: '2026-03-27', title: 'Ram Navami', type: 'festival', description: 'Birthday celebration of Lord Rama.', isPremium: false },

    // April
    { date: '2026-04-14', title: 'Dr. Ambedkar Jayanti / Baisakhi', type: 'holiday', description: 'National holiday marking the birth of Dr. B.R. Ambedkar and Punjabi harvest.', isPremium: false },
    { date: '2026-04-17', title: 'Amavasya (New Moon)', type: 'moon', description: 'New Moon phase.', isPremium: false },
    { date: '2026-04-02', title: 'Purnima (Full Moon) Muhurta', type: 'moon', description: 'Full Moon phase.', isPremium: true, muhurtaDetails: { auspiciousness: '88%', duration: '11 hrs', ritual: 'Shanti Path best performed in evening.' } },

    // May
    { date: '2026-05-16', title: 'Amavasya (New Moon)', type: 'moon', description: 'New Moon phase.', isPremium: false },
    { date: '2026-05-01', title: 'Purnima (Full Moon) Muhurta', type: 'moon', description: 'Full Moon phase.', isPremium: true, muhurtaDetails: { auspiciousness: '94%', duration: '15 hrs', ritual: 'Charity and sacred bath auspicious.' } },

    // June
    { date: '2026-06-15', title: 'Amavasya (New Moon)', type: 'moon', description: 'New Moon phase.', isPremium: false },
    { date: '2026-06-29', title: 'Purnima (Full Moon) Muhurta', type: 'moon', description: 'Full Moon phase.', isPremium: true, muhurtaDetails: { auspiciousness: '89%', duration: '12.5 hrs', ritual: 'Gayatri Mantra chanting auspicious.' } },

    // July (Current Month in Screenshot)
    { date: '2026-07-06', title: 'Major Hindu Event / Somvati Fast', type: 'festival', description: 'Sacred fast dedicated to Lord Shiva on Monday.', isPremium: false },
    { date: '2026-07-07', title: 'Important Astrological Muhurta', type: 'festival', description: 'Auspicious celestial alignment for new beginnings.', isPremium: true, muhurtaDetails: { auspiciousness: '85%', duration: '4.5 hrs', ritual: 'Griha Pravesha best between 08:30 - 11:00.' } },
    { date: '2026-07-08', title: 'Amavasya (New Moon)', type: 'moon', description: 'Silence moon phase; good for introspection.', isPremium: false },
    { date: '2026-07-14', title: 'Amavasya Special Muhurta', type: 'moon', description: 'Spiritual alignment.', isPremium: true, muhurtaDetails: { auspiciousness: '80%', duration: '3 hrs', ritual: 'Pitra Tarpan best done before noon.' } },
    { date: '2026-07-28', title: 'Purnima (Full Moon) Muhurta', type: 'moon', description: 'Full Moon illumination.', isPremium: true, muhurtaDetails: { auspiciousness: '98%', duration: '16 hrs', ritual: 'Guru Purnima celebrations: offer prayers to spiritual mentors.' } },

    // August
    { date: '2026-08-15', title: 'Independence Day', type: 'holiday', description: 'Celebrating national independence from British rule.', isPremium: false },
    { date: '2026-08-27', title: 'Krishna Janmashtami', type: 'festival', description: 'Celebrating the birth of Lord Krishna.', isPremium: false },
    { date: '2026-08-12', title: 'Amavasya (New Moon)', type: 'moon', description: 'New Moon phase.', isPremium: false },
    { date: '2026-08-28', title: 'Purnima (Full Moon) Muhurta', type: 'moon', description: 'Full Moon phase.', isPremium: true, muhurtaDetails: { auspiciousness: '91%', duration: '13.5 hrs', ritual: 'Lakshmi puja best at twilight.' } },

    // September
    { date: '2026-09-05', title: 'Ganesh Chaturthi', type: 'festival', description: 'Birth festival of Lord Ganesha, bringer of good fortune.', isPremium: false },
    { date: '2026-09-11', title: 'Amavasya (New Moon)', type: 'moon', description: 'New Moon phase.', isPremium: false },
    { date: '2026-09-26', title: 'Purnima (Full Moon) Muhurta', type: 'moon', description: 'Full Moon phase.', isPremium: true, muhurtaDetails: { auspiciousness: '87%', duration: '11.5 hrs', ritual: 'Meditation and self-study.' } },

    // October
    { date: '2026-10-02', title: 'Gandhi Jayanti', type: 'holiday', description: 'National holiday marking the birth of Mahatma Gandhi.', isPremium: false },
    { date: '2026-10-17', title: 'Dussehra / Vijayadashami', type: 'festival', description: 'Marking the victory of Lord Rama over Ravana.', isPremium: false },
    { date: '2026-10-10', title: 'Amavasya (New Moon)', type: 'moon', description: 'New Moon phase.', isPremium: false },
    { date: '2026-10-25', title: 'Purnima (Full Moon) Muhurta', type: 'moon', description: 'Full Moon phase.', isPremium: true, muhurtaDetails: { auspiciousness: '93%', duration: '14.5 hrs', ritual: 'Kojagari Lakshmi Puja best after sunset.' } },

    // November
    { date: '2026-11-05', title: 'Diwali (Deepavali)', type: 'festival', description: 'Festival of Lights, celebrating Rama\'s return to Ayodhya.', isPremium: false },
    { date: '2026-11-08', title: 'Amavasya (New Moon)', type: 'moon', description: 'New Moon phase.', isPremium: false },
    { date: '2026-11-24', title: 'Purnima (Full Moon) Muhurta', type: 'moon', description: 'Full Moon phase.', isPremium: true, muhurtaDetails: { auspiciousness: '96%', duration: '15.5 hrs', ritual: 'Karthika Deepam ritual lighting.' } },

    // December
    { date: '2026-12-25', title: 'Christmas Day', type: 'holiday', description: 'Public holiday marking the birth of Jesus Christ.', isPremium: false },
    { date: '2026-12-08', title: 'Amavasya (New Moon)', type: 'moon', description: 'New Moon phase.', isPremium: false },
    { date: '2026-12-23', title: 'Purnima (Full Moon) Muhurta', type: 'moon', description: 'Full Moon phase.', isPremium: true, muhurtaDetails: { auspiciousness: '90%', duration: '13 hrs', ritual: 'Dattatreya Jayanti rites active.' } }
];

// ==========================================
// 5. DATA COORDINATOR WITH TTL CACHE STRATEGY
// ==========================================
export class DataCoordinator {
    /**
     * @param {object} options
     * @param {string} options.providerType - e.g., 'prokerala'
     * @param {object} options.providerConfig - config parameters
     * @param {number} options.ttlMs - default is 24 hours (86,400,000 ms)
     */
    constructor(options = {}) {
        this.providerType = options.providerType || 'prokerala';
        this.providerConfig = options.providerConfig || {};
        this.ttlMs = options.ttlMs || 24 * 60 * 60 * 1000; // 24 hours
        
        try {
            this.provider = CalendarProviderFactory.createProvider(this.providerType, this.providerConfig);
        } catch (e) {
            console.error("Failed to initialize primary provider, setting fallback state:", e);
            this.provider = null;
        }
    }

    /**
     * Primary method to query events, integrating Cache validation & Provider fallback.
     */
    async getEvents(year, month, regionCode = 'IN') {
        const cacheKey = `hc_cache_${regionCode.toLowerCase()}_${month}_${year}`;
        
        // 1. Try local cache
        const cached = this.getCacheEntry(cacheKey);
        if (cached) {
            return {
                events: cached.data,
                isCached: true,
                isFallback: cached.isFallback || false,
                error: null
            };
        }

        // 2. Fetch from active provider
        if (this.provider) {
            try {
                const events = await this.provider.fetchEvents(year, month, regionCode);
                this.setCacheEntry(cacheKey, events, false);
                return {
                    events,
                    isCached: false,
                    isFallback: false,
                    error: null
                };
            } catch (err) {
                console.warn(`Coordinator fetch error for ${cacheKey}, trying expired cache or fallback data:`, err.message);
                
                // Try to locate expired cache entry to avoid blank screens
                const expiredCache = this.getCacheEntry(cacheKey, true); // bypass expiry check
                if (expiredCache) {
                    console.log("Returned expired cache entry as resilient fallback.");
                    return {
                        events: expiredCache.data,
                        isCached: true,
                        isFallback: true,
                        error: err.message
                    };
                }
            }
        }

        // 3. Complete Fallback state (local database simulation for 2026)
        console.log(`Generating local fallback data for ${year}-${month}`);
        const filterStr = `${year}-${String(month).padStart(2, '0')}`;
        const fallbackList = FALLBACK_EVENTS_2026.filter(ev => ev.date.startsWith(filterStr));

        // Cache the fallback data with a shorter TTL (1 hour) so we retry the API soon
        this.setCacheEntry(cacheKey, fallbackList, true, 1 * 60 * 60 * 1000); 

        return {
            events: fallbackList,
            isCached: false,
            isFallback: true,
            error: "API connection temporarily unavailable. Showing cached local calendars."
        };
    }

    // Helper: Read from localStorage
    getCacheEntry(key, ignoreExpiry = false) {
        try {
            const raw = localStorage.getItem(key);
            if (!raw) return null;

            const entry = JSON.parse(raw);
            if (!entry || typeof entry !== 'object' || !entry.expiresAt) {
                return null;
            }

            const now = Date.now();
            if (now > entry.expiresAt && !ignoreExpiry) {
                // Remove expired cache to keep storage clean
                localStorage.removeItem(key);
                return null;
            }

            return entry;
        } catch (e) {
            console.error("Cache read failed:", e);
            return null;
        }
    }

    // Helper: Write to localStorage
    setCacheEntry(key, data, isFallback = false, customTtl = null) {
        try {
            const ttl = customTtl || this.ttlMs;
            const entry = {
                data,
                isFallback,
                expiresAt: Date.now() + ttl
            };
            localStorage.setItem(key, JSON.stringify(entry));
        } catch (e) {
            console.error("Cache write failed:", e);
        }
    }
}

// ==========================================
// 6. EVENT PROCESSOR FOR CALENDAR RENDERING
// ==========================================
export const EventProcessor = {
    /**
     * Groups a list of standardized events by date.
     * @param {Array} events 
     * @returns {object} Maps date (YYYY-MM-DD) to array of events
     */
    groupEventsByDate(events) {
        if (!Array.isArray(events)) return {};
        const map = {};
        events.forEach(ev => {
            if (!map[ev.date]) {
                map[ev.date] = [];
            }
            map[ev.date].push(ev);
        });
        return map;
    },

    /**
     * Determines high-level cell styling flags for a day.
     * @param {Array} dayEvents 
     */
    classifyDayStyles(dayEvents = []) {
        let hasHoliday = false;
        let hasFestival = false;
        let hasMoon = false;
        let hasPremium = false;

        dayEvents.forEach(ev => {
            if (ev.type === 'holiday') hasHoliday = true;
            if (ev.type === 'festival') hasFestival = true;
            if (ev.type === 'moon') hasMoon = true;
            if (ev.isPremium) hasPremium = true;
        });

        return {
            hasHoliday,
            hasFestival,
            hasMoon,
            hasPremium
        };
    }
};

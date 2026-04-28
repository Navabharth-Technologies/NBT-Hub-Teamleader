import { useState, useEffect } from 'react';

/**
 * useGeolocation Hook
 * Fetches high-accuracy GPS coordinates and reverse-geocodes them into a full address.
 */
const useGeolocation = () => {
    const [location, setLocation] = useState({
        loading: true,
        coords: { lat: null, lon: null },
        address: 'Detecting location...',
        error: null,
    });

    const fetchAddress = async (lat, lon) => {
        try {
            // Using OpenStreetMap's Nominatim API (Free Alternative to Google Maps)
            const response = await fetch(
                `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1`
            );
            const data = await response.json();

            if (data && data.address) {
                const a = data.address;
                const components = [];

                // 1. Building/Site Name (Prioritized)
                const siteName = a.building || a.office || a.amenity || a.industrial || a.commercial || a.retail || data.name || '';
                if (siteName && siteName.length > 2) components.push(siteName.toUpperCase());

                // 2. Specific Level/Unit
                const level = a.level || a.floor || '';
                const house = a.house_number || '';
                if (level) components.push(`${level} Floor`);
                if (house) components.push(`No. ${house}`);

                // 3. Street/Road
                if (a.road) components.push(a.road);

                // 4. Local Area (Neighborhood/Suburb)
                const area = a.neighbourhood || a.suburb || a.city_district || '';
                if (area && !components.includes(area)) components.push(area);

                // 5. City, State, Country
                const city = a.city || a.town || a.village || '';
                const state = a.state || '';
                const country = a.country || '';
                if (city) components.push(city);
                if (state) components.push(state);
                if (country) components.push(country);

                // 6. Postal Code
                if (a.postcode) components.push(a.postcode);

                const fullAddress = Array.from(new Set(components)).filter(Boolean).join(', ');
                
                return {
                    fullAddress: fullAddress || data.display_name,
                    raw: data
                };
            }
            return { fullAddress: `Lat: ${lat.toFixed(4)}, Lon: ${lon.toFixed(4)}`, raw: null };
        } catch (err) {
            console.error("Geocoding Error:", err);
            return { fullAddress: `Lat: ${lat.toFixed(4)}, Lon: ${lon.toFixed(4)}`, raw: null };
        }
    };

    useEffect(() => {
        if (!navigator.geolocation) {
            setLocation(prev => ({ ...prev, loading: false, error: 'Geolocation not supported by browser' }));
            return;
        }

        const options = {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
        };

        const success = async (position) => {
            const { latitude, longitude } = position.coords;
            const geoResult = await fetchAddress(latitude, longitude);
            
            setLocation({
                loading: false,
                coords: { lat: latitude, lon: longitude },
                address: geoResult.fullAddress,
                error: null
            });
        };

        const error = (err) => {
            let errorMsg = 'Location permission denied';
            if (err.code === 2) errorMsg = 'Location unavailable';
            if (err.code === 3) errorMsg = 'Location request timed out';
            
            setLocation(prev => ({ 
                ...prev, 
                loading: false, 
                error: errorMsg,
                address: 'Location Access Required' 
            }));
        };

        const watcher = navigator.geolocation.watchPosition(success, error, options);

        return () => navigator.geolocation.clearWatch(watcher);
    }, []);

    const refreshLocation = () => {
        setLocation(prev => ({ ...prev, loading: true }));
        navigator.geolocation.getCurrentPosition(
            async (pos) => {
                const { latitude, longitude } = pos.coords;
                const geoResult = await fetchAddress(latitude, longitude);
                setLocation({
                    loading: false,
                    coords: { lat: latitude, lon: longitude },
                    address: geoResult.fullAddress,
                    error: null
                });
            },
            (err) => setLocation(prev => ({ ...prev, loading: false, error: err.message })),
            { enableHighAccuracy: true }
        );
    };

    return { ...location, refreshLocation };
};

export default useGeolocation;

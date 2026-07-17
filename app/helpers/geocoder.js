const NodeGeocoder = require('node-geocoder');

const options = {
    provider: 'openstreetmap',
};

const geocoder = NodeGeocoder(options);

// Address → Latitude/Longitude
async function addressToLatLng(address) {
    try {
        const res = await geocoder.geocode(address);
        return res[0]; // or return whole res array if you want multiple matches
    } catch (err) {
        console.error('Error in addressToLatLng:', err);
        throw err;
    }
}

// Latitude/Longitude → Address
async function latLngToAddress(lat, lon) {
    try {
        const res = await geocoder.reverse({ lat, lon });
        return res[0]; // or return whole res array if needed
    } catch (err) {
        console.error('Error in latLngToAddress:', err);
        throw err;
    }
}

module.exports = {
    addressToLatLng,
    latLngToAddress,
};

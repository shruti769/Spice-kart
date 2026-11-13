// Adds the Google Maps key for Android from the environment (EAS: GOOGLE_MAPS_ANDROID_API_KEY),
// so the key isn't committed. iOS uses Apple Maps and needs no key.
module.exports = ({ config }) => ({
  ...config,
  plugins: [...(config.plugins ?? []), ['react-native-maps', { androidGoogleMapsApiKey: process.env.GOOGLE_MAPS_ANDROID_API_KEY }]],
});

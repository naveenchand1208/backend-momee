const AppUpdate = require('../models/appUpdate')

const PLATFORMS = ['android', 'ios'];

// Fetch-or-create so admin/app always have something sane to read, even
// before anyone has configured this from the admin panel.
const getOrCreate = (platform) =>
    AppUpdate.findOneAndUpdate(
        { platform },
        { $setOnInsert: { platform } },
        { new: true, upsert: true, setDefaultsOnInsert: true }
    );

// ADMIN: both platform configs, for the admin panel's App Update page.
exports.list = async (req, res, next) => {
    try {
        const configs = await Promise.all(PLATFORMS.map(getOrCreate));
        return res.apiResponse(true, 'Success', { docs: configs }, 200);
    } catch (error) {
        console.error('AppUpdate list error:', error);
        return res.apiResponse(false, 'Get app update config error', {}, 500);
    }
}

// ADMIN: upsert one platform's config.
exports.update = async (req, res, next) => {
    try {
        const requests = req.bodyParams;
        const platform = requests.platform;
        if (!platform || !PLATFORMS.includes(platform)) {
            return res.apiResponse(false, 'platform must be "android" or "ios"', {}, 400);
        }

        const update = {};
        if (requests.minVersion != null) update.minVersion = String(requests.minVersion).trim();
        if (requests.latestVersion != null) update.latestVersion = String(requests.latestVersion).trim();
        if (requests.storeUrl != null) update.storeUrl = String(requests.storeUrl).trim();
        if (requests.updateMessage != null) update.updateMessage = String(requests.updateMessage).trim();
        if (requests.forceUpdateEnabled != null) update.forceUpdateEnabled = !!requests.forceUpdateEnabled;

        const config = await AppUpdate.findOneAndUpdate(
            { platform },
            { $set: update, $setOnInsert: { platform } },
            { new: true, upsert: true, setDefaultsOnInsert: true }
        );
        return res.apiResponse(true, 'App update config saved', config, 200);
    } catch (error) {
        console.error('AppUpdate update error:', error);
        return res.apiResponse(false, 'Update app update config error', {}, 500);
    }
}

// PUBLIC: one platform's config. Checked by the app on every launch,
// including before sign-in, so a signed-out user on a too-old build is
// still blocked. Path is whitelisted in helpers/authorization.js.
exports.check = async (req, res, next) => {
    try {
        const requests = req.bodyParams || {};
        const platform = String(requests.platform || '').toLowerCase();
        if (!PLATFORMS.includes(platform)) {
            return res.apiResponse(false, 'platform must be "android" or "ios"', {}, 400);
        }
        const config = await getOrCreate(platform);
        return res.apiResponse(true, 'Success', config, 200);
    } catch (error) {
        console.error('AppUpdate check error:', error);
        return res.apiResponse(false, 'App update check error', {}, 500);
    }
}

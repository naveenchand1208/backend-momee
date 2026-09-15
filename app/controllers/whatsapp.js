const axios = require('axios');
const crypto = require('crypto');
const WhatsappAccount = require('../models/whatsappAccount');

const GRAPH_VERSION = 'v20.0';
const GRAPH_URL = `https://graph.facebook.com/${GRAPH_VERSION}`;

const META_APP_ID = process.env.META_APP_ID;
const META_APP_SECRET = process.env.META_APP_SECRET;
const WHATSAPP_REDIRECT_URI = process.env.WHATSAPP_REDIRECT_URI;
const WHATSAPP_OAUTH_SCOPE =
    process.env.WHATSAPP_OAUTH_SCOPE ||
    'whatsapp_business_management,whatsapp_business_messaging,business_management';

// In-memory store for OAuth CSRF state tokens (short-lived, single instance).
const pendingStates = new Map();

const STATE_TTL_MS = 5 * 60 * 1000;

const cleanupExpiredStates = () => {
    const now = Date.now();
    for (const [state, expiresAt] of pendingStates.entries()) {
        if (expiresAt < now) {
            pendingStates.delete(state);
        }
    }
};

// GET /api/whatsapp/connect
// Redirects the browser to Meta's OAuth dialog so an admin can connect
// a WhatsApp Business Account to this app.
exports.connect = async (req, res, next) => {
    try {
        if (!META_APP_ID || !WHATSAPP_REDIRECT_URI) {
            return res.apiResponse(
                false,
                'WhatsApp integration is not configured',
                {},
                500
            );
        }

        cleanupExpiredStates();

        const state = crypto.randomBytes(16).toString('hex');
        pendingStates.set(state, Date.now() + STATE_TTL_MS);

        const authUrl = new URL(`https://www.facebook.com/${GRAPH_VERSION}/dialog/oauth`);
        authUrl.searchParams.set('client_id', META_APP_ID);
        authUrl.searchParams.set('redirect_uri', WHATSAPP_REDIRECT_URI);
        authUrl.searchParams.set('scope', WHATSAPP_OAUTH_SCOPE);
        authUrl.searchParams.set('response_type', 'code');
        authUrl.searchParams.set('state', state);

        return res.redirect(authUrl.toString());
    } catch (error) {
        console.error('WhatsApp connect error:', error);
        return res.apiResponse(false, 'Failed to start WhatsApp connection', {}, 500);
    }
};

// GET /api/whatsapp/callback
// Meta redirects here after the admin approves/denies access on the OAuth dialog.
exports.callback = async (req, res, next) => {
    try {
        const { code, state, error, error_description } = req.query;

        if (error) {
            console.error('WhatsApp OAuth error:', error, error_description);
            return res.apiResponse(
                false,
                error_description || 'WhatsApp authorization was denied',
                {},
                400
            );
        }

        if (!code) {
            return res.apiResponse(false, 'Missing authorization code', {}, 400);
        }

        if (!state || !pendingStates.has(state)) {
            return res.apiResponse(false, 'Invalid or expired state', {}, 400);
        }
        pendingStates.delete(state);

        if (!META_APP_ID || !META_APP_SECRET || !WHATSAPP_REDIRECT_URI) {
            return res.apiResponse(
                false,
                'WhatsApp integration is not configured',
                {},
                500
            );
        }

        // Exchange the authorization code for an access token.
        const tokenResponse = await axios.get(`${GRAPH_URL}/oauth/access_token`, {
            params: {
                client_id: META_APP_ID,
                client_secret: META_APP_SECRET,
                redirect_uri: WHATSAPP_REDIRECT_URI,
                code
            }
        });

        const { access_token, token_type, expires_in } = tokenResponse.data;

        await WhatsappAccount.findOneAndUpdate(
            { key: 'default' },
            {
                key: 'default',
                accessToken: access_token,
                tokenType: token_type || '',
                expiresIn: expires_in || null,
                status: 'Active'
            },
            { upsert: true, new: true }
        );

        return res.apiResponse(true, 'WhatsApp account connected successfully', {}, 200);
    } catch (error) {
        console.error(
            'WhatsApp callback error:',
            error.response ? error.response.data : error.message
        );
        return res.apiResponse(false, 'Failed to connect WhatsApp account', {}, 500);
    }
};

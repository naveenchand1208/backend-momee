// const dotenv = require('dotenv');
// const fs = require('fs');

// // Load correct .env file based on NODE_ENV
// const envFile = process.env.NODE_ENV === 'production' ? '.env.production' : '.env.development';
// if (fs.existsSync(envFile)) {
//   dotenv.config({ path: envFile });
//   console.log(`[ImageKit] Loaded env from: ${envFile}`);
// } else {
//   dotenv.config(); // fallback
//   console.log(`[ImageKit] Loaded fallback .env`);
// }
require('../config/env');
const ImageKit = require("imagekit");

const imagekit = new ImageKit({
    publicKey: process.env.IMAGEKIT_PUBLIC_KEY,
    privateKey: process.env.IMAGEKIT_PRIVATE_KEY,
    urlEndpoint: process.env.IMAGEKIT_URL,
});

async function uploadImageToImageKit(buffer, originalname) {
    try {
        if (!buffer || !originalname) {
            throw new Error("Missing file buffer or filename");
        }
        const result = await imagekit.upload({
            file: buffer,
            fileName: originalname,
            useUniqueFileName: false,
            overwriteFile: true
        });

        return result;
    } catch (err) {
        console.error("ImageKit upload failed:", err?.message);
        throw err;
    }
}

async function deleteImageFromImageKit(fileId) {
    try {
        if (!fileId) {
            throw new Error("Missing fileId");
        }

        const result = await imagekit.deleteFile(fileId);
        return result;
    } catch (err) {
        console.error("ImageKit delete failed:", err?.message);
        throw err;
    }
}

module.exports = {
    uploadImageToImageKit,
    deleteImageFromImageKit,
};
const { v2: cloudinary } = require("cloudinary");

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Upload a file buffer to Cloudinary.
 * @param {Buffer} fileBuffer - The file buffer from multer memory storage
 * @param {string} folder - Cloudinary folder name
 * @returns {Promise<string>} - The secure URL of the uploaded image
 */
function uploadToCloudinary(fileBuffer, folder = "devtinder") {
    return new Promise((resolve, reject) => {
        cloudinary.uploader.upload_stream(
            {
                folder,
                resource_type: "image",
                transformation: [
                    { width: 800, height: 800, crop: "limit" },
                    { quality: "auto", fetch_format: "auto" },
                ],
            },
            (error, result) => {
                if (error) return reject(error);
                resolve(result.secure_url);
            }
        ).end(fileBuffer);
    });
}

module.exports = { cloudinary, uploadToCloudinary };

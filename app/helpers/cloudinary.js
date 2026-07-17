const cloudinary = require('cloudinary').v2;
const dotenv = require('dotenv');
const path = require('path');
const moment = require('moment');

dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadToCloudinary = async (file, folderName = 'uploads') => {
  try {
    const fileNameWithoutExt = path.parse(file.originalname).name;
    const uniquePublicId = `${fileNameWithoutExt}-${moment().format('DDMMYYYYHHmmss')}`;;
    const result = await cloudinary.uploader.upload(file.path, {
      folder: folderName,
      public_id: uniquePublicId,
      resource_type: 'raw',
      type: 'upload',
      use_filename: true,
      unique_filename: false
    });
    return result;
  } catch (error) {
    throw new Error('Cloudinary upload failed: ' + error.message);
  }
};

const deleteFromCloudinary = async (publicId, type = 'image') => {
  const resourceTypes = ['video', 'image', 'raw'];

  try {
    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: type,
    });

    if (result.result === 'ok' || result.result === 'not found') {
      console.log(`Deleted from Cloudinary as resource_type: '${type}'`);
      return result;
    }
  } catch (err) {
    console.warn(`Delete failed for resource_type: '${type}' → ${err.message}`);
  }
}

module.exports = { cloudinary, uploadToCloudinary, deleteFromCloudinary };


// const { S3Client, PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
// const path = require('path');
// const fs = require('fs');
// const dotenv = require('dotenv');
// const moment = require('moment');

// dotenv.config();

// const s3 = new S3Client({
//   region: process.env.AWS_REGION,
//   credentials: {
//     accessKeyId: process.env.AWS_ACCESS_KEY_ID,
//     secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
//   },
// });

// const uploadToCloudinary = async (file, folderName = 'uploads') => {
//   try {
//     console.log('Uploading file:', file.path);

//     // const fileBuffer = fs.readFileSync(file.path); 
//     const fileBuffer = fs.createReadStream(file.path);
//     const fileNameWithoutExt = path.parse(file.originalname).name;
//     const uniqueFileName = `${fileNameWithoutExt}-${moment().format('DDMMYYYYHHmmss')}${path.extname(file.originalname)}`;
//     const key = `${folderName}/${uniqueFileName}`;

//     console.log('Uploading to S3 with key:', key);

//     await s3.send(new PutObjectCommand({
//       Bucket: process.env.AWS_BUCKET_NAME,
//       Key: key,
//       Body: fileBuffer,
//       ContentType: file.mimetype,
//     }));

//     fs.unlinkSync(file.path); // cleanup
//     console.log('File uploaded and local file deleted');

//     return {
//       public_id: key,
//       secure_url: `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`,
//     };
//   } catch (error) {
//     console.error('S3 upload failed:', error); 
//     throw new Error('S3 upload failed: ' + (error.message || error.toString()));
//   }
// };

const { S3Client, PutObjectCommand, DeleteObjectCommand  } = require('@aws-sdk/client-s3');
// const path = require('path');
// const fs = require('fs');
// const moment = require('moment');

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

// const uploadToCloudinary = async (file, folderName = 'uploads') => {
//   try {
//     console.log('Uploading file:', file.path);

//     // Read file once
//     const fileBuffer = fs.readFileSync(file.path);

//     const fileNameWithoutExt = path.parse(file.originalname).name;
//     const uniqueFileName = `${fileNameWithoutExt}-${moment().format('DDMMYYYYHHmmss')}${path.extname(file.originalname)}`;
//     const key = `${folderName}/${uniqueFileName}`;

//     console.log('Uploading to S3 with key:', key);

//     await s3.send(new PutObjectCommand({
//       Bucket: process.env.AWS_BUCKET_NAME,
//       Key: key,
//       Body: fileBuffer,
//       ContentType: file.mimetype,
//     }));

//     // Delete temp file only once
//     fs.unlinkSync(file.path);
//     console.log('File uploaded and local file deleted');

//     return {
//       public_id: key,
//       secure_url: `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`,
//     };
//   } catch (error) {
//     console.error('S3 upload failed:', error);
//     throw new Error('S3 upload failed: ' + error.message);
//   }
// };

// const deleteFromCloudinary = async (key) => {
//   try {
//     const command = new DeleteObjectCommand({
//       Bucket: process.env.AWS_BUCKET_NAME,
//       Key: key,
//     });
//     return await s3.send(command);
//   } catch (err) {
//     console.warn(`Delete from S3 failed: ${err.message}`);
//     throw err;
//   }
// };

module.exports = { uploadToCloudinary, deleteFromCloudinary };

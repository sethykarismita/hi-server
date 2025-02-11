/* eslint-disable no-undef */

const { v2 } = require('cloudinary');

// Configuration
v2.config({
    cloud_name: 'dptdikuo6',
    api_key: '161827842144876',
    api_secret: 'eEjhM3E_kxhlhrLm17GYB5-id8A'
});

// Upload an image
async function uploadImage(image_address, image_id) {
    const uploadResult = await v2.uploader
        .upload(
            image_address, {
            public_id: image_id,
        }
        )
        .catch((error) => {
            console.log(error);
        });
    
    return uploadResult;
}

module.exports = uploadImage


/*
    // Transform the image: auto-crop to square aspect_ratio
    const autoCropUrl = v2.url(image_id, {
        crop: 'auto',
        gravity: 'auto',
        width: 500,
        height: 500,
    });
   //console.log(autoCropUrl);*/
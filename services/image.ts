import cloudinary from "cloudinary"
import streamifier = require('streamifier')

cloudinary.v2.config({ 
    cloud_name: 'adstore', 
    api_key: '129941679962871', 
    api_secret: 'a2_7fL6w25GMioKLN_L3Aj2v5Xs' 
});

export const uploadFromBuffer = async (folder: string, buffer: any, callbacks: cloudinary.UploadResponseCallback | undefined) => {
   return new Promise(() => {
     let cld_upload_stream = cloudinary.v2.uploader.upload_stream({folder: folder, format: "jpg"}, callbacks);
     streamifier.createReadStream(buffer).pipe(cld_upload_stream);
   });
};

export const destroy = async (public_id: string) => {
    return new Promise(() => {
        cloudinary.v2.uploader.destroy(public_id)
    });
};
 


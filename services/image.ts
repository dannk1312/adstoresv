import cloudinary from "cloudinary"

var cloudinary_temp = cloudinary.v2

export const Setup = () => {
    cloudinary_temp.config({ 
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
        api_key: process.env.CLOUDINARY_API_KEY, 
        api_secret: process.env.CLOUDINARY_API_SECRET
    });
}

export const base64 = (image_base64: string): string => `data:image/jpeg;base64,${image_base64}`

export const upload = (data: string, folder: string) => {
    return cloudinary_temp.uploader.upload(data, {folder: folder})
}

export const destroy = (pulic_id: string) => {
    return cloudinary_temp.uploader.destroy(pulic_id)
}
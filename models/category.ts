import { Schema, model, Types } from 'mongoose';

export interface ICategory {
    _id: Types.ObjectId,
    name: string,
    // Cloudinary
    image_id: string,
    image_url: string,
    products: [Types.ObjectId],
    specsModel: [{
        name: string, 
        values: [{
            value: string,
            products: [Types.ObjectId]
        }]
    }]
}


export const categorySchema = new Schema<ICategory>({
    name: {
        type: String,
        required: [true, "Category name cannot be empty"],
        unique: true,
        trim: true
    },
    image_id: {type: String, required: [true, "Category image cannot be empty"]},
    image_url: {type: String, required: [true, "Category image cannot be empty"]},
    products: [{ type: Schema.Types.ObjectId, required: true, ref: 'Product' }],
    specsModel: [{
        name: {type: String, required: [true, "Category specsModel name cannot be empty"]}, 
        values: [{
            value: {type: String, required: [true, "Category specsModel values unit cannot be empty"]},
            products: [{ type: Schema.Types.ObjectId, required: true, ref: 'Product' }]
        }]
    }]
}, { timestamps: true })


export const Category = model<ICategory>('Category', categorySchema)
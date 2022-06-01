import { Schema, model, Types } from 'mongoose';

export interface ICategory {
    _id: string,
    name: string,
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
        required: true,
        unique: true,
        trim: true
    },
    image_id: String,
    image_url: String,
    products: [Types.ObjectId],
    specsModel: [{
        name: String, 
        values: [{
            value: String,
            products: [Types.ObjectId]
        }]
    }]
}, { timestamps: true })


export const Category = model<ICategory>('Category', categorySchema)
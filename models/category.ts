import { Schema, model, Types } from 'mongoose';

export interface ICategory {
    _id: string,
    image: Buffer,
    specsModel: Types.Map<String>
}


export const categorySchema = new Schema<ICategory>({
    _id: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    image: Buffer,
    specsModel: {
        type: Types.Map,
        of: String
    }
}, { timestamps: true })


export const Category = model<ICategory>('Category', categorySchema)
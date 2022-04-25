import { Schema, model, Types } from 'mongoose';

export interface ICategory {
    _id: string,
    specsModel: Types.Map<String>
}


export const categorySchema = new Schema<ICategory>({
    _id: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    specsModel: {
        type: Types.Map,
        of: String
    }
}, { timestamps: true })


export const Category = model<ICategory>('Category', categorySchema)
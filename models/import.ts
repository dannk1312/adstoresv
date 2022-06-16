import { Schema, model, Types } from 'mongoose';

export interface IImport {
    _id: Types.ObjectId,
    // Buyer Info
    data: [{
        product: Types.ObjectId, 
        quantity: number,
        color: string,
        price: number
    }],
    admin: Types.ObjectId
}

export const importSchema = new Schema<IImport>({
    data: [{
        product: {type: Schema.Types.ObjectId, ref: "Product"}, 
        quantity: Number,
        price: Number,
        color: String
    }],
    admin: {type: Schema.Types.ObjectId, ref: "Account"} 
}, { timestamps: true })


export const Import = model<IImport>('Import', importSchema)
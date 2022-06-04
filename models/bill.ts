import { Schema, model, Types } from 'mongoose';

export interface IBill {
    _id: Types.ObjectId,
    // Buyer Info
    phone: String,
    address: String,

    // Bill Info
    products: [{
        product: Types.ObjectId,
        quantity: number,
        price: Number,
        sale?: number
    }],
    discountCode?: string,
    status: string,
    desc: string,

    // Timestamps
    createdAt: Date,
    updatedAt: Date
}

export const billSchema = new Schema<IBill>({
    // Buyer Info
    phone: {type: String, required: [true, "Bill phone cannot be empty"]},
    address: {type: String, required: [true, "Bill address cannot be empty"]},

    // Bill Info
    products: [{
        product: {
            type: Schema.Types.ObjectId, required: [true, 'Product id in bill cannot be empty.'],
            ref: 'Product'
        },
        quantity: {
            type: Number,
            required: [true, 'Product id in bill cannot be empty.'],
        },
        price: {
            type: Number,
            required: [true, 'Product id in bill cannot be empty.'],
        },
        sale: {
            type: Number,
            default: 0
        }
    }],
    discountCode: {type: String, ref: 'Discount'},
    status: {
        type: String,
        enum: {
            values: ['Preparing', 'Delivering', 'Done', 'Cancel'], 
            message: 'Role {VALUE} is not supported'
        },
        default: 'Preparing'
    }
}, { timestamps: true })


export const Bill = model<IBill>('Bill', billSchema)
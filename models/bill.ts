import { Schema, model, Types } from 'mongoose';

export interface IBill {
    _id: Types.ObjectId,
    phone: String,
    address: String,
    products: [{
        product: Types.ObjectId,
        quantity: number,
        price: Number,
        sale?: number
    }],
    discountPrice: number,
    discountCode?: string,
    status: string,
    desc: string,
    createdAt: Date,
    updatedAt: Date
}


export const billSchema = new Schema<IBill>({
    products: [{
        product: {
            type: Schema.Types.ObjectId,
            required: [true, 'Product id in bill cannot be empty.'],
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
    discountPrice: {
        type: Number,
        default: 0
    },
    phone: {type: String, required: [true, "Bill phone cannot be empty"]},
    address: {type: String, required: [true, "Bill address cannot be empty"]},
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
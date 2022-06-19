import { Schema, model, Types } from 'mongoose';

export interface IBill {
    _id: Types.ObjectId,
    // Buyer Info
    account: Types.ObjectId,
    name: string,
    phone: string,
    address: {
        province: string,
        district: string, 
        address: string
    },

    // Bill Info
    products: [{
        product: Types.ObjectId,
        color: string
        quantity: number,
        price: number,
        sale?: number
    }],
    discountCode?: string,
    status: string,
    desc: string,

    ship: number, 
    total: number,
    discount: number,

    refund: boolean,
    verify: boolean,
    paid: boolean,

    // Timestamps
    createdAt: Date,
    updatedAt: Date
}

export const billSchema = new Schema<IBill>({
    // Buyer Info
    account: {type: Schema.Types.ObjectId, ref: "Account"},
    phone: {type: String, required: [true, "Bill phone cannot be empty"]},
    name: String,
    address:  {
        province: String,
        district: String, 
        address: String
    },
    // Bill Info
    products: [{
        product: {
            type: Schema.Types.ObjectId, required: [true, 'Product id in bill cannot be empty.'],
            ref: 'Product'
        },
        color: {
            type: String,
            required: [true, 'Product color in bill cannot be empty.'],
        },
        quantity: {
            type: Number,
            required: [true, 'Product quantity in bill cannot be empty.'],
        },
        price: {
            type: Number,
            required: [true, 'Product price in bill cannot be empty.'],
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
            message: 'Value {VALUE} is not supported'
        },
        default: 'Preparing'
    },
    
    refund: Boolean,
    paid: Boolean,
    ship: {type: Number, required: true}, 
    total: {type: Number, required: true}, 
    discount: {type: Number, required: true}, 
    verify: {type: Boolean, required: true}
}, { timestamps: true })

billSchema.virtual('cash').get(function () {
    return this.total - this.discount;
});

export const Bill = model<IBill>('Bill', billSchema)
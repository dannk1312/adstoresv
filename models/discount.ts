import { Schema, model, Types } from 'mongoose';
import { AuthTypesSolution } from 'twilio/lib/rest/api/v2010/account/sip/domain/authTypes';

export interface IDiscount {
    _id: Types.ObjectId,
    code: string,
    enable: boolean,

    // Limit of discounts
    dateStart: Date,
    dateEnd: Date, // undefined mean dont have quantity limit
    quantity: number, // undefined mean dont have quantity limit

    // Price range of discounts
    minPrice: number, // undefined mean dont have minPrice
    maxPrice: number, // undefined mean dont have maxPrice

    // Type of discount
    is_percent: boolean, // in percent of price or in price
    is_ship: boolean,
    is_oid: boolean, // is one in day
    is_oic: boolean, // is one in customer
    value: number, 

    // depend on
    products: Types.ObjectId[], // empty mean all can use 
    categories: string[], // empty mean all can use 
    accounts: Types.ObjectId[], // empty mean all can use 

    // history
    used: any
}


export const discountSchema = new Schema<IDiscount>({
    code: {type: String, required: [true, "Discount code cannot be empty"], unique: true, trim: true, lowercase: true},
    enable: {type: Boolean, default: false},
    // Limit of discounts
    dateStart: {type: Date, default: Date.now},
    dateEnd: Date,
    quantity: Number,

    // Price range of discounts
    minPrice: Number,
    maxPrice: Number,

    // Type of discount
    is_percent: {type: Boolean, default: false},
    is_ship: {type: Boolean, default: false},
    is_oid: {type: Boolean, default: true},
    is_oic: {type: Boolean, default: true}, 
    value: {type: Number, required: true}, 

    // depend on
    products: [{ type: Schema.Types.ObjectId, ref: 'Product' }], 
    categories: [String], 
    accounts: [{ type: Schema.Types.ObjectId, ref: 'Account' }],

    used: { type:Schema.Types.Mixed, default: {}}
}, { timestamps: true })


export const Discount = model<IDiscount>('Discount', discountSchema)
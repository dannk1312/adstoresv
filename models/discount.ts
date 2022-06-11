import { Schema, model, Types } from 'mongoose';
import { AuthTypesSolution } from 'twilio/lib/rest/api/v2010/account/sip/domain/authTypes';

export interface IDiscount {
    _id: Types.ObjectId,
    code: string,
    enable: boolean,

    // Limit of discounts
    dateStart: Date,
    dateEnd: Date, // undefined mean dont have quantity limit
    quantity: Number, // undefined mean dont have quantity limit

    // Price range of discounts
    minPrice: Number, // undefined mean dont have minPrice
    maxPrice: Number, // undefined mean dont have maxPrice

    // Type of discount
    is_percent: boolean, // in percent of price or in price
    is_ship: boolean,
    is_oid: boolean, // is one in day
    is_oic: boolean, // is one in customer
    value: Number, 

    // depend on
    products: Types.ObjectId[], // empty mean all can use 
    categories: Types.ObjectId[], // empty mean all can use 
    accounts: Types.ObjectId[], // empty mean all can use 

    // history
    used: any
}


export const discountSchema = new Schema<IDiscount>({
    _id: Types.ObjectId,
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
    value: Number, 

    // depend on
    products: [{ type: Schema.Types.ObjectId, required: true, ref: 'Product' }], 
    categories: [{ type: Schema.Types.ObjectId, required: true, ref: 'Category' }], 
    accounts: [{ type: Schema.Types.ObjectId, required: true, ref: 'Account' }],

    used: Schema.Types.Mixed
}, { timestamps: true })


export const Discount = model<IDiscount>('Discount', discountSchema)
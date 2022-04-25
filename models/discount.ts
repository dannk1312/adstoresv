import { Schema, model, Types } from 'mongoose';

export interface IDiscount {
    _id: String,
    dateStart: Date,
    dateEnd: Date,
    minPrice: Number,
    maxPrice: Number,
    discountPercent: Number,
    discountPrice: Number,
    discountShip: Number,
    quantity: Number
}


export const discountSchema = new Schema<IDiscount>({
    _id: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    dateStart: { type: Date, required: [true, 'Discount date start cannot be empty'] },
    dateEnd: { type: Date, required: [true, 'Discount date end cannot be empty'] },
    minPrice: { type: Number, default: 0 },
    maxPrice: { type: Number, required: [true, 'Discount max cannot be empty'] },
    discountPercent: {
        type: Number,
        required: [
            function () {
                // @ts-ignore
                return this.discountPrice === undefined && this.discountShip === undefined;
            },
            "Discount require discountPercent/discountPrice/discountShip"
        ],
    },
    discountPrice: {
        type: Number,
        required: [
            function () {
                // @ts-ignore
                return this.discountPercent === undefined && this.discountShip === undefined;
            },
            "Discount require discountPercent/discountPrice/discountShip"
        ],
    },
    discountShip: {
        type: Number,
        required: [
            function () {
                // @ts-ignore
                return this.discountPercent === undefined && this.discountPrice === undefined;
            },
            "Discount require discountPercent/discountPrice/discountShip"
        ],
    },
    quantity: {type: Number, required: [true, 'Discount quantity cannot be empty']}
}, { timestamps: true })


export const Discount = model<IDiscount>('Discount', discountSchema)
import { Schema, model, Types } from 'mongoose';
import { type } from 'os';

export interface IProduct {
    _id: Types.ObjectId,
    // Information
    name: string,
    code: string,
    desc: string,
    cat: String,
    origin: string,
    specs: Types.Map<String>,
    price: Number,
    discount: number,
    // Feature
    rate: number,
    comments: [{
        account: Types.ObjectId,
        message: string,
        rate: number,
        createAt: Date
    }]
}


export const productSchema = new Schema<IProduct>({
    // Information
    name: {type: String, required: [true, 'Product name cannot be empty'], trim: true},
    code: {type: String, required: [true, 'Product code cannot be empty'], unique: true, trim: true},
    desc: {type: String, default: ''},
    cat: {type: String, ref: 'Category', trim: true},
    origin: {type: String, default: ''},
    specs: {type: Types.Map, of: String},
    price: {type: Number, required: [true, 'Product price cannot be empty'], min: [1, 'Product price must more than 0']},
    discount: {
        type: Number, 
        default: 0, 
        min: [0, 'Product discount must more than or equal 0'], 
        max: [100, 'Product discount must less than or equal 100']
    },
    rate: {type: Number, default: 0},
    comments: [{
        account: {type: Schema.Types.ObjectId, required: true, ref: 'Account'},
        message: String,
        rate: {type: Number, default: 0},
        createAt: {type: Date, default: Date.now}
    }]
}, { timestamps: true })


export const Product = model<IProduct>('Product', productSchema)
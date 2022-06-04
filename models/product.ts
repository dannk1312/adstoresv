import { Schema, model, Types } from 'mongoose';
import { type } from 'os';

export interface IProduct {
    _id: Types.ObjectId,
    // Basic Information
    name: string,
    code: string,
    desc: string,
    colors: [{
        color: string,
        image_id: string,
        image_url: string,
    }]

    // Information
    category: Types.ObjectId,
    specs: [{
        name: string, 
        value: string
    }],
    price: number,
    sale: number,

    // Features
    total_rate: number, // total rate
    comments: [{
        account: Types.ObjectId,
        message: string,
        rate: number,
        at: Date
    }]
}


export const productSchema = new Schema<IProduct>({
    // Information
    name: {type: String, required: [true, 'Product name cannot be empty'], trim: true},
    code: {type: String, required: [true, 'Product code cannot be empty'], unique: true, trim: true},
    desc: {type: String, default: '', trim: true},
    colors: [{
        color: {type: String, required: true, trim: true},
        image_id: String,
        image_url: String
    }],

    category: {type: Schema.Types.ObjectId, ref: 'Category'},
    specs: [{
        name: {type: String, required: true},
        value: {type: String, required: true}
    }],
    price: {type: Number, required: [true, 'Product price cannot be empty']},
    sale: {
        type: Number, 
        default: 0, 
        min: [0, 'Product discount percent must more than or equal 0'], 
        max: [1, 'Product discount percent must less than or equal 1']
    },
    total_rate: {type: Number, default: 0},
    comments: [{
        account: {type: Schema.Types.ObjectId, required: true, ref: 'Account'},
        message: String,
        rate: {type: Number, default: 0},
        at: {type: Date, default: Date.now}
    }]
}, { timestamps: true })


export const Product = model<IProduct>('Product', productSchema)
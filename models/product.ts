import { Schema, model, Types } from 'mongoose';
import { type } from 'os';
import { config } from '../services/config';
import { Category } from './category';

export interface IProduct {
    _id: Types.ObjectId,
    // Basic Information
    name: string,
    code: string,
    desc: string,
    enable: boolean,
    colors: [{
        color: string,
        image_id: string,
        image_url: string,
        quantity: number
    }],
    image_id: string,
    image_url: string,

    // Information
    category: string,
    specs: any, // specs: value\
    price: number
    sale: number,

    catalogue: [
        {
            _id: Types.ObjectId,
            image_id: string,
            image_url: string
        }
    ],

    // Features
    sold: number,
    total_rate: number, // total rate
    comments: [{
        account: Types.ObjectId,
        message: string,
        rate: number,
        at: Date
    }]
}

export interface BagItem { 
    product: Types.ObjectId,
    code: string, 
    name: string, 
    quantity: number, 
    color: string, 
    colorIndex: number, 
    image_url: string, 
    category: string,
    price: number,
    sale: number
}

export const productSchema = new Schema<IProduct>({
    // Information
    name: {type: String, required: [true, 'Product name cannot be empty'], trim: true},
    code: {type: String, required: [true, 'Product code cannot be empty'], unique: true, trim: true},
    desc: {type: String, default: '', trim: true},
    enable: {type: Boolean, default: true},
    colors: [{
        color: {type: String, required: true, trim: true},
        image_id: String,
        image_url: String,
        quantity: {type: Number, default: 0}
    }],
    image_id: {type: String, require: true},
    image_url: {type: String, require: true},

    category: String,
    specs: Schema.Types.Mixed,
    price: {type: Number, required: [true, 'Product price cannot be empty']},
    sale: {
        type: Number, 
        default: 0, 
        min: [0, 'Product discount percent must more than or equal 0'], 
        max: [1, 'Product discount percent must less than or equal 1']
    },
    catalogue: [
        {
            image_id: String,
            image_url: String
        }
    ],
    sold: {type: Number, default: 0},
    total_rate: {type: Number, default: 0},
    comments: [{
        account: {type: Schema.Types.ObjectId, required: true, ref: 'Account'},
        message: String,
        rate: {type: Number, default: 0},
        at: {type: Date, default: Date.now}
    }]
}, { timestamps: true })


productSchema.statics.list = async function(queryOptions: any, sortOptions: any, skip: number, limit: number) {
    return {
        data: await Product.find(queryOptions).sort(sortOptions).skip(skip).limit(limit).lean().select(config.product_str).exec(),
        count: skip == 0 ? await Product.countDocuments(queryOptions): undefined
    }
}

export const Product = model<IProduct>('Product', productSchema)

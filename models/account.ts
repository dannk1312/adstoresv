import { argon2d } from 'argon2';
import { debug } from 'console';
import { Schema, model, Types, Document } from 'mongoose';
import { config } from '../services/config';
import { billSchema, IBill } from './bill';

export interface IAddress {
    province: string, 
    district: string,
    address: string
}

export interface IBag {
    product: Types.ObjectId | string,
    color: string,
    quantity: number
}

export interface IBagItem {
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

export interface INotification {
    product: Types.ObjectId,
    color: string,
    quantity: number
}

export interface IAccount {
    _id: Types.ObjectId,
    // Login Info 
    email: string, // ** need exists: email || phone
    phone: string,
    password: string,

    // Information
    name: string,
    birth: Date,
    gender: string,
    address: IAddress,
    role: string,

    // Features
    chats: Types.ObjectId[],
    bag: IBag[],
    bills: Types.ObjectId[],
    notifications: INotification[],
    rate_waits: Types.ObjectId[],
    warning: number,
    enable: boolean,

    // Timestamps
    createdAt: Date,
    updatedAt: Date
}

// phone & email need to check unique in application level
export const accountSchema = new Schema<IAccount>({
    // Login Info 
    email: {
        type: String,
        required: function () {
            //@ts-ignore
            return this.phone === undefined;
        },
        validate: {
            validator: function (v: string) {
                return config.emailRegEx.test(v)
            },
            message: 'Email format is not correct.'
        },
        trim: true
    },
    password: {
        type: String,
        trim: true
    },
    phone: {
        type: String,
        required: function () {
            //@ts-ignore
            return this.email === undefined;
        },
        validate: {
            validator: function (v: string) {
                return config.phoneRegEx.test(v)
            },
            message: 'Phone format is not correct.'
        },
        trim: true
    },

    // Information
    name: String,
    birth: Date,
    gender: String,
    address: {
        province: String,
        district: String,
        address: String
    },
    role: {
        type: String,
        enum: {
            values: ['Customer', 'Sale', 'Admin'],
            message: 'Role {VALUE} is not supported'
        },
        default: 'Customer'
    },

    // Features
    chats: [{ type: Schema.Types.ObjectId, required: true, ref: 'Chat' }],
    bag: [{
        product: { type: Schema.Types.ObjectId, required: true, ref: 'Product' },
        color: String,
        quantity: Number
    }],
    rate_waits: [{ type: Schema.Types.ObjectId, required: true, ref: 'Product' }],
    bills: [{ type: Schema.Types.ObjectId, required: true, ref: 'Bill' }],
    notifications: [{
        message: { type: String, required: true, trim: true },
        createdAt: { type: Date, default: Date.now }
    }],
    warning: {type: Number, default: 0},
    enable: {type: Boolean, default: true}
}, { timestamps: true })


export const AccountInfo = async (_id: string) => await Account.findById(_id).select("-notifications -rate_waits")


export const AccountSurface = async (_id: string) => {
    var pipeline = [
        {  
            "$project": {
                "email": "$email",
                "name": "$name",
                "phone": "$phone",
                "role": "$role",
                "notifications_length": { "$size": "$notifications" },
                "bag_items": "$bag",
                "bills_length": {"$sum" : "$bills.quantity"},
            }
        },
        {
            "$match": {_id}
        }
    ]
    var docs = await Account.aggregate(pipeline)
    if(docs.length > 0) {
        var doc = docs[0]
        doc.bag_items_length = doc.bag_items.reduce((a: number, b: IBag) => a + b.quantity, 0)
        var temp = new Set()
        doc.bag_items.forEach((u: any) => temp.add(u.product))
        delete doc.bag_items
        doc.bag_products = [...temp]
        return doc
    } else return undefined
}

export const Account = model<IAccount>('Account', accountSchema)

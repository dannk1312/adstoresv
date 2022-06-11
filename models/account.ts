import { argon2d } from 'argon2';
import { debug } from 'console';
import { Schema, model, Types } from 'mongoose';
import { config } from '../services/config';
import { billSchema, IBill } from './bill';

export interface IAccount {
    _id: Types.ObjectId,
    // Login Info 
    email?: string, // ** need exists: email || phone
    phone?: string,
    password?: string,

    // Information
    name?: string,
    birth?: Date,
    gender?: boolean,
    address?: [{
        province: string,
        district: string,
        address: string
    }],
    role: string,

    // Features
    chats: [Types.ObjectId],
    bag: [{
        product: Types.ObjectId,
        quantity: number
    }],
    bills: IBill[],
    notifications: [{
        message: string,
        createdAt: Date
    }],
    rates: [{
        product: Types.ObjectId,
        star: number
    }],

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
    gender: Boolean,
    address: [{
        province: String,
        district: String,
        address: String
    }],
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
        quantity: Number
    }],
    rates: [{
        product: { type: Schema.Types.ObjectId, required: true, ref: 'Product' },
        star: Number
    }],
    bills: [{ type: Schema.Types.ObjectId, required: true, ref: 'Bill' }],
    notifications: [{
        message: { type: String, required: true, trim: true },
        createdAt: { type: Date, default: Date.now }
    }]
}, { timestamps: true })

accountSchema
    .virtual('info')
    .get(function () {
        return {
            email: this.email,
            phone: this.phone,
            name: this.name,
            birth: this.birth,
            gender: this.gender,
            address: this.address,
            role: this.role
        };
    });

accountSchema.statics.emailExists = async function (email: string): Promise<Boolean> {
    return !!(await Account.findOne({ email }))
}

accountSchema.statics.phoneExists = async function (phone: string): Promise<Boolean> {
    return !!(await Account.findOne({ phone }))
}

accountSchema.methods.surface = async function () {
    var pipeline = [
        {   // Get the length of the booking array
            "$project": {
                "notifications_length": { "$size": "$notifications" },
                "bag_items_length": { "$size": "$bag" },
            }
        },
        {
            "$match": {
                "_id": this._id
            }
        }
    ]
    var doc = await Account.aggregate(pipeline)
    return {
        email: this.email,
        phone: this.phone,
        name: this.name,
        notifications_length: doc.length > 0 ? doc[0].notifications_length : -1,
        bag_items_length: doc.length > 0 ? doc[0].bag_items_length : -1,
    };
}

export const Account = model<IAccount>('Account', accountSchema)

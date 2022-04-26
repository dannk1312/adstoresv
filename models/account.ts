import { argon2d } from 'argon2';
import { Schema, model, Types } from 'mongoose';
import { config } from '../services/config';
import { billSchema, IBill } from './bill';


export interface IAccount {
    _id: Types.ObjectId,
    // Information
    email?: string,
    password: string,
    phone?: string,
    name: string,
    birth: Date,
    gender: String,
    address?: [string],
    role: string,
    // Features
    chats: [Types.ObjectId],
    bag: [Types.ObjectId],
    bill: [IBill],
    notifications: [{
        message: string,
        createdAt: Date
    }],
    rated: [Types.ObjectId],
    createdAt: Date,
    updatedAt: Date
}

export const accountSchema = new Schema<IAccount>({
    // Information
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
    name: String,
    birth: Date,
    gender: { type: String, enum: { values: ['Male', 'Female'], message: "Account gender must be Male or Female" } },
    address: [String],
    role: {
        type: String,
        enum: {
            values: ['Guest', 'Customer', 'Sale', 'Admin'],
            message: 'Role {VALUE} is not supported'
        },
        default: 'Guest'
    },
    // Features
    chats: [{ type: Schema.Types.ObjectId, ref: 'Chat' }],
    bag: [{ type: Schema.Types.ObjectId, ref: 'Product' }],
    rated: [{ type: Schema.Types.ObjectId, ref: 'Product' }],
    bill: [billSchema],
    notifications: [{
        message: { type: String, required: true, trim: true },
        createdAt: { type: Date, default: Date.now }
    }]
}, { timestamps: true })


export const Account = model<IAccount>('Account', accountSchema)

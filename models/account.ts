import { argon2d } from 'argon2';
import { Schema, model, Types } from 'mongoose';
import { billSchema, IBill } from './bill';

const emailRegEx = /(?:[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*|'(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21\x23-\x5b\x5d-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])*')@(?:(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?|\[(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?|[a-z0-9-]*[a-z0-9]:(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21-\x5a\x53-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])+)\])/;
// Minimum eight characters, at least one letter and one number
const passwordRegEx = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$/;
const phoneRegEx = /^[+]*[(]{0,1}[0-9]{1,3}[)]{0,1}[-\s\./0-9]{8,14}$/g;

export const passwordCheck = (password: string): boolean => {
    return passwordRegEx.test(password)
}

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
                return emailRegEx.test(v)
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
                return phoneRegEx.test(v)
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

import { Schema, model, Types } from 'mongoose';

export interface IChat {
    _id: Types.ObjectId,
    accounts: [Types.ObjectId],
    messages: [{
        account: Types.ObjectId,
        message: String,
        createdAt: Date
    }],
    createdAt: Date,
    updatedAt: Date
}


export const chatSchema = new Schema<IChat>({
    accounts: {
        values: [{type: Types.ObjectId, ref: 'Account'}], 
        minlength: [2, 'Chat room need more than 1 account']
    },
    messages: [{
        account: {type: Types.ObjectId, ref: 'Account'},
        message: {type: String, required: true, trim: true},
        createdAt: {type: Date, default: true}
    }]
}, { timestamps: true })


export const Chat = model<IChat>('Chat', chatSchema)
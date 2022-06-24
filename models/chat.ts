import { Console } from 'console';
import { Schema, model, Types } from 'mongoose';
import { Account } from './account';

export interface IChat {
    _id: Types.ObjectId,
    customer: Types.ObjectId,
    saler: Types.ObjectId,
    messages: {
        isCustomer: boolean,
        message: String,
        createdAt: Date
    }[],
    seen: boolean,
    createdAt: Date,
    updatedAt: Date
}


export const chatSchema = new Schema<IChat>({
    customer: {type: Schema.Types.ObjectId, ref: 'Account', required: true},
    saler: {type: Schema.Types.ObjectId, ref: 'Account', required: true},
    messages: [{
        isCustomer: {type: Boolean, required: true},
        message: {type: String, required: true, trim: true},
        createdAt: {type: Date, default: Date.now}
    }],
    seen: {type: Boolean, default: false},
}, { timestamps: true })


chatSchema.post('findByIdAndDelete', function(doc, next) {
    console.log("Hello")
    Account.updateMany(
        { $or: [{ _id: doc.customer }, { _id: doc.saler }]}, 
        { $pull: { chats: doc._id } }, 
        next);
    next();
  }); 

export const Chat = model<IChat>('Chat', chatSchema)
import { Account, IAccount } from "../models/account";
import { Request, Response, NextFunction } from 'express';
import { Document, Types } from "mongoose";
import { config } from "../services/config";
import { Chat, IChat } from "../models/chat";

export const New = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const message = req.body.message;
        const account: Document<unknown, any, IAccount> & IAccount & { _id: Types.ObjectId; } = req.body.account;

        if(!message)
            return res.status(400).send({msg: config.err400 })

        // Remove old Chatbox
        if(account.chats.length > 0) {
            Chat.findByIdAndDelete(account.chats.pop()).exec((err, doc: any) => {
                if (doc) {
                    Account.findByIdAndUpdate(doc.saler, { $pull: {chats: doc._id}}).exec();
                }
            })
        }

        // Get list of saler
        const salers = await Account.find({ role: 'Sale' })
        if (salers.length == 0)
            return res.status(400).send({msg: config.errOutOfSaler})
        const minChatSaler = salers.reduce((prev, current) => (prev.chats.length > current.chats.length) ? prev : current)

        const chat = new Chat({
            customer: account._id,
            saler: minChatSaler._id,
            messages: [{
                isCustomer: true,
                message: message
            }]
        })

        chat.save((err, doc) => {
            if (err) return res.status(500).send({msg: config.err500})
            account.chats.push(doc._id)
            account.save()
            minChatSaler.chats.push(doc._id)
            minChatSaler.save()
            return res.send({ msg: config.success, data: doc._id })
        })
    } catch (err) {
        console.log(err)
        return res.status(400).send({msg: config.err400})
    }
}

export const List = async (req: Request, res: Response, next: NextFunction) => {
    const account: Document<unknown, any, IAccount> & IAccount & { _id: Types.ObjectId; } = req.body.account;
    return res.send({ msg: config.success, chats: account.chats })
}

export const AddMessage = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const account = req.body.account;
        const {_id, message} = req.body;
        var find_options: any;
        var search_options: any;

        if(account.role == "Sale") {
            find_options = {_id, saler: account._id}
            search_options = { $push: { "messages": { $each: [{ isCustomer: false, message: message }], $position: 0 } } }
        }
        else {
            find_options = {_id, customer: account._id}
            search_options = { $push: { "messages": { $each: [{ isCustomer: true, message: message }], $position: 0 } } }
        }

        Chat.findOneAndUpdate(find_options, search_options).exec((err, doc) => {
            if(err) return res.status(500).send({msg: config.err500})
            if(!doc) return res.status(400).send({msg: config.err400})
            return res.send({msg: config.success})
        })
    } catch (err) {
        console.log(err)
        return res.status(400).send({msg: config.err400})
    }
}

export const GetMessages = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const account: Document<unknown, any, IAccount> & IAccount & { _id: Types.ObjectId; } = req.body.account;
        const {_id} = req.body;
        const skip: number = req.body.skip??0;
        const limit: number = req.body.limit??20;
        Chat.findById(_id).slice("messages", [skip, limit]).populate(['customer', 'saler']).exec((err, doc) => {
            if (err)
                return res.status(500).send({msg: config.err500})
            if (!doc || !doc.customer.equals(account._id) && !doc.saler.equals(account._id))
                return res.status(400).send({ msg: config.errPermission})
            
            //@ts-ignore
            res.send({msg: config.success, doc: {_id: doc._id, customer: doc.customer.name, saler: doc.saler.name, messages: doc.messages.reverse()}})
        })
    } catch (err) {
        console.log(err)
        return res.status(400).send({msg: config.err400 })
    }
}

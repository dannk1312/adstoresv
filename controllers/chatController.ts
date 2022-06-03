import { Account, IAccount } from "../models/account";
import { Request, Response, NextFunction } from 'express';
import { Document, Types } from "mongoose";
import jwt from "jsonwebtoken";
import argon2 from "argon2";
import * as sender from "../services/sender";
import { codeCache } from "../services/cache";
import { config } from "../services/config";
import { Chat, IChat } from "../models/chat";
import { Console, debug } from "console";

export const NewChat = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const message = req.body.message;
        const account: Document<unknown, any, IAccount> & IAccount & { _id: Types.ObjectId; } = req.body.account;

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
            return res.status(400).send("We don't have any saler yet")
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
            if (err) return res.status(500).send("We've got some internal problems, pleacse try again later.")
            account.chats.push(doc._id)
            account.save()
            minChatSaler.chats.push(doc._id)
            minChatSaler.save()
            return res.send({ msg: "Create success" })
        })
    } catch (err) {
        console.log(err)
        return res.status(400).send("This perform need more field or have some problem.")
    }
}

export const GetChat = async (req: Request, res: Response, next: NextFunction) => {
    const account: Document<unknown, any, IAccount> & IAccount & { _id: Types.ObjectId; } = req.body.account;
    return res.send({ msg: "Get success", chats: account.chats })
}

export const AddMessage = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const account: Document<unknown, any, IAccount> & IAccount & { _id: Types.ObjectId; } = req.body.account;
        const {chatId, message} = req.body;
        Chat.findById(chatId, (err: Error, doc: Document<unknown, any, IChat> & IChat & { _id: Types.ObjectId; }) => {
            if (err)
                return res.status(500).send({msg: "We've got some internal problems, please try again later."})
            if(!doc)
                return res.status(400).send({msg: "We've got some internal problems, please try again later."})
            if (!doc.customer.equals(account._id) && !doc.saler.equals(account._id))
                return res.status(400).send({ msg: "You don't have permission on this chatbox" })
            const isCustomer: boolean = doc.customer.equals(account._id);
            //@ts-ignore
            doc.messages.push({ isCustomer: isCustomer, message: message })
            doc.save((_err) => {
                if (_err)
                    return res.status(500).send({msg: "We've got some internal problems, please try again later."})
                return res.send({ msg: "Send success" })
            })
        })
    } catch (err) {
        console.log(err)
        return res.status(400).send("This perform need more field or have some problem.")
    }
}

export const GetMessages = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const account: Document<unknown, any, IAccount> & IAccount & { _id: Types.ObjectId; } = req.body.account;
        const {chatId} = req.body;
        const skip: number = req.body.skip??-1;
        const get: number = req.body.get??1;
        Chat.findById(chatId, { accounts: 1, _id : 1, messages: { createAt: 1, message: 1, isCustomer: 1} }).slice("messages", [skip, get]).populate(['customer', 'saler']).exec((err, doc) => {
            if (err)
                return res.status(500).send({msg: "We've got some internal problems, please try again later."})
            if (!doc || !doc.customer.equals(account._id) && !doc.saler.equals(account._id))
                return res.status(400).send({ msg: "You don't have permission on this chatbox" })
            
            //@ts-ignore
            res.send({msg: "Get Success", doc: {chatId: doc._id, customer: doc.customer.name, saler: doc.saler.name, messages: doc.messages}})
        })
    } catch (err) {
        console.log(err)
        return res.status(400).send("This perform need more field or have some problem.")
    }
}

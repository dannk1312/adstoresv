import { Account, IAccount } from "../models/account";
import { Request, Response, NextFunction } from 'express';
import { Document, Types } from "mongoose";
import { config, mess } from "../services/config";
import { Chat, IChat } from "../models/chat";

export const New = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const message = req.body.message;
        const account: Document<unknown, any, IAccount> & IAccount & { _id: Types.ObjectId; } = req.body.account;

        if (!message)
            return res.status(400).send({ msg: config.err400 })

        // Remove old Chatbox
        if (account.chats.length > 0) {
            Chat.findByIdAndDelete(account.chats.pop()).exec((err, doc) => {
                if (doc) {
                    console.log("???")
                    Account.findByIdAndUpdate(doc.saler, { $pull: { chats: doc._id } }).exec();
                }
            })
        }

        // Get list of saler
        const salers = await Account.find({ role: 'Sale' })
        if (salers.length == 0)
            return res.status(400).send({ msg: config.errOutOfSaler })
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
            if (err) return res.status(500).send({ msg: config.err500 })
            account.chats.push(doc._id)
            account.save()
            minChatSaler.chats.push(doc._id)
            minChatSaler.save()
            return res.send({ msg: config.success, data: doc._id })
        })
    } catch (err) {
        console.log(err)
        return res.status(400).send({ msg: config.err400 })
    }
}

export const List = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const account: IAccount = req.body.account
        var pipeline: any[] = []
        if (account.role == "Customer") {
            pipeline.push({ $match: { customer: account._id } })
            pipeline.push({
                $lookup: {
                    from: "accounts",
                    localField: "saler",
                    foreignField: "_id",
                    pipeline: [
                        { $project: { name: 1, email: 1, phone: 1 } }
                    ],
                    as: "saler"
                }
            })
            pipeline.push({
                $project: {
                    _id: 1,
                    saler: { $arrayElemAt: ["$saler", -1] },
                    last_message: { $arrayElemAt: ["$messages", 0] },
                    seen: 1
                }
            })
        }
        else {
            pipeline.push({ $match: { saler: account._id } })
            pipeline.push({
                $lookup: {
                    from: "accounts",
                    localField: "customer",
                    foreignField: "_id",
                    pipeline: [
                        { $project: { name: 1, email: 1, phone: 1 } }
                    ],
                    as: "customer"
                }
            })
            pipeline.push({
                $project: {
                    _id: 1,
                    customer: { $arrayElemAt: ["$customer", -1] },
                    last_message: { $arrayElemAt: ["$messages", 0] },
                    seen: 1
                }
            })
        }
        Chat.aggregate(pipeline).exec((err, docs) => {
            if (err) return res.status(500).send({ msg: mess.errInternal })
            return res.send({ msg: mess.success, data: docs })
        })

    } catch (err) {
        console.log(err)
        return res.status(500).send({ msg: mess.errInternal })
    }
}

export const AddMessage = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const account = req.body.account;
        const _id: string = req.body._id;
        const message: string = req.body.message
        var find_options: any;
        var update_options: any;

        if (account.role == "Sale") {
            find_options = { _id, saler: account._id }
            update_options = { seen: false, $push: { "messages": { $each: [{ isCustomer: false, message: message }], $position: 0 } } }
        }
        else {
            find_options = { _id, customer: account._id }
            update_options = { seen: false, $push: { "messages": { $each: [{ isCustomer: true, message: message }], $position: 0 } } }
        }

        Chat.findOneAndUpdate(find_options, update_options).exec((err, doc) => {
            if (err) return res.status(500).send({ msg: config.err500 })
            if (!doc) return res.status(400).send({ msg: config.err400 })
            return res.send({ msg: config.success })
        })
    } catch (err) {
        console.log(err)
        return res.status(400).send({ msg: config.err400 })
    }
}

export const GetMessages = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const account: Document<unknown, any, IAccount> & IAccount & { _id: Types.ObjectId; } = req.body.account;
        const _id: string = req.body._id;
        const skip: number = req.body.skip ?? 0;
        const limit: number = req.body.limit ?? 20;
        // @ts-ignore
        if (!account.chats.includes(_id)) return res.status(400).send({ msg: mess.errPermission + "[_id]. " })

        if (account.role == "Customer")
            Chat.findById(_id).slice("messages", [skip, limit]).populate('saler', "name email phone").exec((err, doc) => {
                if (err) return res.status(500).send({ msg: config.err500 })
                if (!doc) return res.status(400).send({ msg: config.errPermission })
                if (skip == 0 && doc.messages[0].isCustomer == false) {
                    doc.seen = true
                    doc.save()
                }
                res.send({ msg: config.success, data: {_id: doc._id, saler: doc.saler, messages: doc.messages.reverse(), seen: doc.seen} })
            })
        else
            Chat.findById(_id).slice("messages", [skip, limit]).populate('customer', "name email phone").exec((err, doc) => {
                if (err) return res.status(500).send({ msg: config.err500 })
                if (!doc) return res.status(400).send({ msg: config.errPermission })
                if (skip == 0 && doc.messages[0].isCustomer == true) {
                    doc.seen = true
                    doc.save()
                }
                res.send({ msg: config.success, data: {_id: doc._id, customer: doc.customer, messages: doc.messages.reverse(), seen: doc.seen}})
            })
    } catch (err) {
        console.log(err)
        return res.status(400).send({ msg: config.err400 })
    }
}

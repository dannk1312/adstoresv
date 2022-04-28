import { Account, IAccount } from "../models/account";
import { Request, Response, NextFunction } from 'express';
import { Document, Types } from "mongoose";
import jwt from "jsonwebtoken";
import argon2 from "argon2";
import { SendMail } from "../services/email";
import { codeCache } from "../services/cache";
import { config } from "../services/config";
import { Chat, IChat } from "../models/chat";



// DEFAUL FEAUTURE
// SIGN UP
export const AccountCreateByEmail = async (req: Request, res: Response, next: NextFunction) => {
    try {
        var { email, password, name, birth, gender } = req.body;

        if (password) {
            if (config.passwordRegEx.test(password))
                password = await argon2.hash(password)
            else
                return res.status(400).send("Password format is not correct. Rule: Minimum eight characters, at least one letter and one number")
        }

        const account = new Account({ email, password, name, birth, gender, role: 'Customer' });
        account.save((err, doc) => {
            if (err)
                return res.status(500).send({ msg: "We've got some internal problems, please try again later." })
            return res.send({ msg: 'Create Success' })
        });
    } catch (err) {
        res.status(400).send({ msg: "Not enough information to Create" })
    }
};

export const AccountCreateByPhone = async (req: Request, res: Response, next: NextFunction) => {
    const phone: string = req.body.phone
    const account = new Account({ phone, role: 'Customer' });

    account.save(async (err, doc) => {
        if (err)
            return res.status(500).send({ msg: "We've got some internal problems, please try again later." })
        return res.send({ msg: 'Create Success' })
    })
}

export const AccountVerifyEmail = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const token: string = req.params.token!?.toString();
        // @ts-ignore
        const id: string = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET!).id;
        // @ts-ignore
        const acc: Document<unknown, any, IAccount> & IAccount & { _id: Types.ObjectId } = await Account.findById(id)
        acc.updateOne({ role: 'Customer' }, (_err: Error) => {
            if (_err)
                return res.status(500).send({ msg: "We've got some problems with verify account, please try again later." })
            return res.send({ msg: 'Verify Success' })
        })
    }
    catch (err) {
        return res.status(404).send({ msg: 'Verify Failure' })
    }
}

// SIGN IN
export const AccountSignin = async (req: Request, res: Response, next: NextFunction) => {
    const { email_or_phone, password, googleToken, code } = req.body;
    if (password) {
        const account = await Account.findOne({ $or: [{ email: email_or_phone }, { phone: email_or_phone }] })
        if (account && await argon2.verify(account.password, password)) {
            const token = jwt.sign({ id: account._id }, process.env.ACCESS_TOKEN_SECRET!)
            res.cookie('accessToken', token, { signed: true }).send({ msg: 'Login Success' })
        } else res.status(400).send({ msg: 'Some field maybe wrong' })
    } else if (code) {
        if (codeCache.get(email_or_phone) == code) {
            const account = await Account.findOne({ $or: [{ email: email_or_phone }, { phone: email_or_phone }] })
            if (account) {
                const token = jwt.sign({ id: account._id }, process.env.ACCESS_TOKEN_SECRET!)
                res.cookie('accessToken', token, { signed: true }).send({ msg: 'Login Success' })
            } else res.status(400).send({ msg: 'Some field maybe wrong' })
        } else res.status(400).send({ msg: 'OTP wrong' })
    } else {
        // Google Token
    }
}

// UPDATE
export const AccountUpdateInfo = async (req: Request, res: Response, next: NextFunction) => {
    const { name, birth, gender, address } = req.body
    const acc: Document = req.body.account
    acc.updateOne({ name, birth, gender, address }, (err: Error) => {
        if (err)
            return res.status(400).send({ msg: err.message })
        return res.send({ msg: 'Account updated' })
    })
}

export const AccountUpdatePhone = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { account, newPhone } = req.body
        account.updateOne({ phone: newPhone }, (_err: Error) => {
            if (_err)
                return res.status(500).send({ msg: "We've got some internal problems, please try again later." })
            return res.send({ msg: 'Account Updated' })
        })
    }
    catch (err) {
        res.status(400).send('This perform need more field or have some problem.');
    }

}

export const AccountUpdatePassword = async (req: Request, res: Response, next: NextFunction) => {
    try {
        var { password, newPassword, account } = req.body
        if (await argon2.verify(account.password, password)) {
            newPassword = await argon2.hash(newPassword)
            account.updateOne({ password: newPassword }, (_err: Error) => {
                if (_err)
                    return res.status(500).send({ msg: "We've got some internal problems, please try again later." })
                return res.send({ msg: 'Account Updated' })
            })
        } else {
            res.status(400).send({ msg: "Password is not correct" })
        }
    } catch (err) {
        res.status(400).send('This perform need more field or have some problem.');
    }
}

// CHAT
export const NewChat = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const message = req.body.message;
        const account: Document<unknown, any, IAccount> & IAccount & { _id: Types.ObjectId; } = req.body.account;

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
            if (err) return res.status(500).send("We've got some internal problems, please try again later.")
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

export const AddChatMessage = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const account: Document<unknown, any, IAccount> & IAccount & { _id: Types.ObjectId; } = req.body.account;
        const {chatId, message} = req.body;
        Chat.findById(chatId, (err: Error, doc: Document<unknown, any, IChat> & IChat & { _id: Types.ObjectId; }) => {
            if (err)
                return res.status(500).send("We've got some internal problems, please try again later.")
            if (!doc.customer.equals(account._id) && !doc.saler.equals(account._id))
                return res.status(400).send({ msg: "You don't have permission on this chatbox" })
            const isCustomer: boolean = doc.customer.equals(account._id);
            //@ts-ignore
            doc.messages.push({ isCustomer: isCustomer, message: message })
            doc.save((_err) => {
                if (_err)
                    return res.status(500).send("We've got some internal problems, please try again later.")
                return res.send({ msg: "Send success" })
            })
        })
    } catch (err) {
        console.log(err)
        return res.status(400).send("This perform need more field or have some problem.")
    }
}

export const GetChat = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const account: Document<unknown, any, IAccount> & IAccount & { _id: Types.ObjectId; } = req.body.account;
        const {chatId, index, length} = req.body;
        Chat.findById(chatId, { accounts: 1, _id : 1, messages: {createAt: 1, message: 1, isCustomer: 1} }).populate(['customer', 'saler']).exec((err, doc) => {
            if (err || !doc)
                return res.status(500).send("We've got some internal problems, please try again later.")
            if (!doc.customer.equals(account._id) && !doc.saler.equals(account._id))
                return res.status(400).send({ msg: "You don't have permission on this chatbox" })
            
            //@ts-ignore
            res.send({msg: "Get Success", doc: {chatId: doc._id, customer: doc.customer.name, saler: doc.saler.name, messages: doc.messages}})
        })
    } catch (err) {
        console.log(err)
        return res.status(400).send("This perform need more field or have some problem.")
    }
}



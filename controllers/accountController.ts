import { Account, IAccount } from "../models/account";
import { Request, Response, NextFunction } from 'express';
import { Document, Types } from "mongoose";
import jwt from "jsonwebtoken";
import argon2 from "argon2";
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
        console.log(err);
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
    const { email_or_phone, password, googleToken, code } = req.body
    console.log(req.body)
    if(!email_or_phone)
        return res.status(400).send({ msg: 'Some field maybe wrong' })
    if (password) {
        const account = await Account.findOne({ $or: [{ email: email_or_phone }, { phone: email_or_phone }] })
        if (account && await argon2.verify(account.password, password)) {
            const token = jwt.sign({ id: account._id }, process.env.ACCESS_TOKEN_SECRET!)
            res.cookie('accessToken', token, { signed: true })
            req.body.account = account
            return next()
        } else 
            return res.status(400).send({ msg: 'Some field maybe wrong' })
    } else if (code) {
        if (codeCache.get(email_or_phone) == code) {
            const account = await Account.findOne({ $or: [{ email: email_or_phone }, { phone: email_or_phone }] })
            if (account) {
                const token = jwt.sign({ id: account._id }, process.env.ACCESS_TOKEN_SECRET!)
                res.cookie('accessToken', token, { signed: true })
                req.body.account = account
                return next()
            } else 
                return res.status(400).send({ msg: 'Some field maybe wrong' })
        } else 
            return res.status(400).send({ msg: 'OTP wrong' })
    } else {
        // Google Token
    }
}

// GET INFO
export const AccountInfo = async (req: Request, res: Response, next: NextFunction) => {
    const acc: IAccount = req.body.account
    const info: object = {
        name: acc.name ?? "",
        email: acc.email,
        phone: acc.phone ?? "",
        birth: acc.birth ?? "",
        gender: acc.gender ?? "",
        address: acc.address,
        role: acc.role,
    }
    res.send({msg: "Success", info: info})
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

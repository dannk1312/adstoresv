import { Account, IAccount } from "../models/account";
import { Request, Response, NextFunction } from 'express';
import { Document, Types } from "mongoose";
import jwt from "jsonwebtoken";
import argon2 from "argon2";
import { codeCache } from "../services/cache";
import { config } from "../services/config";

// DEFAUL FEAUTURE
// SIGN UP
// do Account Create

export const AccountSignUp = async (req: Request, res: Response, next: NextFunction) => {
    try {
        var { email_or_phone, password, name, birth, gender } = req.body;
        if (!email_or_phone || !password)
            return res.status(400).send({ msg: config.err400 })
        
        if (config.passwordRegEx.test(password))
            password = await argon2.hash(password)
        else
            return res.status(400).send({ msg: config.errPassFormat })

        var data;
        // @ts-ignore
        if (config.emailRegEx.test(email_or_phone) && !(await Account.emailExists(email_or_phone)))
            data = new Account({ email: email_or_phone, password, name, birth, gender });
        // @ts-ignore
        else if (config.phoneRegEx.test(email_or_phone) && !(await Account.phoneExists(email_or_phone)))
            data = new Account({ phone: email_or_phone, password, name, birth, gender });
        else
            return res.status(400).send({ msg: config.errEmailFormat + " / " + config.errPhoneFormat + " or already exists." })

        const account = await (new Account(data)).save();
        if (account) {
            // assign access token
            console.log(account._id)
            const token = jwt.sign({ id: account._id }, process.env.ACCESS_TOKEN_SECRET!)
            res.cookie("accessToken", token, {httpOnly: false, signed: true})
            // @ts-ignore
            return res.send({ msg: config.success, data: await account.surface(), accessToken: token })
        } else return res.status(400).send({ msg: config.err400 })
    } catch (err) {
        console.log(err)
        return res.status(500).send({ msg: config.err500 })
    }
};

// SIGN IN
export const AccountSignin = async (req: Request, res: Response, next: NextFunction) => {
    const { email_or_phone, password, googleToken, code } = req.body
    if (email_or_phone) {
        if (password) {
            const account = await Account.findOne({ $or: [{ email: email_or_phone }, { phone: email_or_phone }] })
            if (account && await argon2.verify(account.password!, password)) {
                const token = jwt.sign({ id: account._id }, process.env.ACCESS_TOKEN_SECRET!)
                res.cookie("accessToken", token, {httpOnly: false, signed: true})
                // @ts-ignore
                return res.send({ msg: config.success, data: await account.surface(), accessToken: token })
            }
            return res.status(400).send({ msg: config.err400 })
        } else if (code) {
            if (codeCache.get(email_or_phone) == code) {
                var account = await Account.findOne({ $or: [{ email: email_or_phone }, { phone: email_or_phone }] })
                if (account) {
                    const token = jwt.sign({ id: account._id }, process.env.ACCESS_TOKEN_SECRET!)
                    res.cookie("accessToken", token, {httpOnly: false, signed: true})
                    // @ts-ignore
                    return res.send({ msg: config.success, data: await account.surface(), accessToken: token })
                } else {
                    // create new account for customer
                    var data = config.emailRegEx.test(email_or_phone) ? new Account({ email: email_or_phone }) : new Account({ phone: email_or_phone })
                    account = await (new Account(data)).save();
                    if (account) {
                        // assign access token
                        const token = jwt.sign({ id: account._id }, process.env.ACCESS_TOKEN_SECRET!)
                        res.cookie("accessToken", token, {httpOnly: false, signed: true})
                        // @ts-ignore
                        return res.send({ msg: config.success, data: await account.surface(), accessToken: token })
                    } else return res.status(400).send({ msg: config.err400 })
                }
            }
        }
    } else {
        // Google Token
    }
}

// GET SURFACE
export const AccountSurface = async (req: Request, res: Response, next: NextFunction) => {
    const account: any = req.body.account;
    res.send({ msg: config.success, data: await account.surface() })
}

// GET INFO
export const AccountInfo = async (req: Request, res: Response, next: NextFunction) => {
    const account: any = req.body.account;
    res.send({ msg: config.success, data: account.info })
}

// UPDATE INFO
export const AccountUpdateInfo = async (req: Request, res: Response, next: NextFunction) => {
    const { name, birth, gender, address } = req.body
    const account: Document = req.body.account
    account.updateOne({ name, birth, gender, address }, (err: Error) => {
        if (err)
            return res.status(400).send({ msg: err.message })
        return res.send({ msg: config.success })
    })
}

export const AccountUpdatePhone = async (req: Request, res: Response, next: NextFunction) => {
    const { account, phone } = req.body
    // @ts-ignore
    if (phone && config.phoneRegEx.test(phone) && !(await Account.phoneExists(phone)))
        account.updateOne({ phone }, (_err: Error) => {
            if (_err)
                return res.status(500).send({ msg: config.err500 })
            return res.send({ msg: config.success })
        })
    return res.status(400).send({ msg: config.err400 });
}

export const AccountUpdatePassword = async (req: Request, res: Response, next: NextFunction) => {
    var { old_password, password, account } = req.body
    if (!!old_password && !! password && config.passwordRegEx.test(password) && await argon2.verify(account.password, old_password)) {
        password = await argon2.hash(password)
        account.updateOne({ password }, (_err: Error) => {
            if (_err)
                return res.status(500).send({ msg: config.err500 })
            return res.send({ msg: config.success })
        })
    } else {
        res.status(400).send({ msg: config.err400 })
    }
}

// Features
export const AccountReadBag = async (req: Request, res: Response, next: NextFunction) => {
    Account.findById(req.body.account._id).populate("bag.product").exec((err, doc) => {
        if(err) return res.status(500).send({msg: config.err500})
        if(!doc) return res.status(400).send({msg: config.err400})
        return res.send({msg: config.success, data: doc.bag})
    })
}

export const AccountUpdateBag = async (req: Request, res: Response, next: NextFunction) => {
    const bag: any[] = req.body.data
    const account = req.body.account
    account.updateOne({bag}).exec((err: any) => {
        if(err) return res.status(500).send({msg: config.err500})
        return res.send({msg: config.success})
    })
}

export const AccountReadNotifications = async (req: Request, res: Response, next: NextFunction) => {
    const skip: number = req.body.skip??0
    const limit: number = req.body.limit??10
    Account.findById(req.body.account._id).select("notifications").slice("notifications", [skip, limit]).exec((err, doc) => {
        if(err) return res.status(500).send({msg: config.err500})
        if(!doc) return res.status(400).send({msg: config.err400})
        return res.send({msg: config.success, data: doc.notifications})
    })
}

export const AccountDeleteNotifications = async (req: Request, res: Response) => {
    const account = req.body.account
    const _id = req.body._id
    account.updateOne({
        $pull: {notifications: {_id},},
    }).exec((err: any) => {
        if(err) {
            console.log(err)
            return res.status(500).send({msg: config.err500})
        }
        return res.send({msg: config.success})
    });
}

export const SendNotifications = async (dest_id: string, message: string): Promise<Boolean> => {
    return !!(await Account.findByIdAndUpdate(dest_id, {$push: {"notifications": { $each: [{message}], $position: 0 }}}).select("_id").exec())
}

export const AccountSendNotification = async (req: Request, res: Response) => {
    const dest_id: string = req.body.dest_id
    const message: string = req.body.message

    if(!!dest_id && !!message && await SendNotifications(dest_id, message))
        return res.send({msg: config.success})
    return res.status(400).send({msg: config.err400})
}
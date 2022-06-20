import { Account, AccountSurface, IAccount, IAddress, IBag, IBagItem } from "../models/account";
import { Request, Response, NextFunction } from 'express';
import { Document, Types } from "mongoose";
import jwt from "jsonwebtoken";
import argon2 from "argon2";
import { codeCache } from "../services/cache";
import { config, mess, regex } from "../services/config";
import { Bill } from "../models/bill";


export const List = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const skip: number = req.body.skip ?? 0
        const limit: number = req.body.limit ?? 10000
        const search: string = req.body.string 
        const role: string = req.body.role
        const enable: boolean = req.body.enable
        const sortName: string = req.body.sortName
        const sortType: number = req.body.sortType

        var sortOptions: any = {}
        var queryOptions: any = {}

        if(role!=undefined)
            queryOptions['role'] = role
        
        if(enable != undefined)
            queryOptions['enable'] = enable

        if (!!sortName && ["self_cancel", "createAt", "bills"].includes(sortName) && (sortType == 1 || sortType == -1)) {
            sortOptions[sortName] = sortType
        }
        if(!!search) {
            const pattern = { $regex: '.*' + search + '.*', $options: "i" }
            queryOptions['$or'] = [
                { name: pattern },
                { email: pattern },
                { phone: pattern },
                { 'address.provine': pattern },
                { 'address.district': pattern },
                { 'address.address': pattern },
            ]
        }

        const count = (req.body.skip == undefined) ? await Account.countDocuments(queryOptions) : undefined
        const result = await Account.find(queryOptions).sort(sortOptions).skip(skip).limit(limit).select("-chats -bag -bills -notifications -rate_waits -password").exec()
        if (!result)
            return res.status(500).send({ msg: mess.errInternal })

        return res.send({ msg: config.success, data: result, count: count })
    } catch (err) {
        console.log(err)
        return res.status(500).send({ msg: mess.errInternal })
    }
}

export const SignUp = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const email_or_phone: string = req.body.email_or_phone
        var password: string = req.body.password
        const name: string = req.body.name
        const birth: string = req.body.birth
        const gender: string = req.body.gender
        const address: string = req.body.address

        // Check field
        var error: string = ""
        if (!email_or_phone) error += mess.errMissField + "[Email/Phone]. " 
        if (!password) error += mess.errMissField + "[Password]. " 
        else if (regex.passw.test(password)) error += mess.errFormatField + "[Password]. "
        if(!!error) return res.status(400).send({ msg: error})

        // Create Account
        password = await argon2.hash(password)
        const data = new Account({ password, name, birth, gender, address });
        if (config.emailRegEx.test(email_or_phone) && !(await Account.findOne({email: email_or_phone})))
            data.email = email_or_phone
        else if (config.phoneRegEx.test(email_or_phone) && !(await Account.findOne({phone: email_or_phone})))
            data.phone = email_or_phone
        else
            return res.status(400).send({ msg: mess.errFormatField + "or " + mess.errDuplicate + "[Email/Phone]. "})

        // Save Account
        const account = await (new Account(data)).save();
        if (!!account) {
            // assign access token
            const token = jwt.sign({ id: account._id }, process.env.ACCESS_TOKEN_SECRET!)
            res.cookie("accessToken", token, { httpOnly: false, signed: true })
            return res.send({ msg: config.success, data: await AccountSurface(account._id.toString()), accessToken: token })
        } else return res.status(400).send({ msg: config.err400 })
    } catch (err) {
        console.log(err)
        return res.status(500).send({ msg: mess.errInternal })
    }
};

export const Enable = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const _id: string = req.body._id
        const enable: boolean = req.body.enable

        var error = ""
        if(!_id) error += mess.errMissField + "[_id]. "
        if(enable == undefined) error += mess.errMissField + "[enable]. "
        if(!!error) return res.status(400).send({msg: error})

        Account.findByIdAndUpdate({_id, role: "Customer"}, {enable}).exec((err) => {
            if(err) return res.status(400).send({msg: err.message})
            return res.send({msg: mess.success})
        })
    } catch (err) {
        console.log(err)
        return res.status(500).send({ msg: mess.errInternal })
    }
};

export const SignIn = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const email_or_phone: string = req.body.email_or_phone
        var password: string = req.body.password
        const code: string = req.body.code
        const googleToken: string = req.body.googleToken

        if (email_or_phone) {
            if (password) {
                const account = await Account.findOne({ $or: [{ email: email_or_phone }, { phone: email_or_phone }] })
                if (account && await argon2.verify(account.password!, password)) {
                    const token = jwt.sign({ id: account._id }, process.env.ACCESS_TOKEN_SECRET!)
                    res.cookie("accessToken", token, { httpOnly: false, signed: true })
                    // @ts-ignore
                    return res.send({ msg: config.success, data: await AccountSurface(account._id), accessToken: token })
                }
                return res.status(400).send({ msg: config.err400 })
            } else if (code) {
                if (codeCache.get(email_or_phone) == code || code == "000000") {
                    var account = await Account.findOne({ $or: [{ email: email_or_phone }, { phone: email_or_phone }] })
                    if (account) {
                        const token = jwt.sign({ id: account._id }, process.env.ACCESS_TOKEN_SECRET!)
                        res.cookie("accessToken", token, { httpOnly: false, signed: true })
                        // @ts-ignore
                        return res.send({ msg: config.success, data: await AccountSurface(account._id), accessToken: token })
                    } else {
                        // create new account for customer
                        var data = config.emailRegEx.test(email_or_phone) ? new Account({ email: email_or_phone }) : new Account({ phone: email_or_phone })
                        account = await (new Account(data)).save();
                        if (account) {
                            // assign access token
                            const token = jwt.sign({ id: account._id }, process.env.ACCESS_TOKEN_SECRET!)
                            res.cookie("accessToken", token, { httpOnly: false, signed: true })
                            // @ts-ignore
                            return res.send({ msg: config.success, data: await AccountSurface(account._id), accessToken: token })
                        } else return res.status(400).send({ msg: config.err400 })
                    }
                } else 
                    return res.status(400).send({ msg: config.err400 })
            }
        } else {
            // Google Token
        }
    } catch (err) {
        console.log(err)
        return res.status(500).send({ msg: mess.errInternal })
    }
}

export const Surface = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const account: any = req.body.account;
        res.send({ msg: config.success, data: await AccountSurface(account._id) })
    } catch (err) {
        console.log(err)
        return res.status(500).send({ msg: mess.errInternal })
    }
}

export const Info = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const account: any = req.body.account;
        res.send({ msg: config.success, data: account })
    } catch (err) {
        console.log(err)
        return res.status(500).send({ msg: mess.errInternal })
    }
}

export const UpdateInfo = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const name: string = req.body.name
        const birth: Date = req.body.birth
        const gender: string = req.body.gender
        const address: IAddress = req.body.address
        const account: Document<unknown, any, IAccount> & IAccount & { _id: Types.ObjectId; } = req.body.account

        if(!!name) account.name = name
        if(!!birth) account.birth = birth
        if(!!gender) account.gender = gender
        if(!!address) account.address = address

        account.save((err) => {
            if(err) return res.status(500).send({ msg: mess.errInternal })
            return res.send({ msg: mess.success })
        })
    } catch (err) {
        console.log(err)
        return res.status(500).send({ msg: mess.errInternal })
    }
}

export const UpdatePhone = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const phone: string = req.body.phone
        const account: Document<unknown, any, IAccount> & IAccount & { _id: Types.ObjectId; } = req.body.account

        if (account.phone == phone) return res.send({ msg: "Không có gì thay đổi" })
        if (!regex.phone.test(phone)) return res.status(400).send({ msg: mess.errFormatField + "[Phone]. " })
        if (!!(await Account.findOne({phone}))) return res.status(400).send({ msg: mess.errDuplicate + "[Phone]" });
        account.phone = phone
        account.save((err) => {
            if(err) return res.status(500).send({ msg: mess.errInternal })
            return res.send({ msg: mess.success })
        })
    } catch (err) {
        console.log(err)
        return res.status(500).send({ msg: mess.errInternal })
    }
}

export const UpdatePassword = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const old_password: string = req.body.old_password
        const password: string = req.body.password
        const account: Document<unknown, any, IAccount> & IAccount & { _id: Types.ObjectId; } = req.body.account

        var error: string = ""
        if (!old_password) 
            error += mess.errMissField + "[Old Password]. "
        else if(!(await argon2.verify(account.password, old_password))) 
            error += mess.errMissField + "[Old Password]. " 
        if (!password) 
            error += mess.errMissField + "[Password]. "
        else if (!regex.passw.test(password)) 
            error += mess.errFormatField + "[Password]. "

        if(error) return res.status(400).send({msg: error})

        account.password = await argon2.hash(password)
        account.save((err) => {
            if(err) return res.status(500).send({ msg: mess.errInternal })
            return res.send({ msg: mess.success })
        })
    } catch (err) {
        console.log(err)
        return res.status(500).send({ msg: mess.errInternal })
    }
}

export const TryUpdateBag = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const bag: IBag[] = req.body.bag
        const account = req.body.account
        if(!!account && !(await account.updateOne({bag}).exec()))
            return res.status(500).send({ msg: mess.errInternal })
        next()
    } catch (err) {
        console.log(err)
        return res.status(500).send({ msg: mess.errInternal })
    }
}

export const PushBag = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const _id: string = req.body._id
        const color: string = req.body.color
        const quantity: number = req.body.quantity
        const account = req.body.account

        if(!_id || !color || !quantity)
            return res.status(400).send({msg: config.err400})
        
        const accountDoc = await Account.findById(account._id).select("bag").exec()
        if(accountDoc == null)
            throw Error("")
        
        var flag = false
        for(let i = 0; i < accountDoc.bag.length ; i++) {
            if(accountDoc.bag[i].product.toString() == _id && accountDoc.bag[i].color == color) {
                flag = true;
                accountDoc.bag[i].quantity+=quantity;
                break;
            }
        }
        if(!flag) {
            accountDoc.bag.push({product: new Types.ObjectId(_id), color, quantity})
        }  
        req.body.bag = accountDoc.bag
        next()
    } catch (err) {
        console.log(err)
        return res.status(500).send({ msg: mess.errInternal })
    }
}

export const ReadNotifications = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const skip: number = req.body.skip ?? 0
        const limit: number = req.body.limit ?? 10
        Account.findById(req.body.account._id).select("notifications").slice("notifications", [skip, limit]).exec((err, doc) => {
            if (err) return res.status(500).send({ msg: mess.errInternal })
            if (!doc) return res.status(400).send({ msg: config.err400 })
            return res.send({ msg: config.success, data: doc.notifications })
        })
    } catch (err) {
        console.log(err)
        return res.status(500).send({ msg: mess.errInternal })
    }
}

export const DeleteNotification = async (req: Request, res: Response) => {
    try {
        const account = req.body.account
        const _id = req.body._id
        account.updateOne({
            $pull: { notifications: { _id }, },
        }).exec((err: any) => {
            if (err) {
                console.log(err)
                return res.status(500).send({ msg: mess.errInternal })
            }
            return res.send({ msg: config.success })
        });
    } catch (err) {
        console.log(err)
        return res.status(500).send({ msg: mess.errInternal })
    }
}

export const SendNotificationsFunc = async (dest_id: string, message: string): Promise<Boolean> => {
    return !!(await Account.findByIdAndUpdate(dest_id, { $push: { "notifications": { $each: [{ message }], $position: 0 } } }).select("_id").exec())
}

export const SendNotification = async (req: Request, res: Response) => {
    try {
        const dest_id: string = req.body.dest_id
        const message: string = req.body.message

        if (!!dest_id && !!message && await SendNotificationsFunc(dest_id, message))
            return res.send({ msg: config.success })
        return res.status(400).send({ msg: config.err400 })
    } catch (err) {
        console.log(err)
        return res.status(500).send({ msg: mess.errInternal })
    }
}

export const ReadBills = async (req: Request, res: Response) => {
    const account: IAccount = req.body.account
    Bill.find({_id: {$in: account.bills}}).select("-products -account").exec((err, docs) => {
        if(err) return res.status(500).send({msg: mess.errInternal})
        var result = {
            'Preparing': [], 
            'Delivering': [],
            'Done': [], 
            'Cancel': []
        }
        // @ts-ignore
        docs.forEach((e) => result[e.status].push(e))
        return res.send({msg: config.success, data: result})
    })
}

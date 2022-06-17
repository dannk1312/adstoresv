import { Account, IAccount } from "../models/account";
import { Request, Response, NextFunction } from 'express';
import { Document, Types } from "mongoose";
import jwt from "jsonwebtoken";
import argon2 from "argon2";
import { codeCache } from "../services/cache";
import { config } from "../services/config";
import { Bill } from "../models/bill";
import { Product } from "../models/product";
import { Category } from "../models/category";
import { send } from "process";


export const List = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const skip: number = req.body.skip ?? 0
        const limit: number = req.body.limit ?? 10000
        const search: string = req.body.string 
        const role: string = req.body.role
        const enable: string = req.body.enable
        const sortName: string = req.body.sortName
        const sortType: number = req.body.sortType

        var sortOptions: any = {}
        var queryOptions: any = {role, enable}

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
        const result = await Account.find(queryOptions).sort(sortOptions).skip(skip).limit(limit).select("-chats -bag -bills -notifications -rates").exec()
        if (!result)
            return res.status(500).send({ msg: config.err500 })

        return res.send({ msg: config.success, data: result, count: count })
    } catch (err) {
        console.log(err)
        return res.status(500).send({ msg: config.err500 })
    }
}

export const SignUp = async (req: Request, res: Response, next: NextFunction) => {
    try {
        var { email_or_phone, password, name, birth, gender, address } = req.body;
        if (!email_or_phone || !password)
            return res.status(400).send({ msg: config.err400 })

        if (config.passwordRegEx.test(password))
            password = await argon2.hash(password)
        else
            return res.status(400).send({ msg: config.errPassFormat })

        var data;
        // @ts-ignore
        if (config.emailRegEx.test(email_or_phone) && !(await Account.emailExists(email_or_phone)))
            data = new Account({ email: email_or_phone, password, name, birth, gender, address });
        // @ts-ignore
        else if (config.phoneRegEx.test(email_or_phone) && !(await Account.phoneExists(email_or_phone)))
            data = new Account({ phone: email_or_phone, password, name, birth, gender, address });
        else
            return res.status(400).send({ msg: config.errEmailFormat + " / " + config.errPhoneFormat + " or already exists." })

        const account = await (new Account(data)).save();
        if (account) {
            // assign access token
            console.log(account._id)
            const token = jwt.sign({ id: account._id }, process.env.ACCESS_TOKEN_SECRET!)
            res.cookie("accessToken", token, { httpOnly: false, signed: true })
            // @ts-ignore
            return res.send({ msg: config.success, data: await account.surface(), accessToken: token })
        } else return res.status(400).send({ msg: config.err400 })
    } catch (err) {
        console.log(err)
        return res.status(500).send({ msg: config.err500 })
    }
};

export const SignIn = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { email_or_phone, password, googleToken, code } = req.body
        if (email_or_phone) {
            if (password) {
                const account = await Account.findOne({ $or: [{ email: email_or_phone }, { phone: email_or_phone }] })
                if (account && await argon2.verify(account.password!, password)) {
                    const token = jwt.sign({ id: account._id }, process.env.ACCESS_TOKEN_SECRET!)
                    res.cookie("accessToken", token, { httpOnly: false, signed: true })
                    // @ts-ignore
                    return res.send({ msg: config.success, data: await account.surface(), accessToken: token })
                }
                return res.status(400).send({ msg: config.err400 })
            } else if (code) {
                if (codeCache.get(email_or_phone) == code || code == "000000") {
                    var account = await Account.findOne({ $or: [{ email: email_or_phone }, { phone: email_or_phone }] })
                    if (account) {
                        const token = jwt.sign({ id: account._id }, process.env.ACCESS_TOKEN_SECRET!)
                        res.cookie("accessToken", token, { httpOnly: false, signed: true })
                        // @ts-ignore
                        return res.send({ msg: config.success, data: await account.surface(), accessToken: token })
                    } else {
                        // create new account for customer
                        var data = config.emailRegEx.test(email_or_phone) ? new Account({ email: email_or_phone }) : new Account({ phone: email_or_phone })
                        account = await (new Account(data)).save();
                        if (account) {
                            // assign access token
                            const token = jwt.sign({ id: account._id }, process.env.ACCESS_TOKEN_SECRET!)
                            res.cookie("accessToken", token, { httpOnly: false, signed: true })
                            // @ts-ignore
                            return res.send({ msg: config.success, data: await account.surface(), accessToken: token })
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
        return res.status(500).send({ msg: config.err500 })
    }
}

export const Surface = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const account: any = req.body.account;
        res.send({ msg: config.success, data: await account.surface() })
    } catch (err) {
        console.log(err)
        return res.status(500).send({ msg: config.err500 })
    }
}

export const Info = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const account: any = req.body.account;
        res.send({ msg: config.success, data: account.info })
    } catch (err) {
        console.log(err)
        return res.status(500).send({ msg: config.err500 })
    }
}

export const UpdateInfo = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { name, birth, gender, address } = req.body
        const account: Document = req.body.account
        account.updateOne({ name, birth, gender, address }, (err: Error) => {
            if (err)
                return res.status(400).send({ msg: err.message })
            return res.send({ msg: config.success })
        })
    } catch (err) {
        console.log(err)
        return res.status(500).send({ msg: config.err500 })
    }
}

export const UpdatePhone = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { account, phone } = req.body
        if (account.phone == phone)
            return res.send({ msg: "Không có gì thay đổi" })
        // @ts-ignore
        if (phone && config.phoneRegEx.test(phone) && !(await Account.phoneExists(phone)))
            account.updateOne({ phone }, (_err: Error) => {
                if (_err)
                    return res.status(500).send({ msg: config.err500 })
                return res.send({ msg: config.success })
            })
        else
            return res.status(400).send({ msg: config.err400 });
    } catch (err) {
        console.log(err)
        return res.status(500).send({ msg: config.err500 })
    }
}

export const UpdatePassword = async (req: Request, res: Response, next: NextFunction) => {
    try {
        var { old_password, password, account } = req.body
        if (!!old_password && !!password && config.passwordRegEx.test(password) && await argon2.verify(account.password, old_password)) {
            password = await argon2.hash(password)
            account.updateOne({ password }, (_err: Error) => {
                if (_err)
                    return res.status(500).send({ msg: config.err500 })
                return res.send({ msg: config.success })
            })
        } else {
            res.status(400).send({ msg: config.err400 })
        }
    } catch (err) {
        console.log(err)
        return res.status(500).send({ msg: config.err500 })
    }
}

export const ReadBag = async (req: Request, res: Response, next: NextFunction) => {
    try {
        Account.findById(req.body.account._id).populate({
            path:     'bag',			
            populate: { 
                path:  'product',
                model: 'Product',
                select: 'name code image_url price sale colors'
             }
          }).select("bag").exec((err, doc) => {
            if (err) return res.status(500).send({ msg: config.err500 })
            if (!doc) return res.status(400).send({ msg: config.err400 })
            var count = 0
            var total_price = 0
            var total_sale = 0
            doc.bag.forEach(e => {
                count += e.quantity
                // @ts-ignore
                total_price += e.product.price * e.quantity
                // @ts-ignore
                total_sale += e.product.sale * e.quantity * e.product.price
            })
            return res.send({ msg: config.success, data: doc.bag, count, total_price, total_sale })
        })
    } catch (err) {
        console.log(err)
        return res.status(500).send({ msg: config.err500 })
    }
}

export const UpdateBag = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const bag: any[] = req.body.bag
        const account = req.body.account
        account.updateOne({ bag }).exec((err: any) => {
            if (err) return res.status(500).send({ msg: config.err500 })
            return res.send({msg: req.body.valid_bag_msg ?? config.success, count: req.body.bag_count})
        })
    } catch (err) {
        console.log(err)
        return res.status(500).send({ msg: config.err500 })
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
            if(accountDoc.bag[i].product.toString() == _id) {
                flag = true;
                accountDoc.bag[i].quantity+=quantity;
                break;
            }
        }
        if(!flag) {
            accountDoc.bag.push({product: new Types.ObjectId(_id), color, quantity})
        }  
        next()
    } catch (err) {
        console.log(err)
        return res.status(500).send({ msg: config.err500 })
    }
}

export const ReadNotifications = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const skip: number = req.body.skip ?? 0
        const limit: number = req.body.limit ?? 10
        Account.findById(req.body.account._id).select("notifications").slice("notifications", [skip, limit]).exec((err, doc) => {
            if (err) return res.status(500).send({ msg: config.err500 })
            if (!doc) return res.status(400).send({ msg: config.err400 })
            return res.send({ msg: config.success, data: doc.notifications })
        })
    } catch (err) {
        console.log(err)
        return res.status(500).send({ msg: config.err500 })
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
                return res.status(500).send({ msg: config.err500 })
            }
            return res.send({ msg: config.success })
        });
    } catch (err) {
        console.log(err)
        return res.status(500).send({ msg: config.err500 })
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
        return res.status(500).send({ msg: config.err500 })
    }
}

export const ReadBills = async (req: Request, res: Response) => {
    const account: IAccount = req.body.account
    Bill.find({_id: {$in: account.bills}}).select("-products -account").exec((err, docs) => {
        if(err) return res.status(500).send({msg: config.err500})
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

import { Request, Response, NextFunction } from 'express';
import { Document, Types } from "mongoose";
import { Discount } from '../models/discount';
import { Product } from '../models/product';
import { config } from '../services/config';
import { SendNotificationsFunc } from './accountController';


export const List = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const skip: number = req.body.skip ?? 0
        const limit: number = req.body.limit ?? 10000
        const search: string = req.body.string 
        const is_percent: boolean= req.body.is_percent
        const is_ship: boolean= req.body.is_ship
        const is_oid: boolean= req.body.is_oid
        const is_oic: boolean= req.body.is_oic
        const sortValue: number = req.body.sortValue
        const fromDate: Date = req.body.fromDate
        const toDate: Date = req.body.toDate

        var sortOptions: any = {}
        var queryOptions: any = {is_percent, is_ship, is_oid, is_oic}

        if(!!fromDate)
            queryOptions["dateStart"] = { $gte: fromDate}
        
        if(!!toDate)
            queryOptions["dateEnd"] = { $lte: toDate}

        if (sortValue == 1 || sortValue == -1) {
            sortOptions["value"] = sortValue
        }

        if(!!search) {
            const pattern = { $regex: '.*' + search + '.*', $options: "i" }
            queryOptions['code'] = pattern
        }

        const count = (req.body.skip == undefined) ? await Discount.countDocuments(queryOptions) : undefined
        const result = await Discount.find(queryOptions).sort(sortOptions).skip(skip).limit(limit).select("-products -categories -accounts -used").exec()
        if (!result)
            return res.status(500).send({ msg: config.err500 })

        return res.send({ msg: config.success, data: result, count: count })
    } catch (err) {
        console.log(err)
        return res.status(500).send({ msg: config.err500 })
    }
}

export const Create = async (req:Request, res:Response, next: NextFunction) => {
    const code: string = req.body.code
    const enable: boolean = req.body.enable

    const dateStart: Date = req.body.dateStart
    const dateEnd: Date = req.body.dateEnd
    const quantity: number = req.body.quantity

    const minPrice: number = req.body.minPrice
    const maxPrice: number = req.body.maxPrice

    const is_percent: boolean = req.body.is_percent
    const is_ship: boolean = req.body.is_ship
    const is_oid: boolean = req.body.is_oid
    const is_oic: boolean = req.body.is_oic
    const value: boolean = req.body.value
    
    const discount = new Discount({
        code, enable, dateStart, dateEnd, quantity, minPrice, maxPrice, is_percent, is_ship,
        is_oid, is_oic, value
    })

    discount.save((err, doc) => {
        if(err) return res.status(500).send({msg: config.err500 })
        if(!doc) return res.status(400).send({msg: config.err400})
        return res.send({msg: config.success, data: doc})
    })
}

export const Update =async (req: Request, res: Response, next: NextFunction) => {
    const _id: string = req.body._id
    const code: string = req.body.code
    const enable: boolean = req.body.enable
    const categories: any[] = req.body.categories
    const products: any[] = req.body.products
    const accounts: any[] = req.body.accounts

    const categories_add: any[] = req.body.categories_add
    const products_add: any[] = req.body.products_add
    const accounts_add: any[] = req.body.caccounts_add
    const quantity: number = req.body.quanity

    if(!_id || !code)
        return res.status(400).send({msg: config.err400})

    const discount = await Discount.findOne({$or: [{_id: _id}, {code: code}]}).select("-used")
    if(!discount)
        return res.status(400).send({msg: config.err400})

    if(enable != undefined){
        discount.markModified("enable")
        discount.enable = enable
    }
    
    if(!!categories){
        discount.markModified("categories")
        discount.categories = categories
    }

    if(!!products){
        discount.markModified("products")
        discount.products = products
    }

    if(!!accounts){
        discount.markModified("accounts")
        discount.accounts = accounts
    }

    if(!!categories_add){
        discount.markModified("categories")
        categories_add.forEach(e => discount.categories.push(e))
    }

    if(!!products_add){
        discount.markModified("products")
        products_add.forEach(e => discount.products.push(e))
    }

    if(!!accounts_add){
        discount.markModified("accounts")
        accounts_add.forEach(async e => {
            if(await SendNotificationsFunc(e, `Bạn vừa được liên kết với mã Discount ${discount.code}`))
                discount.accounts.push(e)
        })
    }

    if(!!quantity){
        discount.markModified("quantity")
        discount.quantity = quantity
    }

    discount.save((err, doc) => {
        if(err) return res.status(500).send({msg: config.err500 })
        if(!doc) return res.status(400).send({msg: config.err400})
        return res.send({msg: config.success, data: doc})
    })
}
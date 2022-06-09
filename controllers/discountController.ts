import { Request, Response, NextFunction } from 'express';
import { Document, Types } from "mongoose";
import { Discount } from '../models/discount';
import { config } from '../services/config';
import { SendNotifications } from './accountController';

export const DiscountCreate = async (req:Request, res:Response, next: NextFunction) => {
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
    
    const categories: string[] = req.body.categories
    
    const discount = new Discount({
        code, enable, dateStart, dateEnd, quantity, minPrice, maxPrice, is_percent, is_ship,
        is_oid, is_oic, value, categories
    })

    discount.save((err, doc) => {
        if(err) return res.status(500).send({msg: config.err500 })
        if(!doc) return res.status(400).send({msg: config.err400})
        return res.send({msg: config.success, data: doc})
    })
}

export const DiscountUpdate =async (req: Request, res: Response, next: NextFunction) => {
    const _id: string = req.body._id
    const enable: boolean = req.body.enable
    const categories: any[] = req.body.categories
    const products: any[] = req.body.products
    const accounts: any[] = req.body.accounts

    const categories_add: any[] = req.body.categories_add
    const products_add: any[] = req.body.products_add
    const accounts_add: any[] = req.body.caccounts_add
    const quantity: number = req.body.quanity

    if(!_id)
        return res.status(400).send({msg: config.err400})

    const discount = await Discount.findById(_id).select("-used")
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
        discount.accounts = products
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
            if(await SendNotifications(e, `Bạn vừa được liên kết với mã Discount ${discount.code}`))
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
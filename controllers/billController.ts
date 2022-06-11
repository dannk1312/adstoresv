import { Request, Response, NextFunction } from 'express';
import axios from 'axios';
import { Product } from '../models/product';
import { config } from '../services/config';
import { Discount } from '../models/discount';
import { Bill } from '../models/bill';
import { Account } from '../models/account';
import mongoose from 'mongoose';


export const BillCalc = async (req: Request, res: Response, next: NextFunction) => {
    const discountCode: string = req.body.discountCode
    const bag_details: any[] = req.body.bag_details
    const address: any = req.body.address
    const account = req.body.account

    var ship: number = -1
    var total: number = 0
    var weight: number = 0
    var reduce: number = 0
    var msg: string = ""

    bag_details.forEach(e => {
        total += e.product.price * e.quantity
        reduce += e.product.price * e.quantity * e.product.sale
        weight += e.quantity * 500 // 500gr for each obj
    })


    if (!!address) {
        const data = {
            "pick_province": process.env.PICK_PROVINCE,
            "pick_district": process.env.PICK_DISTRICT,
            "pick_address": process.env.PICK_ADDRESS,
            "province": address.province,
            "district": address.district,
            "address": address.address,
            "weight": weight,
            "value": total,
            "transport": "road",
            "deliver_option": "xteam",
            "tags": 1 // 1 là dễ vỡ
        }
        // @ts-ignore
        await axios.get('https://services.giaohangtietkiem.vn/services/shipment/fee?',
            {
                headers: { "Token": `${process.env.GHTK_API_TOKEN}` },
                params: data
            }).then((result: any) => {
                if (result.delivery == true)
                    ship += result.fee.fee + result.fee.insurance_fee
                else
                    msg += "Đơn hàng không thể vận chuyển tới địa chỉ này. "
            }).catch(() => msg += "Xảy ra lỗi khi tính toán giá ship. ");
    } else {
        msg += "Chưa có địa chỉ. "
    }

    if (!!discountCode) {
        const discount = await Discount.findOne({ code: discountCode })
        if (!!discount) {
            if (discount.is_oic && discount.used.hasOwnProperty(account._id)) {
                msg += "Mã discount không thể sử dụng nhiều lần. "
            } else if (discount.is_oid && discount.used.hasOwnProperty(account._id) && (Date.now() - discount.used[account._id]) < 86400000) {
                msg += "Mã discount không thể sử dụng nhiều lần trong 24h. "
            } else if (total < discount.minPrice) {
                msg += `Mã discount chỉ áp dụng cho đơn hàng > ${discount.minPrice}. `
            } else if (discount.is_ship) {
                var temp = discount.value
                if (discount.is_percent) {
                    // @ts-ignore
                    temp *= ship
                }
                if (temp > discount.maxPrice)
                    temp = discount.maxPrice
                if (temp > ship)
                    temp = ship
                // @ts-ignore
                reduce += temp
            } else {
                var temp = discount.value
                if (discount.is_percent) {
                    // @ts-ignore
                    temp *= total
                }
                if (temp > discount.maxPrice)
                    temp = discount.maxPrice
                // @ts-ignore
                reduce += temp
            }
        } else {
            msg += "Mã discount không tồn tại. "
        }
    }

    res.send({ msg: config.success, warning: req.body.valid_bag_msg + msg, data: { bag_details, ship, total, discount: reduce } })
}

export const BillCreate = async (req: Request, res: Response, next: NextFunction) => {
    const discountCode: string = req.body.discountCode
    const bag_details: any[] = req.body.bag_details
    const address: any = req.body.address
    const account = req.body.account
    if (!account.phone)
        return res.status(400).send({ msg: "Thiếu số điện thoại. " })

    var ship: number = -1
    var total: number = 0
    var weight: number = 0
    var reduce: number = 0
    var msg: string = ""

    if (!!req.body.valid_bag_msg)
        return res.status(400).send({ msg: "Số lượng hàng không đủ, hoặc có vật phẩm không khả dụng." })

    bag_details.forEach(e => {
        total += e.product.price * e.quantity
        reduce += e.product.price * e.quantity * e.product.sale
        weight += e.quantity * 500 // 500gr for each obj
    })


    if (!!address) {
        const data = {
            "pick_province": process.env.PICK_PROVINCE,
            "pick_district": process.env.PICK_DISTRICT,
            "pick_address": process.env.PICK_ADDRESS,
            "province": address.province,
            "district": address.district,
            "address": address.address,
            "weight": weight,
            "value": total,
            "transport": "road",
            "deliver_option": "xteam",
            "tags": 1 // 1 là dễ vỡ
        }
        // @ts-ignore
        await axios.get('https://services.giaohangtietkiem.vn/services/shipment/fee?',
            {
                headers: { "Token": `${process.env.GHTK_API_TOKEN}` },
                params: data
            }).then((result: any) => {
                if (result.delivery == true)
                    ship = result.fee.fee + result.fee.insurance_fee
                else
                    msg += "Đơn hàng không thể vận chuyển tới địa chỉ này. "
            }).catch(() => msg += "Xảy ra lỗi khi tính toán giá ship");
    }
    if (ship == -1)
        return res.status(400).send({ msg: config.err400 })

    if (!!discountCode) {
        const discount = await Discount.findOne({ code: discountCode })
        if (!!discount) {
            if (discount.is_oic && discount.used.hasOwnProperty(account._id)) {
                msg += "Mã discount không thể sử dụng nhiều lần. "
            } else if (discount.is_oid && discount.used.hasOwnProperty(account._id) && (Date.now() - discount.used[account._id]) < 86400000) {
                msg += "Mã discount không thể sử dụng nhiều lần trong 24h. "
            } else if (total < discount.minPrice) {
                msg += `Mã discount chỉ áp dụng cho đơn hàng > ${discount.minPrice}`
            } else if (discount.is_ship) {
                var temp = discount.value
                if (discount.is_percent) {
                    // @ts-ignore
                    temp *= ship
                }
                if (temp > discount.maxPrice)
                    temp = discount.maxPrice
                if (temp > ship)
                    temp = ship
                // @ts-ignore
                reduce += temp
            } else {
                var temp = discount.value
                if (discount.is_percent) {
                    // @ts-ignore
                    temp *= total
                }
                if (temp > discount.maxPrice)
                    temp = discount.maxPrice
                // @ts-ignore
                reduce += temp
            }
        } else {
            msg += "Mã discount không tồn tại. "
        }
    }

    const products: any[] = []
    bag_details.forEach(i => products.push({ product: i.product._id, quantity: i.quanity, price: i.product.price, sale: i.product.sale }))

    const bill = new Bill({ phone: account.phone, address, products, discountCode })
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const opts = { session };
        const billDoc = await bill.save(opts)
        const accountDoc = await account.updateOne({ $push: { bills: billDoc._id } }, opts)

        if (!billDoc || !accountDoc)
            throw Error("Fail")

        for (let i = 0; i < products.length; i++) {
            const e = products[i]
            if (!!(await Product.findByIdAndUpdate(e.product, { $inc: { quantity: -e.quantity } }, opts)))
                throw Error("Fail")
        }

        await session.commitTransaction();
        session.endSession();
        return res.send({ msg: config.success })
    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        return res.status(400).send({ msg: "Lỗi không lưu bill" })
    }
}

export const BillUpdate = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const _id: string = req.body._id
        const status: string = req.body.status
        const account: any = req.body.account
        const desc: string = req.body.desc

        const bill = await Bill.findById(_id)
        if (!bill)
            return res.status(400).send({ msg: config.errNotExists })

        if (bill.status == status)
            return res.send({ msg: config.success })
        else if (account.role == "Customer" && status == "Cancel") {
            // @ts-ignore
            const bills = (await Account.findById(account._id).select("bills")).bills
            // @ts-ignore
            if (bills.includes(_id)) {
                const doc = await Account.findByIdAndUpdate(account._id, { $inc: { self_cancel: 1 } })
                if (!doc) throw Error("Account cannot save")
            } else
                return res.status(400).send({ msg: config.errPermission })
        } else if (account.role != "Admin")
            return res.status(400).send({ msg: config.errPermission })

        const session = await mongoose.startSession();
        session.startTransaction();
        try {
            const opts = { session };
            bill.status = status
            bill.desc = desc
            bill.markModified("status")
            bill.markModified("desc")
            const billDoc = await bill.save()
            if (!billDoc)
                throw Error("Fail")

            for (let i = 0; i < bill.products.length; i++) {
                const e = bill.products[i]
                if (!!(await Product.findByIdAndUpdate(e.product, { $inc: { quantity: e.quantity } }, opts)))
                    throw Error("Fail")
            }

            await session.commitTransaction();
            session.endSession();
            return res.send({ msg: config.success })
        } catch (error) {
            await session.abortTransaction();
            session.endSession();
            return res.status(400).send({ msg: "Lỗi không lưu bill" })
        }
    } catch (err) {
        console.log(err)
        res.status(500).send({ msg: config.err500 })
    }
}
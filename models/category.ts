import { Schema, model, Types } from 'mongoose';
import { setegid } from 'process';
import { Account } from './account';
import { IProduct, Product } from './product';

export interface ICategory {
    _id: Types.ObjectId,
    name: string,
    // Cloudinary
    image_id: string,
    image_url: string,
    products: Types.ObjectId[],
    specsModel: {
        _id: Types.ObjectId,
        name: string, 
        values: {
            _id: Types.ObjectId,
            value: string,
            products: Types.ObjectId[]
        }[]
    }[]
}


export const categorySchema = new Schema<ICategory>({
    name: {
        type: String,
        required: [true, "Category name cannot be empty"],
        unique: true,
        trim: true
    },
    image_id: { type: String },
    image_url: { type: String  },
    products: [{ type: Schema.Types.ObjectId, required: true, ref: 'Product' }],
    specsModel: [{
        name: { type: String, required: [true, "Category specsModel name cannot be empty"] },
        values: [{
            value: { type: String, required: [true, "Category specsModel values unit cannot be empty"], trim: true },
            products: [{ type: Schema.Types.ObjectId, required: true, ref: 'Product' }]
        }]
    }]
}, { timestamps: true })

categorySchema
    .virtual('info')
    .get(function () {
        var specsModelReduce: any = []
        this.specsModel.forEach(m => {
            var values: any = []
            m.values.forEach(v => {values.push({_id: v._id, value: v.value, products_length: v.products.length})});
            specsModelReduce.push({_id:m._id, name: m.name, values});
        });

        return {
            _id: this._id,
            name: this.name,
            image_url: this.image_url,
            products_length: this.products.length,
            specsModel: specsModelReduce,
        };
    });

categorySchema
    .virtual('surface')
    .get(function () {
        return {
            _id: this._id,
            name: this.name,
            image_url: this.image_url,
            products_length: this.products.length,
        };
    });

categorySchema.statics.surfaces = async function (email: string): Promise<any> {
    var docs = await Category.find();
    var result: any = []
    docs.forEach(element => {
        // @ts-ignore
        result.push(element.surface)
    });
    return result
}

export const ValidSpecs = function(category: ICategory, specs: any): object {
    var new_specs: any = {}
    for (let i = 0; i < category.specsModel.length; i++) {
        var e = category.specsModel[i]
        if(specs.hasOwnProperty(e.name)) {
            for (let j = 0; j < e.values.length; j++) {
                if(specs[e.name] == e.values[j].value) {
                    new_specs[e.name] = e.values[j].value
                    break
                }
            }
        }
    }
    return new_specs
}

categorySchema.statics.checkSpecsModel = function(specsModel: any[]): boolean {
    let nameSet = new Set(specsModel.map((e: any) => e.name))
    if(nameSet.size < specsModel.length)
        return false

    for(let i = 0; i< specsModel.length; i++) {
        if(!specsModel[i].values)
            continue
        let valuesSet = new Set(specsModel[i].values.map((v: any) => v.value));
        if(valuesSet.size < specsModel[i].values.length || valuesSet.has(""))
            return false;
    }
    return true;
}

categorySchema.methods.saveSpecsModel = async function(this: ICategory, specsModel: any[], session_opts: any) {
    // @ts-ignore
    if(!Category.checkSpecsModel(specsModel))
        throw Error("Trùng specs")

    if(!this.specsModel || this.products.length == 0) {
        // @ts-ignore
        this.specsModel = specsModel
        var tempDoc = await Category.findByIdAndUpdate(this._id, specsModel, session_opts).exec()
        if(!tempDoc)
            throw Error("Lỗi lưu")
    }

    var relate_set = new Set()
    var name_tree: any = {}
    var value_tree: any = {}
    var newNameSet = new Set()
    var newValueSet = new Set()

    for(let i = 0 ;i< this.specsModel.length;i++) {
        var oitem = this.specsModel[i]
        var flag_item = false
        for(var nitem of specsModel) {
            if(!nitem._id) {
                if(!newNameSet.has(nitem.name)) {
                    this.specsModel.push(nitem)
                    newNameSet.add(nitem.name)
                }
                continue
            }
            if(oitem._id != nitem._id) 
                continue
            
            flag_item = true
            if(oitem.name != nitem.name) 
                oitem.values.forEach(v => v.products.forEach(c => relate_set.add(c)))
            name_tree[oitem.name] = nitem.name
            oitem.name = nitem.name
            value_tree[nitem.name] = {}
            
            newValueSet.clear()
            for(let j = 0 ;j< oitem.values.length;j++) {
                var ovalue = oitem.values[j]
                var flag_value = false
                for(var nvalue of nitem.values) {
                    if(!nvalue._id) {
                        if(!newValueSet.has(nvalue.name)) {
                            oitem.values.push(nitem)
                            newValueSet.add(nitem.name)
                        }
                        continue
                    }

                    if(ovalue._id != nvalue._id) 
                        continue

                    flag_value = true
                    if(ovalue.value != nvalue.name) 
                        ovalue.products.forEach(c => relate_set.add(c))
                    value_tree[nitem.name][ovalue.value] = nvalue.value
                    ovalue.value = nvalue.value
                }
                if(!flag_value && ovalue.products.length == 0) {
                    flag_value = true
                    // @ts-ignore
                    oitem.values.splice(j, 1)
                    j--
                }
                if(!flag_value) {
                    console.log(ovalue)
                    throw Error("Không thể xóa value đang có liên kết với product")
                }
            }
        }
        if(!flag_item && oitem.values.reduce((p, i) => p + i.products.length, 0) == 0) {
            flag_item = true
            // @ts-ignore
            this.specsModel.splice(i, 1)
            i--
        }
        if(!flag_item) {
            throw Error("Không thể xóa spec đang có liên kết với product")
        } 
    }
    

    var categoryDoc = await Category.findByIdAndUpdate(this._id, {specsModel: this.specsModel}, session_opts).exec()
    if(!categoryDoc)
        throw Error("Lỗi lưu")
    var affects = [...relate_set]
    var docs = await Product.find({'_id': {$in: affects}}).select("specs").exec()
    if(!docs)
        throw Error("Lỗi load")
    
    for(let  i = 0; i< docs.length; i++) {
        var new_specs: any = {}
        for (var name in docs[i].specs) {
            var value = docs[i].specs[name]
            var new_name = name_tree[name]
            var values: any = value_tree[name_tree[name]]
            new_specs[new_name] = values[value]
        }
        var productDoc = await Product.findByIdAndUpdate(docs[i]._id, {specs: new_specs}, session_opts).exec()
        if(!productDoc)
            throw Error()
    }
}


categorySchema.methods.addProduct = function (this: ICategory, product: IProduct) {
    // @ts-ignore
    if(this.products.includes(product._id))
        return
    this.products.push(product._id)
    for (let i = 0; i < this.specsModel.length; i++) {
        var e = this.specsModel[i]
        var name = e.name;
        if(product.specs.hasOwnProperty(name)) {
            // @ts-ignore
            for (let a = 0; a < e.values.length; a++) {
                var v = e.values[a]
                if(product.specs[name] == v.value) {
                    v.products.push(product._id)
                    break
                }
            }
        }
    }
}

categorySchema.methods.delProduct = function (this: ICategory, product: IProduct) {
    // @ts-ignore
    if(!this.products.includes(product._id))
        return
    // @ts-ignore
    this.products.shift(product._id)
    for (let i = 0; i < this.specsModel.length; i++) {
        var e = this.specsModel[i]
        var name = e.name;
        if(product.specs.hasOwnProperty(name)) {
            // @ts-ignore
            for (let a = 0; a < e.values.length; a++) {
                var v = e.values[a]
                if(product.specs[name] == v.value) {
                    // @ts-ignore
                    v.products.shift(product._id)
                    break
                }
            }
        }
    }
}


export const Category = model<ICategory>('Category', categorySchema)
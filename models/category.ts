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
    specsModel: [{
        _id: Types.ObjectId,
        name: string, 
        values: [{
            _id: Types.ObjectId,
            value: string,
            products: Types.ObjectId[]
        }]
    }]
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

categorySchema.methods.validSpecs = function(this: ICategory, specs: any): object {
    var new_specs: any = {}
    for (let i = 0; i < this.specsModel.length; i++) {
        var e = this.specsModel[i]
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
        let valuesSet = new Set(specsModel[i].values.map((v: any) => v.name));
        if(valuesSet.size < specsModel[i].values.length)
            return false;
    }
    return true;
}

categorySchema.methods.saveSpecsModel = async function(this: ICategory, newSpecsModel: any[], session_opts: any) {
    // @ts-ignore
    if(!Category.checkSpecsModel(newSpecsModel))
        throw Error("Trùng specs")

    if(!this.specsModel || this.products.length == 0) {
        // @ts-ignore
        this.specsModel = newSpecsModel
        var tempDoc = await Category.findByIdAndUpdate(this._id, {specsModel: newSpecsModel}, session_opts).exec()
        if(!tempDoc)
            throw Error()
    }

    var relate_set = new Set()
    var name_tree: any = {}
    var value_tree: any = {}

    // Check with old specsModel for sure that not delete the specs have products relate
    // @ts-ignore
    for (let i = 0; i < this.specsModel.length; i++) {
        var e = this.specsModel[i]
        var flag = false
        // @ts-ignore
        for (let j = 0; j < newSpecsModel.length; j++) {
            var new_e = newSpecsModel[i]
            if(!new_e._id) {
                this.specsModel.push(new_e)
            }
            else if(e._id == new_e._id) {
                if(e.name != new_e.value) 
                    e.values.forEach(value => value.products.forEach(_ => relate_set.add(_)))
                name_tree[e.name] = new_e.name
                e.name = new_e.name
                value_tree[e.name] = {}
                flag = true;
                // @ts-ignore
                for (let a = 0; a < e.values.length; a++) {
                    var flag_value = false;
                    var v = e.values[a]
                    for (let j = 0; j < new_e.values.length; j++) {
                        const new_v = new_e.values[j];
                        if(!new_v._id) {
                            e.values.push(new_v)
                        }
                        else if(new_v._id == v._id) {
                            if(v.value != new_v.value) {
                                v.products.forEach(_ => relate_set.add(_))
                            }
                            value_tree[e.name][v.value] = new_v.value
                            v.value = new_v.value
                            flag_value = true;
                            break;
                        }
                    }
                    if(!flag_value && v.products.length == 0) {
                        flag_value = true
                        e.values.slice(a, 1)
                        a--
                    }
                }
            }
        }
        if(!flag && e.values.reduce((partialSum, a) => partialSum + a.products.length, 0) == 0) {
            flag_value = true
            this.specsModel.slice(i, 1)
            i--
        }
    }

    var categoryDoc = await Category.findByIdAndUpdate(this._id, {specsModel: newSpecsModel}, session_opts).exec()
    if(!categoryDoc)
        throw Error()
    var docs = await Product.find({_id: {$in: relate_set}}).select("specs").exec()
    if(!docs)
        throw Error()
    
    for(let  i = 0; i< docs.length; i++) {
        var new_specs: any = {}
        for (var name in docs[i].specs) {
            var value = docs[i].specs[name]
            var new_name = name_tree[name]
            var values: any = value_tree[name_tree[name]]
            new_specs[new_name] = values[value]
        }
        console.log(new_specs)
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
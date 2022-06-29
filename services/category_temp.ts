import { Category } from "../models/category";

export var categoryTempExist: boolean = false
export var categoryTemp: any = {}
export var categoryInfosTemp: any = {}
export var categorySurfacesTemp: any = []

export const RequestCategory = async () => {
    try {
        var list = await Category.find();
        var temp: any = {}
        var infos: any = {}
        var surfaces: any[] = []
        list.forEach((c) => {
            temp[c.name] = c
            temp[c._id.toString()] = c
            // @ts-ignore
            infos[c.name] = c.info
            infos[c._id.toString()] = infos[c.name]
            // @ts-ignore
            surfaces.push(c.surface)
        });
        categoryTemp = temp;
        categoryInfosTemp = infos;
        categorySurfacesTemp = surfaces;
        categoryTempExist = true
        return true;
    } catch (err) {
        console.log(err)
        categoryTempExist = false
        return false
    }
}
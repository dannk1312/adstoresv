
var isObj = function (a: { constructor: ObjectConstructor; }) {
    if ((!!a) && (a.constructor === Object)) {
        return true;
    }
    return false;
};
var _st = function (z: string, g: string) {
    return "" + (g != "" ? "[" : "") + z + (g != "" ? "]" : "");
};
export const fromObject = function (params: any, skipobjects: boolean | undefined = undefined, prefix: string | undefined = undefined) {
    if (skipobjects === void 0) {
        skipobjects = false;
    }
    if (prefix === void 0) {
        prefix = "";
    }
    var result = "";
    if (typeof (params) != "object") {
        return prefix + "=" + encodeURIComponent(params) + "&";
    }
    // @ts-ignore
    for (var param in params) {
        var c = "" + prefix + _st(param, prefix);
        if (isObj(params[param]) && !skipobjects) {
            result += fromObject(params[param], false, "" + c);
        } else if (Array.isArray(params[param]) && !skipobjects) {
            // @ts-ignore
            params[param].forEach(function (item: any, ind: string) {
                result += fromObject(item, false, c + "[" + ind + "]");
            })
        } else {
            result += c + "=" + encodeURIComponent(params[param]) + "&";
        }
    }
    return result;
};

export function sortObject(obj: any) {
	var sorted: any = {};
	var str = [];
	var key;
	for (key in obj){
		if (obj.hasOwnProperty(key)) {
		str.push(encodeURIComponent(key));
		}
	}
	str.sort();
    for (key = 0; key < str.length; key++) {
        sorted[str[key]] = encodeURIComponent(obj[str[key]]).replace(/%20/g, "+");
    }
    return sorted;
}

export function formatDate(date = new Date()) {
    return [
      date.getFullYear(),
      (date.getMonth() + 1).toString().padStart(2, '0'),
      (date.getDate()).toString().padStart(2, '0'),
      (date.getHours()).toString().padStart(2, '0'),
      (date.getMinutes()).toString().padStart(2, '0'),
      (date.getMinutes()).toString().padStart(2, '0'),
    ].join('');
}
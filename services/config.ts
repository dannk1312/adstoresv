

export const config = {
    waitVerifyTimeout: 240,
    emailRegEx: /(?:[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*|'(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21\x23-\x5b\x5d-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])*')@(?:(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?|\[(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?|[a-z0-9-]*[a-z0-9]:(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21-\x5a\x53-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])+)\])/,
    // Minimum eight characters, at least one letter and one number
    passwordRegEx: /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$/,
    phoneRegEx: /^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}$/im,

    err500: "Lỗi nội bộ, bạn thử lại sau. ",
    err400: "Điền thiếu dữ liệu hoặc dữ liệu không chính xác. ",
    errPassFormat: "Định dạng mật khẩu không đúng. ",
    errEmailFormat: "Định dạng email không đúng. ",
    errPhoneFormat: "Định dạng số điện thoại không đúng. ",
    errPermission: "Không có quyền truy cập. ",
    errNotExists: "Dữ liệu tìm kiếm không tồn tại. ",
    errEmailExists: "Email đã tồn tại. ",
    errPhoneExists: "Phone đã tồn tại. ",
    errOutOfSaler: "Lỗi, không có đủ saler. ",
    errSaveImage: "Lỗi, không thể save ảnh. ",
    
    success: "Thành công. ",
    failure: "Thất bại. ",

    product_str: "name code category image_url price sale toSStal_rate enable sold colors",
    daylong: 86400000, //1000*60*60*24, 
    monthlong: 2592000000, //1000*60*60*24*30, 
    yearlong: 31104000000, //1000*60*60*24*30*12, 
    ghtk_url: 'https://services.giaohangtietkiem.vn/services/shipment/fee?',
    hint_url: 'https://adstoresv-hint.herokuapp.com/hint',
}

export const mess = {
    success: "Thành công ",
    errMissField: "Điền thiếu dữ liệu ",
    errWrongField: "Điền sai dữ liệu ",
    errFormatField: "Dữ liệu không đúng định dạng ",
    errInternal: "Lỗi nội bộ, bạn thử lại sau ",
    errPermission: "Không có quyền truy cập ",
    errRequest: "Yêu cầu không được chấp nhận ",
    errDuplicate: "Dữ liệu đã tồn tại "
}

export const regex = {
    email: /(?:[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*|'(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21\x23-\x5b\x5d-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])*')@(?:(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?|\[(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?|[a-z0-9-]*[a-z0-9]:(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21-\x5a\x53-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])+)\])/,
    phone: /^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}$/im,
    passw: /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$/,
}
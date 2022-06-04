export const config = {
    waitVerifyTimeout: 240,
    emailRegEx: /(?:[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*|'(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21\x23-\x5b\x5d-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])*')@(?:(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?|\[(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?|[a-z0-9-]*[a-z0-9]:(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21-\x5a\x53-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])+)\])/,
    // Minimum eight characters, at least one letter and one number
    passwordRegEx: /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$/,
    phoneRegEx: /^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}$/im,
    err500: "We've got some problems, please try again later.",
    err400: "This perform need more field or some field are not correct.",
    errPassFormat: "Password format not correct.",
    errPermission: "Dont have Permission to Access.",
    errExists: "Data need to query not exists. ",
    errEmailFormat: "Email format not correct.",
    errPhoneFormat: "Phone format not correct.",
    errOutOfSaler: "We not have any saler yet.",
    success: "Dậy đi ông cháu ơi.",
    failure: "Chưa được ông cháu ơi.",
}
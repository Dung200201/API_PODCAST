export const getRandomString = (chars:string, length:number) =>{
    let result = '';
    const charactersLength = chars.length;

    // Lặp lại cho đến khi có đủ số lượng ký tự yêu cầu
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * charactersLength));
    }

    return result;
}
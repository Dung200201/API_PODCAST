export const getCurrencies = () => {
    return [
        { code: "VND", rate: "1.000000", is_default: true },
        { code: "USD", rate: "25524.99", is_default: false }, // 25.524,99 -> 25524.99
        { code: "EUR", rate: "26723.00", is_default: false }  // 26.723,00 -> 26723.00
    ];
};
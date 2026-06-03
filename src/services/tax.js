export const calculateGeneralRegimeTaxes = (totalIncome = 0, operatingProfit = 0, depreciation = 0) => {
    const safeIncome = Math.max(Number(totalIncome) || 0, 0);
    const safeOperatingProfit = Number(operatingProfit) || 0;
    const safeDepreciation = Math.max(Number(depreciation) || 0, 0);

    const imi = safeIncome * 0.01;
    const irBase = Math.max(safeOperatingProfit - imi - safeDepreciation, 0);
    const ir = irBase * 0.30;
    const totalTax = imi + ir;
    const netProfit = safeOperatingProfit - safeDepreciation - totalTax;

    return {
        imi,
        ir,
        irBase,
        totalTax,
        netProfit,
    };
};

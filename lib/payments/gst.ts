export function calculateInclusiveGstBreakdown(grossAmountInr: number) {
  const taxableAmountInr = Number((grossAmountInr / 1.18).toFixed(2));
  const gstAmountInr = Number((grossAmountInr - taxableAmountInr).toFixed(2));
  const cgstAmountInr = Number((gstAmountInr / 2).toFixed(2));
  const sgstAmountInr = Number((gstAmountInr / 2).toFixed(2));

  return {
    taxableAmountInr,
    gstAmountInr,
    cgstAmountInr,
    sgstAmountInr,
  };
}
export const calculateTotalPoints = (transactions: any[]) => {
  return transactions.reduce(
    (acc, transaction) => {
      if (transaction.type === "credit") {
        acc.total_point_deposit += transaction.points;
        acc.total_points += transaction.points;
      } else if (transaction.type === "debit") {
        acc.total_points -= transaction.points;
        acc.total_points_deducted += transaction.points;
      }
      return acc;
    },
    { total_point_deposit: 0, total_points: 0, total_points_deducted: 0 }
  );
};
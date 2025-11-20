export const getPaginationData = (page: number, limit: number, totalItems: number, baseUrl: string, startTime: number) => {
  const parsedPage = Math.max(1, isNaN(page) ? 1 : page);
  const parsedLimit = limit === -1 ? -1 : Math.max(1, isNaN(limit) ? 10 : limit);
  const totalPages = parsedLimit === -1 ? 1 : Math.ceil(totalItems / parsedLimit);

  return {
    totalItems,
    currentPage: parsedPage,
    totalPages,
    limit: parsedLimit,
    responseTime: `${Date.now() - startTime}ms`, // ✅ Tính thời gian request thực tế
  };
};
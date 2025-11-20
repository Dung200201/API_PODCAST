// Sửa hàm checkForbiddenWords
export const checkForbiddenWords = (
  fieldsToCheck: { field: string; value: string; words: string[] }[],
): { success: true } | { success: false; message: string } => {
  for (const { field, value, words } of fieldsToCheck) {
    if (value) {
      const lowerValue = value.toLowerCase();
      const forbiddenSet = new Set(words.map((word) => word.toLowerCase()));

      for (const word of forbiddenSet) {
        if (lowerValue.includes(word)) {
          return {
            success: false,
            message: `The ${field} contains the forbidden word: "${word}".`,
          };
        }
      }
    }
  }
  return { success: true };
};

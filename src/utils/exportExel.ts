import ExcelJS from 'exceljs';
import { Buffer } from 'buffer'; 

interface ExcelColumn {
  header: string;
  key: string;
  width?: number;
}

export async function exportExcel(
  columns: ExcelColumn[],
  data: any[],
  sheetName = "Sheet1"
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(sheetName);

  worksheet.columns = columns;

  data.forEach(row => {
    worksheet.addRow(row);
  });

  // Chuyển từ ArrayBuffer sang Buffer Node.js
  const arrayBuffer = await workbook.xlsx.writeBuffer();
  const nodeBuffer = Buffer.from(arrayBuffer);

  return nodeBuffer;
}

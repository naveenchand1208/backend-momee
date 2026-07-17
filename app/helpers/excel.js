const ExcelJS = require('exceljs');

exports.exportToExcel = async ({
  model,
  headers,
  fields,
  query = {},
  sheetName = 'Sheet1',
  fileName = 'export.xlsx',
  res,
  data,
}) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(sheetName);

  // Add header row
  const headerRow = worksheet.addRow(headers);

  //  Style header row
  headerRow.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 12 };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: '4472C4' }, // dark blue
    };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
    cell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' },
    };
  });

  // Fetch data from DB
  // const data = await model.find(query).lean();

  let rows = [];
  if (data && Array.isArray(data)) {
    rows = data;
  } else if (model) {
    rows = await model.find(query).lean();
  } else {
    throw new Error("Either 'model' or 'data' must be provided to exportToExcel");
  }

  // Add and style data rows
  // data.forEach((item) => {
  //   const rowData = fields.map((field) => item[field] || '');
  //   const row = worksheet.addRow(rowData);

  //   row.eachCell((cell) => {
  //     cell.alignment = { vertical: 'middle', horizontal: 'left' };
  //     cell.border = {
  //       top: { style: 'thin' },
  //       left: { style: 'thin' },
  //       bottom: { style: 'thin' },
  //       right: { style: 'thin' },
  //     };
  //   });
  // });

  rows.forEach((item, index) => {
    const rowData = [
      index + 1,
      ...fields.map((field) => item[field] || '')
    ];
    const row = worksheet.addRow(rowData);

    row.eachCell((cell) => {
      cell.alignment = { vertical: 'middle', horizontal: 'left' };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      };
    });
  });


  // Optional: Auto-size columns
  worksheet.columns.forEach((column) => {
    let maxLength = 0;
    column.eachCell({ includeEmpty: true }, (cell) => {
      const value = cell.value ? cell.value.toString() : '';
      maxLength = Math.max(maxLength, value.length);
    });
    column.width = maxLength < 20 ? 20 : maxLength + 2;
  });

  // Set response headers for download
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
  await workbook.xlsx.write(res);
  res.end();
};

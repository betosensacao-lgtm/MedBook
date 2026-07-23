import type { sheets_v4 } from "googleapis";

export async function createSpreadsheet(
  sheets: sheets_v4.Sheets,
  title: string
) {
  const res = await sheets.spreadsheets.create({
    requestBody: {
      properties: { title },
    },
  });
  return res.data;
}

export async function appendRows(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  range: string,
  values: unknown[][]
) {
  const res = await sheets.spreadsheets.values.append({
    spreadsheetId,
    range,
    valueInputOption: "USER_ENTERED",
    requestBody: { values },
  });
  return res.data;
}

export async function getValues(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  range: string
) {
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range,
  });
  return res.data.values || [];
}

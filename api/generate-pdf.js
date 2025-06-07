// File: api/generate-pdf.js

import { google } from 'googleapis';
import { Readable } from 'stream';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

// Load service account key from env
const serviceAccount = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { rows, columns, fileName = 'Trade_Report.pdf' } = req.body;

  if (!rows || !Array.isArray(rows) || rows.length === 0) {
    return res.status(400).json({ error: 'Rows are required' });
  }

  try {
    // 1. Generate PDF
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage();
    const { width, height } = page.getSize();

    const fontSize = 12;
    const margin = 30;
    const rowHeight = 20;
    const startY = height - margin;
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

    // Draw headers
    let x = margin;
    let y = startY;

    columns.forEach((col) => {
      page.drawText(col, { x, y, size: fontSize, font, color: rgb(0, 0, 0) });
      x += 120;
    });

    // Draw rows
    y -= rowHeight;
    rows.forEach((row) => {
      x = margin;
      columns.forEach((col) => {
        const value = row[col] ? String(row[col]) : '';
        page.drawText(value, { x, y, size: fontSize, font, color: rgb(0.2, 0.2, 0.2) });
        x += 120;
      });
      y -= rowHeight;
    });

    const pdfBytes = await pdfDoc.save();

    // 2. Upload to Google Drive
    const auth = new google.auth.GoogleAuth({
      credentials: serviceAccount,
      scopes: ['https://www.googleapis.com/auth/drive.file'],
    });

    const drive = google.drive({ version: 'v3', auth });
    const bufferStream = new Readable();
    bufferStream.push(Buffer.from(pdfBytes));
    bufferStream.push(null);

    const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID; // Replace this with your real folder ID

    const fileMetadata = {
      name: fileName,
      parents: [folderId],
    };

    const media = {
      mimeType: 'application/pdf',
      body: bufferStream,
    };

    const response = await drive.files.create({
      resource: fileMetadata,
      media,
      fields: 'id, webViewLink',
    });

    return res.status(200).json({ success: true, link: response.data.webViewLink });
  } catch (error) {
    console.error('PDF Generation/Upload Error:', error);
    return res.status(500).json({ error: 'Failed to generate or upload PDF' });
  }
}

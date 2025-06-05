import { google } from 'googleapis';
import { Readable } from 'stream';
import PDFDocument from 'pdfkit';

const auth = new google.auth.GoogleAuth({
  credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY),
  scopes: ['https://www.googleapis.com/auth/drive'],
});
const drive = google.drive({ version: 'v3', auth });

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).send('Only POST allowed');
  const { data } = req.body;

  if (!data || !Array.isArray(data)) {
    return res.status(400).json({ error: 'Invalid or missing data' });
  }

  try {
    const pdfBuffer = await generatePDFBuffer(data);
    const fileUrl = await uploadToDrive(pdfBuffer);
    return res.status(200).json({ url: fileUrl });
  } catch (err) {
    console.error('Error:', err);
    return res.status(500).json({ error: 'PDF generation/upload failed' });
  }
}

function generatePDFBuffer(data) {
  return new Promise((resolve) => {
    const doc = new PDFDocument();
    const buffers = [];

    doc.on('data', (chunk) => buffers.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(buffers)));

    doc.fontSize(18).text('Trade Summary', { align: 'center' });
    doc.moveDown();

    const columns = ['Stock', 'Price', 'Stop Loss', 'Target'];

    doc.font('Helvetica-Bold').fontSize(12);
    columns.forEach((col) => doc.text(col, { continued: true, width: 120 }));
    doc.moveDown();

    doc.font('Helvetica').fontSize(10);
    data.forEach((row) => {
      columns.forEach((col) => {
        doc.text(String(row[col.toLowerCase()]), { continued: true, width: 120 });
      });
      doc.moveDown();
    });

    doc.end();
  });
}

async function uploadToDrive(buffer) {
  const fileName = `trade_summary_${Date.now()}.pdf`;
  const stream = Readable.from(buffer);

  const uploadRes = await drive.files.create({
    requestBody: {
      name: fileName,
      parents: [process.env.GOOGLE_DRIVE_FOLDER_ID],
      mimeType: 'application/pdf',
    },
    media: {
      mimeType: 'application/pdf',
      body: stream,
    },
    fields: 'id',
  });

  const fileId = uploadRes.data.id;

  await drive.permissions.create({
    fileId,
    requestBody: {
      role: 'reader',
      type: 'anyone',
    },
  });

  return `https://drive.google.com/file/d/${fileId}/view`;
}

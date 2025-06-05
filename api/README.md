# 📄 Trade Summary PDF Generator

This Vercel serverless function accepts trade data via POST, generates a styled PDF, and uploads it to a shared Google Drive folder — returning a public link suitable for sharing on WhatsApp.

## 📦 Usage

### API Endpoint

`POST /api/generate-pdf`

### Sample Payload

```json
{
  "data": [
    { "stock": "INFY", "price": 1450, "stop loss": 1420, "target": 1500 },
    { "stock": "TCS", "price": 3320, "stop loss": 3275, "target": 3400 }
  ]
}

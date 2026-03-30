const sqlite3 = require('sqlite3').verbose();
const QRCode = require('qrcode');
const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, 'backend', 'inventory.db');
if (!fs.existsSync(dbPath)) {
    console.error("Database not found at: " + dbPath);
    process.exit(1);
}

const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY, (err) => {
    if (err) {
        console.error("Error opening db:", err.message);
        process.exit(1);
    }
});

db.all(`SELECT id, inv_number, name FROM furniture`, [], async (err, rows) => {
    if (err) {
        console.error("SQL error:", err.message);
        process.exit(1);
    }
    
    if (!rows || rows.length === 0) {
        console.log("No furniture found in the database. Creating dummy labels...");
        // If DB is empty, let's just make 3 dummy ones for testing.
        rows = [
            {id: 1, inv_number: "INV-0001", name: "Стол компьютерный"},
            {id: 2, inv_number: "INV-0002", name: "Стул офисный"},
            {id: 3, inv_number: "INV-0003", name: "Шкаф для документов"}
        ];
    }

    let html = `<!DOCTYPE html>
    <html lang="ru">
    <head>
        <meta charset="UTF-8">
        <title>QR Коды - Практический Тест #47</title>
        <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #f0f2f5; margin: 0; padding: 20px; }
            h1 { text-align: center; color: #333; margin-bottom: 30px; }
            .page { display: flex; flex-wrap: wrap; justify-content: center; gap: 20px; }
            .label { background: white; border: 1px solid #ddd; border-radius: 12px; padding: 20px; text-align: center; width: 220px; box-shadow: 0 4px 6px rgba(0,0,0,0.05); page-break-inside: avoid; }
            .label img { width: 180px; height: 180px; margin-bottom: 15px; border-radius: 8px; border: 1px solid #eee; }
            .title { font-size: 16px; font-weight: 600; color: #111; margin-bottom: 5px; word-wrap: break-word; }
            .inv { font-size: 13px; color: #666; letter-spacing: 1px; }
            .btn-print { display: block; width: 200px; margin: 0 auto 30px; padding: 10px 20px; background: #007bff; color: white; text-align: center; text-decoration: none; border-radius: 8px; font-weight: bold; cursor: pointer; border: none; font-size: 16px; }
            .btn-print:hover { background: #0056b3; }
            @media print {
                body { background: white; }
                .btn-print, h1 { display: none; }
                .label { border: 1px solid #000; box-shadow: none; break-inside: avoid; }
            }
        </style>
    </head>
    <body>
        <h1>Практический Тест #47</h1>
        <button class="btn-print" onclick="window.print()">Распечатать QR Коды</button>
        <div class="page">`;

    for (const row of rows) {
        const url = `https://ecla-devclub.github.io/inventory/furniture/${row.id}`;
        const qrDataUrl = await QRCode.toDataURL(url, { margin: 1, width: 300 });
        html += `
        <div class="label">
            <img src="${qrDataUrl}" alt="QR code" />
            <div class="title">${row.name || 'Неизвестно'}</div>
            <div class="inv">${row.inv_number || 'INV-' + row.id}</div>
        </div>`;
    }
    
    html += `</div></body></html>`;
    fs.writeFileSync('qr_codes.html', html);
    console.log('Successfully generated qr_codes.html with ' + rows.length + ' items.');
    db.close();
});

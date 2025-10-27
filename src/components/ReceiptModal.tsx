import React, { useEffect } from "react";

export default function ReceiptModal({ order, onClose }: { order: any; onClose: () => void }) {
  if (!order) return null;
  const lines = order.items || [];

  useEffect(() => {
    // lock body scroll while modal is open
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  function printReceipt() {
    const w = window.open("", "_blank");
    if (!w) return;

    w.document.write(`
      <html>
      <head>
        <title>Delivery Receipt</title>
        <style>
          @page { size: A4; margin: 15mm; }
          body { font-family: Arial, sans-serif; margin: 0; padding: 0; color: #000; }

          h1, h3, h4 { margin: 0; }
          h2 { margin-top: 20px; }

          .header {
            text-align: center;
            border-bottom: 2px solid black;
            padding-bottom: 8px;
          }

          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
            font-size: 12px;
          }

          th, td {
            padding: 6px 8px;
            border: 1px solid #ccc;
          }

          th {
            background: #e3f1ff;
            text-align: left;
          }

          .info {
            display: flex;
            justify-content: space-between;
            margin-top: 10px;
            font-size: 12px;
          }

          .total {
            text-align: right;
            margin-top: 20px;
            font-weight: bold;
          }

          .signature {
            margin-top: 60px;
            text-align: right;
            font-size: 12px;
            page-break-inside: avoid;
          }

          .signature-line {
            margin-top: 40px;
            width: 300px;
            border-top: 1px solid #000;
            padding-top: 3px;
            text-align: center;
            margin-left: auto; /* pushes it to the right side */
          }

          /* ✅ Print settings */
          @media print {
            @page {
              size: A4;
              margin: 20mm;
            }

            body {
              -webkit-print-color-adjust: exact;
              font-size: 12px;
            }

            table, tr, td, th {
              page-break-inside: avoid;
            }

            .receipt-section {
              page-break-before: auto;
              page-break-after: auto;
            }

            .signature {
              page-break-inside: avoid;
            }

            .no-print {
              display: none !important;
            }

            .receipt-container {
              page-break-after: always;
            }
          }
        </style>
      </head>

      <body>
        <div class="header">
          <h3>ORINE STORE</h3>
          <div><b>📞</b> 09665345671</div>
          <div>JS ALANO STREET, MAGAY PUBLIC MARKET, ZAMBOANGA CITY</div>
          <h2>Delivery Receipt</h2>
          
        </div>

        <div class="info">
          <div>
            <b>Customer:</b> ${order.customer.name}<br>
            ${order.address}
          </div>
          <div>
            <b>Ref Number:</b> ${order.receipt_number}<br>
            <b>Date:</b> ${order.date}
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>#</th><th>Description</th><th>Qty</th><th>Price</th><th>Amount</th>
            </tr>
          </thead>
          <tbody>
            ${order.items.map((l:any, i:number) => `
              <tr>
                <td>${i + 1}</td>
                <td>${l.description}</td>
                <td>${l.quantity} ${l.unit}</td>
                <td>₱${Number(l.unit_price).toFixed(2)}</td>
                <td>₱${Number(l.amount).toFixed(2)}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>

        <div class="total">
          <h3>TOTAL: ₱${Number(order.total).toFixed(2)}</h3>
        </div>

        <div class="signature">
          Received the above merchandise in good order,<br><br><br><br>
          <div class="signature-line">Customer / Authorized Representative</div>
        </div>
      </body>
      </html>
    `);

    w.document.close();
    w.print();
  }


  return (
    <div
      className="fixed inset-0 bg-black/40 z-50 flex items-start justify-center p-4 overflow-y-auto"
      aria-modal="true"
      role="dialog"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-white rounded-xl shadow p-6 my-10 max-h-[90vh] overflow-y-auto"
        style={{ WebkitOverflowScrolling: "touch" as any }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* <div className="flex gap-2 pb-4"> */}
            {/* <button onClick={printReceipt} className="px-3 py-1 rounded text-sm">Print</button> */}
            {/* <button onClick={onClose} className="px-3 py-1 rounded text-sm">Close</button> */}
        {/* </div> */}
        <div className="flex justify-end">
          <button
            onClick={onClose}
            className="bg-white text-gray-600 hover:text-black text-xl leading-none"
            aria-label="Close"
          >
            &times;
          </button>
        </div>
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-lg font-semibold">Delivery Receipt #{order.receipt_number}</h3>
            <div className="text-sm text-gray-600">Date: <strong>{new Date(order.date).toLocaleDateString("en-PH", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}</strong></div>
            <div className="text-sm text-gray-600">Customer: <strong>{order.customer.name}</strong></div>
            <div className="text-sm text-gray-600">Total: ₱{Number(order.total).toFixed(2)}</div>

          </div>
        </div>

        <div className="overflow-hidden"> {/* keeps table width controlled */}
          <table className="w-full text-sm mt-2">
            <thead><tr className="text-left"><th>Qty</th><th>Unit</th><th>Item</th><th>Unit Price</th><th>Amount</th></tr></thead>
            <tbody>
              {lines.map((ln:any, idx:number)=>(
                <tr key={idx}>
                  <td className="py-1">{ln.quantity}</td>
                  <td className="py-1">{ln.unit}</td>
                  <td className="py-1">{ln.description}</td>
                  <td className="py-1">₱{Number(ln.unit_price).toFixed(2)}</td>
                  <td className="py-1">₱{Number(ln.amount).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="text-right font-semibold mt-2">Total: ₱{Number(order.total).toFixed(2)}</div>
        </div>
      </div>
    </div>
  );
}
import React from "react";

export default function ReceiptModal({ order, onClose }: { order: any; onClose: () => void }) {
  if (!order) return null;
  const lines = order.items || [];

  function openPrint() {
    const w = window.open("", "_blank", "width=700,height=800");
    if (!w) return;
    w.document.write(`<!doctype html><html><head><title>Receipt ${order.receipt_number}</title><meta name="viewport" content="width=device-width,initial-scale=1"><style>
      body{font-family:Inter, Arial, sans-serif; padding:20px; color:#111}
      .header{text-align:center; font-weight:700; font-size:18px; margin-bottom:10px}
      .box{border:1px solid #222; padding:10px}
      table{width:100%; border-collapse: collapse; margin-top:8px}
      th,td{padding:6px; border-bottom:1px solid #eee; text-align:left}
      .sig{margin-top:18px; display:flex; justify-content:space-between}
      @media print { body{margin:0} .no-print{display:none} }
    </style></head><body>
      <div class="header">ORINE STORE</div>
      <div class="box">
        <div>Receipt #: ${order.receipt_number}</div>
        <div>Delivered to: ${order.address}</div>
        <div>Date: ${order.date}</div>
        <div>Delivered by: ${order.delivered_by}</div>
        <table>
          <thead><tr><th>Qty</th><th>Unit</th><th>Item</th><th>Unit Price</th><th>Amount</th></tr></thead>
          <tbody>
            ${lines.map((l:any)=>`<tr><td>${l.quantity}</td><td>${l.unit}</td><td>${l.description}</td><td>₱${Number(l.unit_price).toFixed(2)}</td><td>₱${Number(l.amount).toFixed(2)}</td></tr>`).join('')}
          </tbody>
        </table>
        <div style="text-align:right;font-weight:700;margin-top:8px">Total: ₱${Number(order.total).toFixed(2)}</div>
        <div class="sig">
          <div>Checked and Certified by:<br/><br/>______________________</div>
          <div>Customer name and signature:<br/><br/>______________________</div>
        </div>
      </div>
      <div class="no-print" style="margin-top:10px"><button onclick="window.print();">Print</button> <button onclick="window.close()">Close</button></div>
    </body></html>`);
    w.document.close();
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-start justify-center z-50 p-4">
      <div className="w-full max-w-2xl bg-white rounded-xl shadow p-6">
        <div className="flex justify-between items-start mb-3">
          <div>
            <h3 className="text-lg font-semibold">Receipt — #{order.receipt_number}</h3>
            <div className="text-sm text-gray-600">Delivered to: <strong>{order.address}</strong></div>
          </div>
          <div className="flex gap-2">
            <button onClick={openPrint} className="px-3 py-1 rounded text-sm">Print</button>
            <button onClick={onClose} className="px-3 py-1 rounded text-sm">Close</button>
          </div>
        </div>

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

        <div className="mt-6 flex justify-between">
          <div>Checked and Certified by:<br/><br/>______________________</div>
          <div>Customer name and signature:<br/><br/>______________________</div>
        </div>
      </div>
    </div>
  );
}

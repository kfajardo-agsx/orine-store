import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import ReceiptForm from "../components/ReceiptForm";

export default function Home() {
  const [orders, setOrders] = useState<any[]>([]);
  const [selectedOrders, setSelectedOrders] = useState<string[]>([]);
  const [openForm, setOpenForm] = useState(false);
  const [viewOrder, setViewOrder] = useState<any | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const pageSize = 5;

  useEffect(() => {
    load(page);
  }, [page]);

  async function load(currentPage: number) {
    const from = (currentPage - 1) * pageSize;
    const to = from + pageSize - 1;

    const { data, error, count } = await supabase
      .from("orders")
      .select(`*, customer:customers (*)`, { count: "exact" })
      .order("created_at", { ascending: false })
      .range(from, to);

    if (error) {
      console.error("Error loading orders:", error);
      return;
    }

    if (currentPage === 1) setOrders(data || []);
    else setOrders(prev => [...prev, ...(data || [])]);

    if (!data?.length || (count && to + 1 >= count)) setHasMore(false);
  }

  function toggleSelect(orderId: string) {
    setSelectedOrders(prev =>
      prev.includes(orderId)
        ? prev.filter(id => id !== orderId)
        : [...prev, orderId]
    );
  }

  async function signOut() {
    await supabase.auth.signOut();
    window.location.reload();
  }

  function printSelected() {
    const selected = orders.filter(o => selectedOrders.includes(o.id));
    if (selected.length === 0) {
      alert("Please select at least one order to print.");
      return;
    }

    const w = window.open("", "_blank");
    if (!w) return;

    const baseHTML = `
    <html>
    <head>
      <title>Delivery Receipts</title>
      <meta charset="utf-8" />
      <style>
        @page { size: A4; margin: 8mm; }
        html,body { margin:0; padding:0; width:100%; height:100%; font-family: Arial, sans-serif; color:#000; -webkit-print-color-adjust: exact;}
        .sheet { width:210mm; height:297mm; box-sizing:border-box; page-break-after: always; display:block; }
        .slot { box-sizing:border-box; width:50%; height:50%; float:left; padding:6mm; border:0.5px solid transparent; }
        .receipt { width:100%; height:100%; box-sizing:border-box; border:1px solid #000; padding:6px; display:flex; flex-direction:column; justify-content:flex-start; font-size:10px; }
        .header { text-align:center; border-bottom:1px solid #000; margin-bottom:6px; }
        .header h4, .header h5 { margin:0; line-height:1.2; }
        .info { font-size:9px; display:flex; justify-content:space-between; margin-bottom:6px; }
        table { width:100%; border-collapse:collapse; font-size:9px; }
        th, td { border:1px solid #ccc; padding:2px 4px; vertical-align: top; }
        th { background:#e3f1ff; text-align:left; }
        .total { text-align:right; font-weight:bold; margin-top:6px; }
        .signature { margin-top:auto; text-align:right; font-size:9px; }
        .signature-line { border-top:1px solid #000; width:120px; margin-left:auto; margin-top:10px; }
        .measurer { position:absolute; left:-9999px; top:-9999px; width:210mm; visibility:hidden; }
        @media print { .slot { padding:6mm; } .sheet { margin:0; box-shadow:none; } .slot { border:none; } }
      </style>
    </head>
    <body>
      <div id="container"></div>
      <div id="measurer" class="measurer"></div>

      <script>
        // startIndex is the absolute index offset for numbering (0-based)
        function buildPage(order, itemsSlice, startIndex, isContinuation, isLastPage) {
          const wrapper = document.createElement('div');
          wrapper.className = 'receipt';

          const header = document.createElement('div');
          header.className = 'header';
          header.innerHTML = \`
            <h4>ORINE STORE</h4>
            <div><b>📞</b> 09665345671</div>
            <div>JS ALANO STREET, MAGAY PUBLIC MARKET, ZAMBOANGA CITY</div>
            <h5>Delivery Receipt \${isContinuation ? '(cont.)' : ''}</h5>
          \`;
          wrapper.appendChild(header);

          const info = document.createElement('div');
          info.className = 'info';
          info.innerHTML = \`
            <div>
              <b>Customer:</b> \${order.customer.name}<br>
              \${order.address ? order.address : ''}
            </div>
            <div>
              <b>Ref:</b> \${order.receipt_number}<br>
              <b>Date:</b> \${order.date}
            </div>
          \`;
          wrapper.appendChild(info);

          const table = document.createElement('table');
          const thead = document.createElement('thead');
          thead.innerHTML = '<tr><th>#</th><th>Description</th><th>Qty</th><th>Price</th><th>Amt</th></tr>';
          table.appendChild(thead);
          const tbody = document.createElement('tbody');

          itemsSlice.forEach((l, i) => {
            const globalIndex = startIndex + i; // continue numbering across pages
            const tr = document.createElement('tr');
            tr.innerHTML = \`
              <td>\${globalIndex + 1}</td>
              <td>\${l.description}</td>
              <td>\${l.quantity} \${l.unit || ''}</td>
              <td>₱\${Number(l.unit_price).toFixed(2)}</td>
              <td>₱\${Number(l.amount).toFixed(2)}</td>
            \`;
            tbody.appendChild(tr);
          });

          table.appendChild(tbody);
          wrapper.appendChild(table);

          // ONLY include total + signature when this is the last page for the order
          if (isLastPage) {
            const total = document.createElement('div');
            total.className = 'total';
            total.innerHTML = \`<h3>TOTAL: ₱\${Number(order.total).toFixed(2)}</h3>\`;
            wrapper.appendChild(total);

            const sign = document.createElement('div');
            sign.className = 'signature';
            sign.innerHTML = \`
              Received the above merchandise in good order,<br><br><br><br>
              <div class="signature-line">Customer / Authorized Representative</div>
            \`;
            wrapper.appendChild(sign);
          } else {
            // small spacer so content doesn't butt up to bottom
            const spacer = document.createElement('div');
            spacer.style.height = '6px';
            wrapper.appendChild(spacer);
          }

          return wrapper;
        }

        // paginateOrder now tracks startIndex so numbering carries over
        function paginateOrder(order, slotWidth, slotHeight) {
          const pages = [];
          const items = order.items || [];
          let start = 0;
          let startIndex = 0; // absolute item index offset for the current page
          const measurer = document.getElementById('measurer');

          while (start < items.length) {
            let end = start;
            let lastGoodEnd = start;
            while (end < items.length) {
              const slice = items.slice(start, end + 1);
              const wouldBeLast = (end + 1) === items.length;

              // pass startIndex so numbering in the measurer matches final rendering
              const tempPage = buildPage(order, slice, startIndex, start !== 0 || !wouldBeLast, wouldBeLast);
              measurer.style.width = slotWidth + 'px';
              measurer.style.height = slotHeight + 'px';
              measurer.innerHTML = '';
              measurer.appendChild(tempPage);

              const overflow = measurer.scrollHeight > measurer.clientHeight;
              if (overflow) {
                if (end === start) {
                  // single row overflowed - force at least one row
                  lastGoodEnd = end + 1;
                  end = start + 1;
                }
                break;
              } else {
                lastGoodEnd = end + 1;
                end++;
              }

              if (end - start > 5000) break; // safety
            }

            const itemsSlice = items.slice(start, lastGoodEnd);
            const isLastPage = lastGoodEnd >= items.length;
            const pageNode = buildPage(order, itemsSlice, startIndex, start !== 0, isLastPage);
            pages.push(pageNode);

            // advance indices: number of items placed on this page
            const placed = lastGoodEnd - start;
            start += placed;
            startIndex += placed; // important: this makes numbering continue
          }

          // If there are zero items, create a single page that still shows total/signature
          if (items.length === 0) {
            pages.push(buildPage(order, [], 0, false, true));
          }

          return pages;
        }

        function renderAllPages(orders) {
          const container = document.getElementById('container');

          // measure slot content dimensions
          const measureSheet = document.createElement('div');
          measureSheet.className = 'sheet';
          const measureSlot = document.createElement('div');
          measureSlot.className = 'slot';
          measureSheet.appendChild(measureSlot);
          document.body.appendChild(measureSheet);

          const slotRect = measureSlot.getBoundingClientRect();
          const slotStyle = window.getComputedStyle(measureSlot);
          const padTop = parseFloat(slotStyle.paddingTop);
          const padBottom = parseFloat(slotStyle.paddingBottom);
          const padLeft = parseFloat(slotStyle.paddingLeft);
          const padRight = parseFloat(slotStyle.paddingRight);
          const contentWidth = slotRect.width - padLeft - padRight;
          const contentHeight = slotRect.height - padTop - padBottom;

          document.body.removeChild(measureSheet);

          const slotWidthPx = contentWidth;
          const slotHeightPx = contentHeight;
          const allPages = [];

          orders.forEach(order => {
            const pages = paginateOrder(order, slotWidthPx, slotHeightPx);
            allPages.push(...pages);
          });

          for (let i = 0; i < allPages.length; i += 4) {
            const sheet = document.createElement('div');
            sheet.className = 'sheet';
            for (let j = 0; j < 4; j++) {
              const slot = document.createElement('div');
              slot.className = 'slot';
              const page = allPages[i + j];
              if (page) slot.appendChild(page);
              sheet.appendChild(slot);
            }
            container.appendChild(sheet);
          }
        }

        window.addEventListener('load', () => {
          try {
            renderAllPages(PRINT_ORDERS_DATA || []);
            setTimeout(() => { window.print(); }, 250);
          } catch (err) {
            console.error('Printing error', err);
            alert('Error preparing print: ' + (err && err.message));
          }
        });
      </script>
    </body>
    </html>
    `;

    // inject selected orders JSON into the page
    const htmlWithOrders = baseHTML.replace('PRINT_ORDERS_DATA || []', JSON.stringify(selected));

    w.document.open();
    w.document.write(htmlWithOrders);
    w.document.close();
  }



  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-5xl mx-auto">
        <header className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-semibold text-gray-800">Delivery Receipts</h2>
            <p className="text-sm text-gray-500">Recent receipts</p>
            { selectedOrders.length > 0 && <button
              onClick={printSelected}
            >
              Print Selected
            </button> }
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => setOpenForm(true)}>+New</button>
            <button onClick={signOut}>Logout</button>
          </div>
        </header>

        <div className="space-y-3">
          {orders.length === 0 ? (
            <div className="bg-white p-6 rounded-md shadow text-gray-600">
              No receipts yet — click “Add New” to create one.
            </div>
          ) : (
            orders.map((o) => (
              <div
                key={o.id}
                onClick={() => { setViewOrder(o); console.log(o); setOpenForm(true); }}
                className="cursor-pointer bg-white p-4 rounded-md shadow flex justify-between items-start hover:bg-gray-50 transition"
              >
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={selectedOrders.includes(o.id)}
                    onChange={() => toggleSelect(o.id)}
                    onClick={(e) => e.stopPropagation()}
                  />
                  <div>
                    <div className="font-medium text-sm text-gray-800">
                      {o.customer?.name}
                    </div>
                    <div className="text-sm text-gray-500">
                      #{o.receipt_number} —{" "}
                      {new Date(o.date).toLocaleDateString("en-PH", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </div>
                    <div className="text-sm text-gray-500">{o.address}</div>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-lg font-semibold">
                    ₱{Number(o.total || 0).toFixed(2)}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {hasMore && (
          <div className="text-center mt-6">
            <button
              onClick={() => setPage(p => p + 1)}
              className="px-4 py-2 bg-amber-600 text-white rounded shadow hover:bg-amber-700 transition"
            >
              Load More
            </button>
          </div>
        )}
      </div>
      
      <ReceiptForm open={openForm} onClose={() => setOpenForm(false)} onSaved={() => load(1)} />
      { viewOrder && <ReceiptForm open={openForm} order={viewOrder} onClose={() => { setOpenForm(false); setViewOrder(null) }} onSaved={() => load(1)} />}
    </div>
  );
}

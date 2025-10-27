import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import ReceiptForm from "../components/ReceiptForm";
import ReceiptModal from "../components/ReceiptModal";

export default function Home() {
  const [orders, setOrders] = useState<any[]>([]);
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

  async function signOut() {
    await supabase.auth.signOut();
    window.location.reload();
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-5xl mx-auto">
        <header className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-semibold text-gray-800">Delivery Receipts</h2>
            <p className="text-sm text-gray-500">Recent receipts</p>
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
                onClick={() => setViewOrder(o)}
                className="bg-white p-4 rounded-md shadow flex justify-between items-start cursor-pointer hover:bg-gray-50 transition"
              >
                <div>
                  <div className="font-medium text-sm text-gray-800">
                    {o.customer?.name} - {o.date}
                  </div>
                  <div className="font-medium text-sm text-gray-400">
                    #{o.receipt_number}
                  </div>
                  <div className="text-sm text-gray-500">{o.address}</div>
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

      <ReceiptForm open={openForm} onClose={() => { setOpenForm(false); load(1); }} />
      {viewOrder && <ReceiptModal order={viewOrder} onClose={() => setViewOrder(null)} />}
    </div>
  );
}

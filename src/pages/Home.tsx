import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import ReceiptForm from "../components/ReceiptForm";
import ReceiptModal from "../components/ReceiptModal";

export default function Home() {
  const [orders, setOrders] = useState<any[]>([]);
  const [openForm, setOpenForm] = useState(false);
  const [viewOrder, setViewOrder] = useState<any | null>(null);

  useEffect(() => {
    load();
    // optionally: subscribe to changes
  }, []);

  async function load() {
    const { data, error } = await supabase
      .from("orders")
      .select(`
        *,
        customer:customers (*)
      `)
      .order("created_at", { ascending: false })
      .limit(200);

    if (error) {
      console.error("Error loading orders:", error);
      return;
    }

    setOrders(data || []);
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
            <h2 className="text-2xl font-semibold text-gray-800">Orine Store — Delivery Receipts</h2>
            <p className="text-sm text-gray-500">Recent receipts</p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => setOpenForm(true)}>+ Add New</button>
            <button onClick={signOut}>Logout</button>
          </div>
        </header>

        <div className="space-y-3">
          {orders.length === 0 ? (
            <div className="bg-white p-6 rounded-md shadow text-gray-600">No receipts yet — click “Add New” to create one.</div>
          ) : (
            orders.map((o) => (
              <div key={o.id} className="bg-white p-4 rounded-md shadow flex justify-between items-start">
                <div>
                  <div className="font-medium text-gray-800">{o.customer.name} - {o.date}</div>
                  <div className="font-medium text-gray-400">#{o.receipt_number}</div>
                  <div className="text-sm text-gray-500">{o.address}</div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-semibold">₱{Number(o.total || 0).toFixed(2)}</div>
                  <div className="mt-3 flex gap-2">
                    <button onClick={() => setViewOrder(o)} className="px-3 py-1 rounded text-sm">View</button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <ReceiptForm open={openForm} onClose={() => { setOpenForm(false); load(); }} />
      {viewOrder && <ReceiptModal order={viewOrder} onClose={() => setViewOrder(null)} />}
    </div>
  );
}

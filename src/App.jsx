import React, { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

export default function App() {
  const [session, setSession] = useState(null);
  const [page, setPage] = useState("login");
  const [customers, setCustomers] = useState([]);
  const [items, setItems] = useState([]);
  const [orders, setOrders] = useState([]);
  const [form, setForm] = useState({
    receipt_number: "",
    customer_id: "",
    delivered_by: "",
    date: new Date().toISOString().split("T")[0],
    orderItems: [],
  });

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) loadData();
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  async function loadData() {
    const { data: c } = await supabase.from("customers").select("*");
    const { data: i } = await supabase.from("items").select("*");
    const { data: o } = await supabase.from("orders").select("*").order("created_at", { ascending: false });
    setCustomers(c || []);
    setItems(i || []);
    setOrders(o || []);
  }

  async function login(e) {
    e.preventDefault();
    const email = e.target.email.value;
    const password = e.target.password.value;
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) alert(error.message);
  }

  async function logout() {
    await supabase.auth.signOut();
    setSession(null);
  }

  async function saveOrder() {
    const total = form.orderItems.reduce((sum, i) => sum + i.qty * i.price, 0);
    const { error } = await supabase.from("orders").insert([
      {
        receipt_number: form.receipt_number,
        customer_id: form.customer_id,
        delivered_by: form.delivered_by,
        date: form.date,
        items: form.orderItems,
        total,
        created_by: session.user.id,
      },
    ]);
    if (error) alert(error.message);
    else {
      alert("Saved!");
      loadData();
      setPage("receipts");
    }
  }

  if (!session) {
    return (
      <div className="flex h-screen items-center justify-center">
        <form onSubmit={login} className="p-6 border rounded shadow w-80">
          <h1 className="text-lg font-bold mb-4 text-center">Orine Store Login</h1>
          <input name="email" placeholder="Email" className="border p-2 mb-2 w-full" />
          <input name="password" type="password" placeholder="Password" className="border p-2 mb-2 w-full" />
          <button className="bg-blue-600 text-white w-full p-2 rounded">Login</button>
        </form>
      </div>
    );
  }

  if (page === "new") {
    return (
      <div className="p-4 max-w-2xl mx-auto">
        <button onClick={() => setPage("receipts")} className="text-sm mb-3">← Back</button>
        <h1 className="font-bold mb-4">New Delivery Receipt</h1>

        <input
          placeholder="Receipt Number"
          className="border p-2 mb-2 w-full"
          value={form.receipt_number}
          onChange={(e) => setForm({ ...form, receipt_number: e.target.value })}
        />

        <select
          className="border p-2 mb-2 w-full"
          value={form.customer_id}
          onChange={(e) => setForm({ ...form, customer_id: e.target.value })}
        >
          <option value="">Select Customer</option>
          {customers.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>

        <input
          placeholder="Delivered By"
          className="border p-2 mb-2 w-full"
          value={form.delivered_by}
          onChange={(e) => setForm({ ...form, delivered_by: e.target.value })}
        />

        <div className="border p-2 mb-2">
          <h2 className="font-bold mb-2">Items</h2>
          {form.orderItems.map((it, idx) => (
            <div key={idx} className="flex gap-2 mb-2">
              <input value={it.qty} type="number" onChange={(e) => {
                const arr = [...form.orderItems];
                arr[idx].qty = e.target.value;
                setForm({ ...form, orderItems: arr });
              }} className="border p-1 w-16" placeholder="Qty" />
              <input value={it.unit} onChange={(e) => {
                const arr = [...form.orderItems];
                arr[idx].unit = e.target.value;
                setForm({ ...form, orderItems: arr });
              }} className="border p-1 w-16" placeholder="Unit" />
              <input value={it.name} onChange={(e) => {
                const arr = [...form.orderItems];
                arr[idx].name = e.target.value;
                setForm({ ...form, orderItems: arr });
              }} className="border p-1 flex-1" placeholder="Item" />
              <input value={it.price} type="number" onChange={(e) => {
                const arr = [...form.orderItems];
                arr[idx].price = parseFloat(e.target.value);
                setForm({ ...form, orderItems: arr });
              }} className="border p-1 w-24" placeholder="₱ Price" />
            </div>
          ))}
          <button onClick={() => setForm({ ...form, orderItems: [...form.orderItems, { qty: 1, unit: '', name: '', price: 0 }] })}
            className="text-blue-600 text-sm">+ Add Item</button>
        </div>

        <button onClick={saveOrder} className="bg-green-600 text-white p-2 rounded w-full">Save Receipt</button>
      </div>
    );
  }

  return (
    <div className="p-4 max-w-3xl mx-auto">
      <div className="flex justify-between mb-4">
        <h1 className="font-bold text-xl">Orine Store Receipts</h1>
        <div>
          <button onClick={() => setPage('new')} className="bg-blue-600 text-white px-3 py-1 rounded mr-2">+ New</button>
          <button onClick={logout} className="text-sm underline">Logout</button>
        </div>
      </div>
      {orders.map((o) => (
        <div key={o.id} className="border p-3 mb-2 rounded">
          <div className="flex justify-between">
            <div>Receipt #{o.receipt_number}</div>
            <div>{o.date}</div>
          </div>
          <div>Total: ₱{o.total?.toFixed(2)}</div>
        </div>
      ))}
    </div>
  );
}

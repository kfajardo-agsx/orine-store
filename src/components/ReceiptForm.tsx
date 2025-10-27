import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { EditableSelect } from "./EditableSelect";

type Line = { quantity: number; unit: string; description: string; unit_price: number; amount: number };

type Customer = {
  id: string;
  name: string;
  address?: string;
};

type Item = {
  id: string;
  name: string;
  unit: string;
  unit_price: number;
};

export default function ReceiptForm({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [customers, setCustomers] = useState<any[]>([]);
  const [itemsCatalog, setItemsCatalog] = useState<any[]>([]);
  const [receiptNumber, setReceiptNumber] = useState("");
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [address, setAddress] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [deliveredBy, setDeliveredBy] = useState("");
  const [lines, setLines] = useState<Line[]>([{ quantity: 1, unit: "", description: "", unit_price: 0, amount: 0 }]);
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (open) load(); }, [open]);

  async function load() {
    const { data: c } = await supabase.from("customers").select("*").order("name");
    const { data: it } = await supabase.from("items").select("*").order("name");
    setCustomers(c || []); setItemsCatalog(it || []);
  }

  function updateLine(idx: number, patch: Partial<Line>) {
    setLines(prev => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], ...patch };
      copy[idx].amount = Number((copy[idx].quantity * copy[idx].unit_price).toFixed(2));
      return copy;
    });
  }

  function addRow() { setLines(prev => [...prev, { quantity: 1, unit: "", description: "", unit_price: 0, amount: 0 }]); }
  function removeLine(i: number) {
    setLines(prev => {
        const next = prev.filter((_, idx) => idx !== i);
        return next.length ? next : [{ quantity: 1, unit: '', description: '', unit_price: 0, amount: 0 }];
    });
  }

  function onCustomerChange(id: string) {
    setCustomerId(id);
    const c = customers.find(x => x.id === id);
    setAddress(c?.address || "");
  }

  async function save() {
    if (!receiptNumber) { alert("Enter receipt number"); return; }
    const total = lines.reduce((s, l) => s + (l.amount || 0), 0);
    setSaving(true);
    const user = await supabase.auth.getUser();
    const uid = user?.data?.user?.id || null;
    const { error } = await supabase.from("orders").insert([{
      receipt_number: receiptNumber,
      customer_id: customerId,
      address,
      date,
      delivered_by: deliveredBy,
      items: lines,
      total,
      created_by: uid
    }]);
    setSaving(false);
    if (error) { alert(error.message); return; }
    onClose();
  }

  const total = lines.reduce((s, l) => s + (l.amount || 0), 0);

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-start justify-center z-50 p-4">
      <div className="w-full max-w-3xl bg-white rounded-xl shadow p-6">
        <div className="flex justify-between items-start mb-4">
          <h3 className="text-lg font-semibold">ORINE STORE Delivery Receipt</h3>
          <div className="text-sm">Receipt #: <input className="border px-2 py-1 rounded w-40" value={receiptNumber} onChange={e => setReceiptNumber(e.target.value)} /></div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm text-gray-600">Customer</label>
            {/* <select className="w-full border p-2 rounded" value={customerId || ""} onChange={e => onCustomerChange(e.target.value)}>
              <option value="">-- Select Customer --</option>
              {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select> */}
            <EditableSelect<Customer>
              value={customers.find(c => c.id === customerId)?.name || ""}
              table="customers"
              displayField="name"
              placeholder="Select customer"
              extraFields={["address"]}
              disableFreeType={true}
              onSelect={(cust) => {
                if (cust) {
                  setCustomerId(cust.id);
                  setAddress(cust.address || "");
                }
              }}
            />

            <label className="block text-sm text-gray-600 mt-2">Address</label>
            {/* <textarea className="w-full border p-2 rounded" value={address} onChange={e => setAddress(e.target.value)} /> */}
              <textarea
              className="w-full border p-2 rounded"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm text-gray-600">Delivery Date</label>
            <input type="date" className="w-full border p-2 rounded" value={date} onChange={e => setDate(e.target.value)} />
            <label className="block text-sm text-gray-600 mt-2">Delivered by</label>
            <input className="w-full border p-2 rounded" value={deliveredBy} onChange={e => setDeliveredBy(e.target.value)} />
          </div>
        </div>

        <div className="mb-4">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="text-left">
                <th className="pb-2">Qty</th>
                <th className="pb-2">Unit</th>
                <th className="pb-2">Item</th>
                <th className="pb-2">Unit Price</th>
                <th className="pb-2 text-right">Amount</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {lines.map((ln, idx) => (
                <tr key={idx}>
                  <td className="py-1">
                    <input
                      type="number"
                      min={0}
                      className="w-16 border p-1"
                      value={ln.quantity}
                      onChange={(e) => updateLine(idx, { quantity: Number(e.target.value) })}
                    />
                  </td>
                  <td className="py-1">
                    <input
                      className="w-20 border p-1"
                      value={ln.unit}
                      onChange={(e) => updateLine(idx, { unit: e.target.value })}
                    />
                  </td>
                  <td className="py-1">
                    <EditableSelect<Item>
                      value={ln.description}
                      table="items"
                      displayField="name"
                      extraFields={["unit", "unit_price"]}
                      placeholder="Type or select item"
                      onSelect={(it: Item | null, typed?: string) => {
                        if (it) {
                          updateLine(idx, {
                            description: it.name,
                            unit: it.unit || "",
                            unit_price: Number(it.unit_price ?? 0),
                          });
                        } else if (typed !== undefined) {
                          updateLine(idx, { description: typed });
                        }
                      }}
                    />
                  </td>
                  <td className="py-1">
                    <input
                      type="number"
                      step="0.01"
                      className="w-28 border p-1"
                      value={ln.unit_price}
                      onChange={(e) =>
                        updateLine(idx, { unit_price: Number(e.target.value) })
                      }
                    />
                  </td>
                  <td className="py-1 text-right">₱{(ln.amount || 0).toFixed(2)}</td>
                  <td className="py-1">
                    <button
                      onClick={() => removeLine(idx)}
                      className="text-red-600 text-sm"
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>

          </table>

          <div className="flex items-center justify-between mt-3">
            <button onClick={addRow} className="text-sm text-blue-600">+ Add Row</button>
            <div className="font-semibold">Total: ₱{total.toFixed(2)}</div>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-3 py-1 border rounded">Cancel</button>
          <button onClick={save} disabled={saving} className="px-4 py-2 bg-amber-600 text-white rounded">{saving ? "Saving..." : "Save Receipt"}</button>
        </div>
      </div>
    </div>
  );
}

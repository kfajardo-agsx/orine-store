import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { EditableSelect } from "./EditableSelect";
import toast from "react-hot-toast";
import { Trash2 } from "lucide-react";

type Line = { 
  quantity: string; 
  unit: string; 
  description: string; 
  unit_price: string; 
  amount: number; 
};

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

type Order = {
  id: string;
  receipt_number: string;
  customer_id?: string | null;
  address?: string;
  date?: string;
  delivered_by?: string;
  items?: Line[];
  total?: number;
  created_by?: string | null;
  customer?: Customer;
};

export default function ReceiptForm({
  open,
  onClose,
  order,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  order?: Order | null;
  onSaved?: () => void;
}) {
    const [customers, setCustomers] = useState<any[]>([]);
    const [itemsCatalog, setItemsCatalog] = useState<any[]>([]);
    const [receiptNumber, setReceiptNumber] = useState("");
    const [customerName, setCustomerName] = useState<string | null>(null);
    const [customerId, setCustomerId] = useState<string | null>(null);
    const [address, setAddress] = useState("");
    const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
    const [deliveredBy, setDeliveredBy] = useState("");
    const [lines, setLines] = useState<Line[]>([{ quantity: "1", unit: "", description: "", unit_price: "0", amount: 0 }]);
    const [saving, setSaving] = useState(false);

    useEffect(() => { if (open) loadLookups(); }, [open]);

    async function loadLookups() {
        const { data: c } = await supabase.from("customers").select("*").order("name");
        const { data: it } = await supabase.from("items").select("*").order("name");
        setCustomers(c || []);
        setItemsCatalog(it || []);
    }

    useEffect(() => {
        if (!open || !order) return;
        if (customers.length === 0) return; // wait until customers loaded

        const matchCust = customers.find(c => c.id === order.customer_id);
        if (matchCust) {
            setCustomerId(matchCust.id);
            setCustomerName(matchCust.name.toLocaleUpperCase());
            setAddress(matchCust.address || "");
        } else if (order.customer) {
            setCustomerId(order.customer.id || null);
            setCustomerName(order.customer.name?.toLocaleUpperCase() || "");
            setAddress(order.customer.address || order.address || "");
        }
    }, [open, order, customers]);

    useEffect(() => {
        if (!open) return;
        if (order) {
            setReceiptNumber(order.receipt_number || "");
            setDate(order.date ? order.date.slice(0,10) : new Date().toISOString().slice(0,10));
            setDeliveredBy(order.delivered_by || "");
            // ensure lines shape
            const safeLines: Line[] = (order.items && Array.isArray(order.items) && order.items.length)
                ? order.items.map((l: any) => {
                    const qtyNum = Number(l.quantity ?? 0);
                    const priceNum = Number(l.unit_price ?? 0);
                    const computed = l.amount ?? (qtyNum * priceNum);
                    return {
                        quantity: (l.quantity ?? "1").toString(),
                        unit: l.unit ?? "",
                        description: l.description ?? l.name ?? l.item ?? "",  // 👈 add l.item as fallback
                        unit_price: typeof l.unit_price === "number"
                        ? l.unit_price
                        : (Number(l.unit_price).toString() ?? "0"),
                        amount: Number(computed || 0),
                    } as Line;
                    })
                : [{ quantity: "1", unit: "", description: "", unit_price: "0", amount: 0 }];        setLines(safeLines);
        } else {
        // creating new: reset
        resetForm();
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, order]); 

  // lock background scroll while modal open
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  function updateLine(idx: number, patch: Partial<Line>) {
    setLines(prev => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], ...patch };
      copy[idx].amount = Number((Number(copy[idx].quantity) * Number(copy[idx].unit_price)).toFixed(2));
      return copy;
    });
  }

  function addRow() { setLines(prev => [...prev, { quantity: "1", unit: "", description: "", unit_price: "0", amount: 0 }]); }
  function removeLine(i: number) {
    setLines(prev => {
        const next = prev.filter((_, idx) => idx !== i);
        return next.length ? next : [{ quantity: "1", unit: "", description: "", unit_price: "0", amount: 0 }];
    });
  }

  function resetForm() {
    setReceiptNumber("");
    setCustomerName(null);
    setCustomerId(null);
    setAddress("");
    setDate(new Date().toISOString().slice(0, 10));
    setDeliveredBy("");
    setLines([{ quantity: "1", unit: "", description: "", unit_price: "0", amount: 0 }]);
  }

  async function save() {
    if (!receiptNumber) { toast.error("Enter receipt number"); return; }
    if (!customerName || customerName === "") { toast.error("Set a valid customer name"); return; }
    for (const line of lines) {
      if (!line.unit || line.unit === "") { toast.error("An item/s has no unit set"); return; }
      if (!line.description || line.description === "") { toast.error("An item/s has no description set"); return; }
      if (!line.unit_price || line.unit_price === "" || Number(line.unit_price) === 0) { toast.error("An item/s has no unit price set"); return; }
    }

    setSaving(true);
    try {
      let custId = customerId;

      if (!customerId && customerName) {
        const { data: newCustomer, error: customerError } = await supabase
          .from("customers")
          .upsert(
            [{ name: customerName.toLocaleUpperCase(), address }],
            { onConflict: "name" }
          )
          .select()
          .single();

        if (customerError) {
          toast.error(customerError.message);
          setSaving(false);
          return;
        }

        custId = newCustomer.id;
        setCustomerId(newCustomer.id);
      }

    // upsert items into catalog
    // upsert items into catalog (parallelized)
    const upsertPromises = lines.map(line => {
    return supabase
        .from("items")
        .upsert(
        [
            {
                name: line.description.toLocaleUpperCase(),
                unit: line.unit,
                unit_price: Number(line.unit_price).toString(),
            },
        ],
        { onConflict: "name" }
        );
    });

    const results = await Promise.all(upsertPromises);

    const itemError = results.find(r => r.error);
    if (itemError && itemError.error) {
    toast.error(
        `Failed to save some items: ${itemError.error.message}`
    );
    setSaving(false);
    return;
    }

      const total = lines.reduce((s, l) => s + (l.amount || 0), 0);
      const user = await supabase.auth.getUser();
      const uid = user?.data?.user?.id || null;

      if (order && order.id) {
        // update existing order
        const { error } = await supabase
          .from("orders")
          .update([{
            receipt_number: receiptNumber,
            customer_id: custId,
            address,
            date,
            delivered_by: deliveredBy,
            items: lines,
            total,
          }])
          .eq("id", order.id);

        if (error) {
          toast.error(error.message);
          setSaving(false);
          return;
        }

        toast.success("Receipt updated!");
      } else {
        // insert new order
        const { error } = await supabase.from("orders").insert([{
          receipt_number: receiptNumber,
          customer_id: custId,
          address,
          date,
          delivered_by: deliveredBy,
          items: lines,
          total,
          created_by: uid
        }]);

        if (error) {
          toast.error(error.message);
          setSaving(false);
          return;
        }

        toast.success("Receipt saved!");
        // reset form after successful create so next open is blank
        resetForm();
      }

      setSaving(false);
      if (onSaved) onSaved();
      onClose();
    } catch (err: any) {
      setSaving(false);
      toast.error(err?.message || "Error saving receipt");
    }
  }

  const total = lines.reduce((s, l) => s + (l.amount || 0), 0);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 bg-black/40 z-50 flex items-start justify-center p-4 overflow-y-auto"
      onClick={onClose}
      aria-modal="true"
      role="dialog"
    >
      <div
        className="w-full max-w-3xl bg-white rounded-xl shadow p-6 my-10 max-h-[90vh] overflow-y-auto"
        style={{ WebkitOverflowScrolling: "touch" as any }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="grid grid-cols-2 gap-4 mb-4">
          <h3 className="text-lg font-semibold">ORINE STORE { order ? <div>Update Delivery Receipt</div> : <div>New Delivery Receipt</div> }</h3>
          <div className="text-sm">Receipt #:<div> <input className="border px-2 py-1 rounded w-full" value={receiptNumber} onChange={e => setReceiptNumber(e.target.value)} /></div></div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm text-gray-600">Customer</label>
            <EditableSelect<Customer>
              value={order ? customerName : customers.find(c => c.id === customerId)?.name || ""}
              table="customers"
              displayField="name"
              placeholder="Select customer"
              extraFields={["address"]}
              onSelect={(cust: Customer | null, typed?: string) => {
                if (cust) {
                  setCustomerId(cust.id);
                  setCustomerName(cust.name.toLocaleUpperCase());
                  setAddress(cust.address || "");
                } else if (typed !== undefined) {
                  setCustomerId(null);
                  setCustomerName(typed.toLocaleUpperCase());
                  setAddress("");
                }
              }}
            />
          </div>

          <div>
            <label className="block text-sm text-gray-600">Delivery Date</label>
            <input type="date" className="w-full border p-1 rounded text-sm" value={date} onChange={e => setDate(e.target.value)} />
            <label className="block text-sm text-gray-600 mt-2">Delivered by</label>
            <input className="w-full border p-1 rounded text-sm" value={deliveredBy} onChange={e => setDeliveredBy(e.target.value)} />
          </div>
        </div>

        <div className="mb-4 overflow-x-auto pb-7">
          <table className="min-w-[600px] w-full text-xs border-collapse">
            <thead>
              <tr className="text-left">
                <th className="pb-2">Qty</th>
                <th className="pb-2">Unit</th>
                <th className="pb-2">Item</th>
                <th className="pb-1"></th>
                <th className="pb-2 text-right">Unit Price</th>
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
                      className="w-12 border p-1 rounded text-sm"
                      value={ln.quantity ?? ""}
                      onChange={(e) => updateLine(idx, { quantity: e.target.value })}
                    />
                  </td>
                  <td className="py-1">
                    <input
                      className="w-16 border p-1 rounded text-sm"
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
                            description: it.name.toLocaleUpperCase(),
                            unit: it.unit || "",
                            unit_price: it.unit_price.toString() ?? "0",
                          });
                        } else if (typed !== undefined) {
                          updateLine(idx, { description: typed.toLocaleUpperCase() });
                        }
                      }}
                    />
                  </td>
                  <td className="w-1"></td>
                  <td className="py-1 text-right">
                    <input
                      type="number"
                      step="1.00"
                      className="w-18 border p-1 rounded text-sm"
                      value={ln.unit_price}
                      onChange={(e) =>
                        updateLine(idx, { unit_price: e.target.value })
                      }
                    />
                  </td>
                  <td className="py-1 text-right">₱{(ln.amount || 0).toFixed(2)}</td>
                  <td className="py-1">
                    <button
                      onClick={() => removeLine(idx)}
                      className="bg-white text-sm"
                    >
                      <Trash2 size={12} color="red" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>

          </table>
        </div>
        <div className="flex items-center justify-between mt-3">
          <button onClick={addRow} className="text-sm text-blue-600">+ Add Row</button>
          <div className="font-semibold">Total: ₱{total.toFixed(2)}</div>
        </div>

        <div className="flex justify-end gap-2">
          <button onClick={() => { resetForm(); onClose(); }} className="px-3 py-1 border rounded">Cancel</button>
          <button onClick={save} disabled={saving} className="px-4 py-2 bg-amber-600 text-white rounded">{saving ? "Saving..." : (order && order.id ? "Update Receipt" : "Save Receipt")}</button>
        </div>
      </div>
    </div>
  );
}

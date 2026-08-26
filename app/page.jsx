"use client";

import { useMemo, useState } from "react";

const emptyInvoice = {
  customerName: "",
  customerEmail: "",
  customerPhone: "",
  customerAddress: "",
  invoiceNumber: `R-${Date.now().toString().slice(-6)}`,
  dueDate: "",
  product: "",
  quantity: 1,
  unitPrice: "",
  notes: ""
};

export default function Home() {
  const [form, setForm] = useState(emptyInvoice);
  const [status, setStatus] = useState("");

  const total = useMemo(() => {
    const q = Number(form.quantity) || 0;
    const p = Number(form.unitPrice) || 0;
    return q * p;
  }, [form.quantity, form.unitPrice]);

  function update(key, value) {
    setForm((old) => ({ ...old, [key]: value }));
  }

  async function emailInvoice() {
    if (!form.customerName || !form.customerEmail || !form.invoiceNumber || !form.dueDate || !form.product) {
      setStatus("Please complete the customer information, invoice number, due date, and product.");
      return;
    }

    setStatus("Sending invoice...");
    try {
      const response = await fetch("/api/send-invoice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, total })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Unable to send invoice.");
      }

      setStatus("Invoice emailed successfully.");
    } catch (error) {
      setStatus(error.message || "Something went wrong.");
    }
  }

  return (
    <main className="shell">
      <header className="topbar">
        <div className="brand">
          <div className="logo-box">
            <img src="/rankora-logo.jpeg" alt="Rankora logo" />
          </div>
          <div>
            <h1>Rankora Invoice Generator</h1>
            <p>Create, preview, print, and email professional invoices.</p>
          </div>
        </div>
        <div className="contact">
          <strong>Rankora</strong>
          <span>386-868-9183</span>
        </div>
      </header>

      <section className="workspace">
        <aside className="panel">
          <h2>Invoice Details</h2>

          <div className="field">
            <label>Customer Name *</label>
            <input value={form.customerName} onChange={(e) => update("customerName", e.target.value)} placeholder="Customer name" />
          </div>

          <div className="two">
            <div className="field">
              <label>Customer Email *</label>
              <input type="email" value={form.customerEmail} onChange={(e) => update("customerEmail", e.target.value)} placeholder="customer@email.com" />
            </div>
            <div className="field">
              <label>Customer Phone</label>
              <input value={form.customerPhone} onChange={(e) => update("customerPhone", e.target.value)} placeholder="Phone number" />
            </div>
          </div>

          <div className="field">
            <label>Customer Address</label>
            <textarea rows="2" value={form.customerAddress} onChange={(e) => update("customerAddress", e.target.value)} placeholder="Address" />
          </div>

          <hr className="divider" />

          <div className="two">
            <div className="field">
              <label>Invoice Number *</label>
              <input value={form.invoiceNumber} onChange={(e) => update("invoiceNumber", e.target.value)} />
            </div>
            <div className="field">
              <label>Due Date *</label>
              <input type="date" value={form.dueDate} onChange={(e) => update("dueDate", e.target.value)} />
            </div>
          </div>

          <div className="field">
            <label>Product / Service *</label>
            <input value={form.product} onChange={(e) => update("product", e.target.value)} placeholder="What was purchased?" />
          </div>

          <div className="two">
            <div className="field">
              <label>Quantity</label>
              <input type="number" min="1" value={form.quantity} onChange={(e) => update("quantity", e.target.value)} />
            </div>
            <div className="field">
              <label>Unit Price ($)</label>
              <input type="number" min="0" step="0.01" value={form.unitPrice} onChange={(e) => update("unitPrice", e.target.value)} placeholder="0.00" />
            </div>
          </div>

          <div className="field">
            <label>Notes</label>
            <textarea rows="3" value={form.notes} onChange={(e) => update("notes", e.target.value)} placeholder="Optional payment or service notes" />
          </div>

          <div className="actions">
            <button className="btn btn-primary" onClick={emailInvoice}>Email Invoice to Customer</button>
            <button className="btn btn-secondary" onClick={() => window.print()}>Print / Save as PDF</button>
          </div>
          <div className="status">{status}</div>
        </aside>

        <div className="invoice-wrap">
          <article className="invoice">
            <div className="invoice-head">
              <img className="invoice-logo" src="/rankora-logo.jpeg" alt="Rankora logo" />
              <div className="invoice-title">
                <h2>INVOICE</h2>
                <p>Invoice #{form.invoiceNumber || "—"}</p>
              </div>
            </div>

            <div className="info-grid">
              <div className="info-card">
                <small>Bill To</small>
                <strong>{form.customerName || "Customer Name"}</strong>
                <span>{form.customerEmail || "customer@email.com"}</span>
                {form.customerPhone && <span>{form.customerPhone}</span>}
                {form.customerAddress && <span>{form.customerAddress}</span>}
              </div>
              <div className="info-card">
                <small>Rankora</small>
                <strong>Rankora</strong>
                <span>386-868-9183</span>
                <span>Due: {form.dueDate || "Not selected"}</span>
              </div>
            </div>

            <table className="invoice-table">
              <thead>
                <tr>
                  <th>Product / Service</th>
                  <th className="right">Qty</th>
                  <th className="right">Unit Price</th>
                  <th className="right">Total</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>{form.product || "Product or service"}</td>
                  <td className="right">{form.quantity || 0}</td>
                  <td className="right">${Number(form.unitPrice || 0).toFixed(2)}</td>
                  <td className="right">${total.toFixed(2)}</td>
                </tr>
              </tbody>
            </table>

            <div className="total-box">
              <div className="total-row grand">
                <span>Amount Due</span>
                <span>${total.toFixed(2)}</span>
              </div>
            </div>

            {form.notes && (
              <div className="notes">
                <strong>Notes</strong>
                <p>{form.notes}</p>
              </div>
            )}

            <div className="invoice-footer">
              Thank you for choosing Rankora. Questions? Call or text 386-868-9183.
            </div>
          </article>
        </div>
      </section>
    </main>
  );
}
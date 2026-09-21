"use client";

import { useState } from "react";

export default function Home() {
  const [invoiceNumber, setInvoiceNumber] = useState("VRQC-001");
  const [currency, setCurrency] = useState("$");
  const [issueDate, setIssueDate] = useState(
    new Date().toISOString().split("T")[0]
  );

  const [dueDate, setDueDate] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() + 30);
    return date.toISOString().split("T")[0];
  });

  const [businessName, setBusinessName] = useState("VR.QC");
  const [businessDetails, setBusinessDetails] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerDetails, setCustomerDetails] = useState("");
  const [tax, setTax] = useState(0);
  const [discount, setDiscount] = useState(0);
  const [notes, setNotes] = useState("Thank you for your business.");

  const [items, setItems] = useState([
    {
      description: "",
      quantity: 1,
      rate: 0
    }
  ]);

  const updateItem = (index, field, value) => {
    setItems((current) =>
      current.map((item, i) =>
        i === index
          ? {
              ...item,
              [field]:
                field === "description" ? value : Number(value) || 0
            }
          : item
      )
    );
  };

  const addItem = () => {
    setItems((current) => [
      ...current,
      {
        description: "",
        quantity: 1,
        rate: 0
      }
    ]);
  };

  const removeItem = (index) => {
    setItems((current) => {
      const updated = current.filter((_, i) => i !== index);

      return updated.length
        ? updated
        : [{ description: "", quantity: 1, rate: 0 }];
    });
  };

  const subtotal = items.reduce(
    (total, item) =>
      total + Number(item.quantity || 0) * Number(item.rate || 0),
    0
  );

  const taxableAmount = Math.max(
    0,
    subtotal - Number(discount || 0)
  );

  const taxAmount =
    taxableAmount * (Number(tax || 0) / 100);

  const total = taxableAmount + taxAmount;

  const money = (amount) =>
    `${currency || "$"}${Number(amount || 0).toFixed(2)}`;

  const formatDate = (value) => {
    if (!value) return "-";

    return new Date(`${value}T00:00:00`).toLocaleDateString(
      undefined,
      {
        month: "short",
        day: "numeric",
        year: "numeric"
      }
    );
  };

  const clearInvoice = () => {
    setInvoiceNumber("VRQC-001");
    setCurrency("$");
    setBusinessName("VR.QC");
    setBusinessDetails("");
    setCustomerName("");
    setCustomerDetails("");
    setTax(0);
    setDiscount(0);
    setNotes("Thank you for your business.");

    const today = new Date();
    const due = new Date();

    due.setDate(today.getDate() + 30);

    setIssueDate(today.toISOString().split("T")[0]);
    setDueDate(due.toISOString().split("T")[0]);

    setItems([
      {
        description: "",
        quantity: 1,
        rate: 0
      }
    ]);
  };

  return (
    <>
      <style jsx global>{`
        * {
          box-sizing: border-box;
        }

        html {
          scroll-behavior: smooth;
        }

        body {
          margin: 0;
          background: #09090d;
          color: #ffffff;
          font-family: Arial, Helvetica, sans-serif;
        }

        button,
        input,
        textarea {
          font-family: inherit;
        }

        button {
          cursor: pointer;
        }

        .app {
          min-height: 100vh;
          padding: 40px 20px;
        }

        .topbar {
          max-width: 1200px;
          margin: 0 auto 30px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 20px;
        }

        .brand {
          font-size: 29px;
          font-weight: 900;
          letter-spacing: -1px;
        }

        .brand span {
          color: #8b5cf6;
        }

        .subtitle {
          color: #888894;
          margin-top: 5px;
          font-size: 14px;
        }

        .actions {
          display: flex;
          gap: 10px;
        }

        .button {
          border: 0;
          border-radius: 10px;
          padding: 12px 18px;
          font-weight: 700;
          font-size: 14px;
        }

        .primary {
          background: #8b5cf6;
          color: white;
        }

        .primary:hover {
          background: #7c3aed;
        }

        .secondary {
          background: #18181f;
          color: white;
          border: 1px solid #292933;
        }

        .secondary:hover {
          background: #20202a;
        }

        .workspace {
          max-width: 1200px;
          margin: auto;
          display: grid;
          grid-template-columns: 390px 1fr;
          gap: 25px;
        }

        .panel {
          background: #111116;
          border: 1px solid #25252d;
          border-radius: 16px;
          padding: 22px;
          height: fit-content;
        }

        .panel h2 {
          margin: 0 0 20px;
          font-size: 18px;
        }

        .section {
          margin-bottom: 25px;
        }

        .section-title {
          color: #a78bfa;
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: 1px;
          font-weight: 700;
          margin-bottom: 12px;
        }

        label {
          display: block;
          color: #9999a5;
          font-size: 12px;
          margin-bottom: 6px;
        }

        input,
        textarea {
          width: 100%;
          background: #18181f;
          border: 1px solid #2a2a34;
          color: white;
          border-radius: 9px;
          padding: 11px 12px;
          outline: none;
          margin-bottom: 12px;
        }

        input:focus,
        textarea:focus {
          border-color: #8b5cf6;
        }

        textarea {
          min-height: 75px;
          resize: vertical;
        }

        .two {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
        }

        .item-editor {
          background: #18181f;
          border: 1px solid #292933;
          border-radius: 10px;
          padding: 12px;
          margin-bottom: 10px;
        }

        .item-row {
          display: grid;
          grid-template-columns: 1fr 70px 90px 35px;
          gap: 7px;
          align-items: end;
        }

        .item-row input {
          margin: 0;
          padding: 9px;
        }

        .remove {
          background: #32171d;
          color: #ff7b8a;
          border: 0;
          border-radius: 8px;
          width: 35px;
          height: 36px;
          font-size: 20px;
        }

        .add-item {
          width: 100%;
        }

        .preview-wrap {
          background: #16161d;
          border-radius: 16px;
          padding: 25px;
          overflow: auto;
        }

        .invoice {
          background: white;
          color: #17171c;
          width: 100%;
          max-width: 800px;
          min-height: 1050px;
          margin: auto;
          padding: 55px;
          box-shadow: 0 15px 50px rgba(0, 0, 0, 0.35);
        }

        .invoice-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          border-bottom: 2px solid #eee;
          padding-bottom: 28px;
          margin-bottom: 30px;
        }

        .invoice-logo {
          font-size: 30px;
          font-weight: 900;
          letter-spacing: -1px;
        }

        .invoice-logo span {
          color: #7c3aed;
        }

        .invoice-label {
          text-align: right;
        }

        .invoice-label h1 {
          margin: 0;
          font-size: 35px;
          letter-spacing: -1px;
        }

        .invoice-number {
          margin-top: 7px;
          color: #777;
          font-size: 13px;
        }

        .info-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 50px;
          margin-bottom: 30px;
        }

        .info-title {
          color: #888;
          text-transform: uppercase;
          font-size: 10px;
          font-weight: bold;
          letter-spacing: 1px;
          margin-bottom: 8px;
        }

        .info-name {
          font-weight: bold;
          font-size: 15px;
          white-space: pre-line;
        }

        .info-text {
          color: #555;
          font-size: 13px;
          line-height: 1.6;
          white-space: pre-line;
        }

        .dates {
          text-align: right;
          font-size: 13px;
          line-height: 1.8;
          margin-bottom: 25px;
        }

        .dates strong {
          display: inline-block;
          width: 90px;
        }

        table {
          width: 100%;
          border-collapse: collapse;
        }

        th {
          background: #f5f5f7;
          padding: 12px;
          text-align: left;
          font-size: 11px;
          text-transform: uppercase;
          color: #666;
        }

        td {
          padding: 15px 12px;
          border-bottom: 1px solid #eee;
          font-size: 13px;
        }

        th:nth-child(n + 2),
        td:nth-child(n + 2) {
          text-align: right;
        }

        .totals {
          width: 280px;
          margin-left: auto;
          margin-top: 25px;
        }

        .total-line {
          display: flex;
          justify-content: space-between;
          padding: 7px 0;
          font-size: 13px;
        }

        .grand-total {
          border-top: 2px solid #17171c;
          margin-top: 8px;
          padding-top: 13px;
          font-size: 18px;
          font-weight: bold;
        }

        .notes {
          margin-top: 55px;
          padding-top: 20px;
          border-top: 1px solid #eee;
        }

        .notes-title {
          font-size: 11px;
          font-weight: bold;
          text-transform: uppercase;
          color: #777;
          margin-bottom: 8px;
        }

        .notes-text {
          white-space: pre-line;
          color: #555;
          font-size: 12px;
          line-height: 1.6;
        }

        @media (max-width: 950px) {
          .workspace {
            grid-template-columns: 1fr;
          }

          .invoice {
            min-width: 700px;
          }
        }

        @media (max-width: 600px) {
          .app {
            padding: 20px 12px;
          }

          .topbar {
            flex-direction: column;
            align-items: flex-start;
          }

          .actions {
            width: 100%;
          }

          .actions button {
            flex: 1;
          }

          .two {
            grid-template-columns: 1fr;
          }

          .item-row {
            grid-template-columns: 1fr 70px 90px 35px;
          }
        }

        @media print {
          body {
            background: white;
          }

          .topbar,
          .panel {
            display: none !important;
          }

          .app {
            padding: 0;
          }

          .workspace {
            display: block;
          }

          .preview-wrap {
            padding: 0;
            background: white;
          }

          .invoice {
            box-shadow: none;
            max-width: none;
            width: 100%;
            min-height: auto;
            margin: 0;
            padding: 45px;
          }
        }
      `}</style>

      <main className="app">

        <div className="topbar">
          <div>
            <div className="brand">
              VR<span>.QC</span>
            </div>

            <div className="subtitle">
              Professional Invoice Generator
            </div>
          </div>

          <div className="actions">
            <button
              className="button secondary"
              onClick={clearInvoice}
            >
              Clear
            </button>

            <button
              className="button primary"
              onClick={() => window.print()}
            >
              Print / Save PDF
            </button>
          </div>
        </div>

        <div className="workspace">

          <section className="panel">

            <h2>Create Invoice</h2>

            <div className="section">
              <div className="section-title">
                Invoice Details
              </div>

              <div className="two">
                <div>
                  <label>Invoice Number</label>

                  <input
                    value={invoiceNumber}
                    onChange={(e) =>
                      setInvoiceNumber(e.target.value)
                    }
                  />
                </div>

                <div>
                  <label>Currency</label>

                  <input
                    value={currency}
                    onChange={(e) =>
                      setCurrency(e.target.value)
                    }
                  />
                </div>
              </div>

              <div className="two">
                <div>
                  <label>Issue Date</label>

                  <input
                    type="date"
                    value={issueDate}
                    onChange={(e) =>
                      setIssueDate(e.target.value)
                    }
                  />
                </div>

                <div>
                  <label>Due Date</label>

                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) =>
                      setDueDate(e.target.value)
                    }
                  />
                </div>
              </div>
            </div>

            <div className="section">
              <div className="section-title">
                Your Business
              </div>

              <label>Business Name</label>

              <input
                value={businessName}
                onChange={(e) =>
                  setBusinessName(e.target.value)
                }
              />

              <label>Business Details</label>

              <textarea
                value={businessDetails}
                onChange={(e) =>
                  setBusinessDetails(e.target.value)
                }
                placeholder={"Address\nEmail\nPhone"}
              />
            </div>

            <div className="section">
              <div className="section-title">
                Bill To
              </div>

              <label>Customer Name</label>

              <input
                value={customerName}
                onChange={(e) =>
                  setCustomerName(e.target.value)
                }
                placeholder="Customer or Company"
              />

              <label>Customer Details</label>

              <textarea
                value={customerDetails}
                onChange={(e) =>
                  setCustomerDetails(e.target.value)
                }
                placeholder={"Address\nEmail\nPhone"}
              />
            </div>

            <div className="section">
              <div className="section-title">
                Items
              </div>

              {items.map((item, index) => (
                <div
                  className="item-editor"
                  key={index}
                >
                  <div className="item-row">

                    <div>
                      <label>Description</label>

                      <input
                        value={item.description}
                        onChange={(e) =>
                          updateItem(
                            index,
                            "description",
                            e.target.value
                          )
                        }
                        placeholder="Service or product"
                      />
                    </div>

                    <div>
                      <label>Qty</label>

                      <input
                        type="number"
                        min="0"
                        value={item.quantity}
                        onChange={(e) =>
                          updateItem(
                            index,
                            "quantity",
                            e.target.value
                          )
                        }
                      />
                    </div>

                    <div>
                      <label>Rate</label>

                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.rate}
                        onChange={(e) =>
                          updateItem(
                            index,
                            "rate",
                            e.target.value
                          )
                        }
                      />
                    </div>

                    <div>
                      <label>&nbsp;</label>

                      <button
                        className="remove"
                        onClick={() =>
                          removeItem(index)
                        }
                      >
                        ×
                      </button>
                    </div>

                  </div>
                </div>
              ))}

              <button
                className="button secondary add-item"
                onClick={addItem}
              >
                + Add Item
              </button>
            </div>

            <div className="section">
              <div className="section-title">
                Totals
              </div>

              <label>Tax (%)</label>

              <input
                type="number"
                min="0"
                step="0.01"
                value={tax}
                onChange={(e) =>
                  setTax(Number(e.target.value) || 0)
                }
              />

              <label>Discount</label>

              <input
                type="number"
                min="0"
                step="0.01"
                value={discount}
                onChange={(e) =>
                  setDiscount(Number(e.target.value) || 0)
                }
              />
            </div>

            <div className="section">
              <div className="section-title">
                Notes
              </div>

              <textarea
                value={notes}
                onChange={(e) =>
                  setNotes(e.target.value)
                }
              />
            </div>

          </section>

          <section className="preview-wrap">

            <div className="invoice">

              <div className="invoice-header">

                <div className="invoice-logo">
                  VR<span>.QC</span>
                </div>

                <div className="invoice-label">
                  <h1>INVOICE</h1>

                  <div className="invoice-number">
                    #{invoiceNumber || "VRQC-001"}
                  </div>
                </div>

              </div>

              <div className="info-grid">

                <div>
                  <div className="info-title">
                    From
                  </div>

                  <div className="info-name">
                    {businessName || "VR.QC"}
                  </div>

                  <div className="info-text">
                    {businessDetails}
                  </div>
                </div>

                <div>
                  <div className="info-title">
                    Bill To
                  </div>

                  <div className="info-name">
                    {customerName || "Customer Name"}
                  </div>

                  <div className="info-text">
                    {customerDetails}
                  </div>
                </div>

              </div>

              <div className="dates">

                <div>
                  <strong>Issued:</strong>
                  {formatDate(issueDate)}
                </div>

                <div>
                  <strong>Due:</strong>
                  {formatDate(dueDate)}
                </div>

              </div>

              <table>
                <thead>
                  <tr>
                    <th>Description</th>
                    <th>Qty</th>
                    <th>Rate</th>
                    <th>Amount</th>
                  </tr>
                </thead>

                <tbody>
                  {items.map((item, index) => {
                    const amount =
                      Number(item.quantity || 0) *
                      Number(item.rate || 0);

                    return (
                      <tr key={index}>
                        <td>
                          {item.description || "Item"}
                        </td>

                        <td>
                          {item.quantity || 0}
                        </td>

                        <td>
                          {money(item.rate)}
                        </td>

                        <td>
                          {money(amount)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              <div className="totals">

                <div className="total-line">
                  <span>Subtotal</span>
                  <span>{money(subtotal)}</span>
                </div>

                <div className="total-line">
                  <span>Discount</span>
                  <span>{money(discount)}</span>
                </div>

                <div className="total-line">
                  <span>Tax</span>
                  <span>{money(taxAmount)}</span>
                </div>

                <div className="total-line grand-total">
                  <span>Total</span>
                  <span>{money(total)}</span>
                </div>

              </div>

              <div className="notes">

                <div className="notes-title">
                  Notes
                </div>

                <div className="notes-text">
                  {notes}
                </div>

              </div>

            </div>

          </section>

        </div>

      </main>
    </>
  );
}
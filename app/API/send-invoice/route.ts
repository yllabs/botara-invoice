import { Resend } from "resend";

export async function POST(request) {
  try {
    const invoice = await request.json();

    if (!invoice.customerEmail || !invoice.customerName || !invoice.invoiceNumber) {
      return Response.json(
        { error: "Customer email, customer name, and invoice number are required." },
        { status: 400 }
      );
    }

    if (!process.env.RESEND_API_KEY) {
      return Response.json(
        { error: "Missing RESEND_API_KEY. Add it to .env.local." },
        { status: 500 }
      );
    }

    const resend = new Resend(process.env.RESEND_API_KEY);
    const from = process.env.RESEND_FROM_EMAIL;

    if (!from) {
      return Response.json(
        { error: "Missing RESEND_FROM_EMAIL. Add a verified sender to .env.local." },
        { status: 500 }
      );
    }

    const total = Number(invoice.total || 0).toFixed(2);

    const { data, error } = await resend.emails.send({
      from,
      to: [invoice.customerEmail],
      subject: `Rankora Invoice #${invoice.invoiceNumber}`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:640px;margin:auto;color:#0c1024;">
          <h1 style="margin-bottom:4px;">Rankora</h1>
          <p style="margin-top:0;color:#666;">Invoice #${escapeHtml(invoice.invoiceNumber)}</p>
          <hr style="border:0;border-top:2px solid #0c1024;margin:24px 0;" />
          <p>Hello ${escapeHtml(invoice.customerName)},</p>
          <p>Your Rankora invoice is ready.</p>
          <table style="width:100%;border-collapse:collapse;">
            <tr>
              <td style="padding:10px;border-bottom:1px solid #ddd;"><strong>Product / Service</strong></td>
              <td style="padding:10px;border-bottom:1px solid #ddd;text-align:right;">${escapeHtml(invoice.product || "")}</td>
            </tr>
            <tr>
              <td style="padding:10px;border-bottom:1px solid #ddd;"><strong>Invoice Number</strong></td>
              <td style="padding:10px;border-bottom:1px solid #ddd;text-align:right;">${escapeHtml(invoice.invoiceNumber)}</td>
            </tr>
            <tr>
              <td style="padding:10px;border-bottom:1px solid #ddd;"><strong>Due Date</strong></td>
              <td style="padding:10px;border-bottom:1px solid #ddd;text-align:right;">${escapeHtml(invoice.dueDate || "")}</td>
            </tr>
            <tr>
              <td style="padding:10px;"><strong>Amount Due</strong></td>
              <td style="padding:10px;text-align:right;"><strong>$${total}</strong></td>
            </tr>
          </table>
          ${invoice.notes ? `<p style="margin-top:24px;"><strong>Notes:</strong><br/>${escapeHtml(invoice.notes)}</p>` : ""}
          <p style="margin-top:28px;">Questions? Call or text Rankora at 386-868-9183.</p>
        </div>
      `
    });

    if (error) {
      return Response.json({ error: error.message || "Resend could not send the email." }, { status: 500 });
    }

    return Response.json({ success: true, id: data?.id });
  } catch (error) {
    return Response.json(
      { error: error.message || "Server error while sending invoice." },
      { status: 500 }
    );
  }
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

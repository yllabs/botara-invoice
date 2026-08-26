import fs from "fs";
import path from "path";

function b64url(x) {
  const b = Buffer.isBuffer(x) ? x : Buffer.from(x);
  return b.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/,"");
}
function pdfText(s) {
  return String(s ?? "").replace(/\\/g,"\\\\").replace(/\(/g,"\\(").replace(/\)/g,"\\)");
}
function money(n) { return "$" + Number(n || 0).toFixed(2); }
function wrap(text, max) {
  const words = String(text || "").trim().split(/\s+/).filter(Boolean);
  const lines = [];
  let line = "";
  for (const word of words) {
    const next = line ? line + " " + word : word;
    if (next.length > max && line) { lines.push(line); line = word; }
    else line = next;
  }
  if (line) lines.push(line);
  return lines.length ? lines : [""];
}
function jpegInfo(buf) {
  let i = 2;
  while (i < buf.length) {
    if (buf[i] !== 0xFF) { i++; continue; }
    while (buf[i] === 0xFF) i++;
    const marker = buf[i++];
    if (marker === 0xD8 || marker === 0xD9) continue;
    const len = buf.readUInt16BE(i);
    if ([0xC0,0xC1,0xC2,0xC3,0xC5,0xC6,0xC7,0xC9,0xCA,0xCB,0xCD,0xCE,0xCF].includes(marker)) {
      return {
        height: buf.readUInt16BE(i + 3),
        width: buf.readUInt16BE(i + 5),
        components: buf[i + 7]
      };
    }
    i += len;
  }
  throw new Error("Could not read Rankora logo image.");
}
function makePdf(i) {
  const logoPath = path.join(process.cwd(), "public", "rankora-logo.jpeg");
  const logo = fs.readFileSync(logoPath);
  const img = jpegInfo(logo);
  const colorSpace = img.components === 1 ? "/DeviceGray" : "/DeviceRGB";

  const dark = "0.04 0.08 0.14";
  const ink = "0.07 0.09 0.13";
  const gray = "0.75 0.77 0.80";

  const T = (x,y,size,s,bold=false) =>
    `BT /${bold ? "F2" : "F1"} ${size} Tf 1 0 0 1 ${x} ${y} Tm (${pdfText(s)}) Tj ET\n`;

  let c = "q\n1 1 1 rg 0 0 612 792 re f\n";

  // ===== HEADER =====
  c += "q 1 0 0 1 42 680 cm 92 0 0 92 0 0 cm /Im1 Do Q\n";
  c += `${ink} rg\n`;
  c += T(150,742,27,"RANKORA",true);
  c += T(151,719,10,"I N V O I C E",false);
  c += `${gray} RG 0.8 w 320 690 m 320 762 l S\n`;
  c += T(372,742,29,"INVOICE",true);
  c += T(373,718,10,"INVOICE #:",true) + T(470,718,10,i.invoiceNumber || "—");
  c += T(373,696,10,"DUE DATE:",true) + T(470,696,10,i.dueDate || "Not selected");
  c += `${gray} RG 0.8 w 42 668 m 570 668 l S\n`;

  // ===== BILL TO / FROM =====
  c += `${ink} rg\n`;
  c += T(42,635,12,"BILLED TO",true);
  c += T(42,603,13,i.customerName || "Customer Name",true);
  let y = 581;
  for (const line of [...wrap(i.customerAddress,38), ...wrap(i.customerEmail,38), ...wrap(i.customerPhone,38)]) {
    c += T(42,y,10,line); y -= 16;
  }

  c += T(330,635,12,"FROM",true);
  c += T(330,603,13,"Rankora",true);
  c += T(330,581,10,"386-868-9183");
  c += T(330,565,10,"rankorainvoices@gmail.com");

  // ===== TABLE =====
  const top = 515;
  c += `${dark} rg 42 ${top} 528 30 re f\n1 1 1 rg\n`;
  c += T(56,526,10,"DESCRIPTION",true);
  c += T(305,526,10,"QTY",true);
  c += T(390,526,10,"UNIT PRICE",true);
  c += T(495,526,10,"TOTAL",true);

  const productLines = wrap(i.product || "Product / Service", 38);
  const rowHeight = Math.max(48, 30 + productLines.length * 15);
  const rowBottom = top - rowHeight;
  c += `1 1 1 rg 42 ${rowBottom} 528 ${rowHeight} re f\n`;
  c += `${gray} RG 0.7 w 42 ${rowBottom} m 570 ${rowBottom} l S\n`;
  c += `${ink} rg\n`;
  let py = top - 24;
  for (const line of productLines) { c += T(56,py,11,line); py -= 15; }
  c += T(315,top-24,11,String(i.quantity || 1));
  c += T(390,top-24,11,money(i.unitPrice));
  c += T(495,top-24,11,money(i.total));

  // ===== NOTES =====
  const notesTop = rowBottom - 46;
  c += T(42,notesTop,11,"NOTES",true);
  c += `${ink} RG 1 w 42 ${notesTop-10} m 75 ${notesTop-10} l S\n`;
  let ny = notesTop - 34;
  const noteLines = wrap(i.notes || "Thank you for your business! If you have any questions, please don't hesitate to contact us.", 44);
  for (const line of noteLines.slice(0,4)) { c += T(42,ny,10,line); ny -= 15; }
  c += T(42,ny-20,18,"Thank You!",false);

  // ===== TOTALS =====
  const totalX = 330;
  const totalTop = rowBottom - 44;
  c += T(totalX,totalTop,11,"SUBTOTAL",true);
  c += T(500,totalTop,11,money(i.total));
  c += T(totalX,totalTop-28,11,"TAX (0%)",true);
  c += T(500,totalTop-28,11,"$0.00");
  c += T(totalX,totalTop-56,11,"DISCOUNT",true);
  c += T(500,totalTop-56,11,"-$0.00");
  c += `${gray} RG 0.8 w ${totalX} ${totalTop-70} m 570 ${totalTop-70} l S\n`;
  c += `${dark} rg ${totalX} ${totalTop-112} 240 36 re f\n1 1 1 rg\n`;
  c += T(totalX+12,totalTop-89,12,"AMOUNT DUE",true);
  c += T(485,totalTop-89,14,money(i.total),true);

  // ===== FOOTER =====
  c += `${dark} rg 0 0 612 86 re f\n`;
  c += "q 1 0 0 1 30 18 cm 45 0 0 45 0 0 cm /Im1 Do Q\n";
  c += "1 1 1 rg\n";
  c += T(95,52,12,"RANKORA",true);
  c += T(95,34,8,"386-868-9183  •  rankorainvoices@gmail.com");
  c += T(385,40,11,"We appreciate your business!",false);
  c += "Q\n";

  const stream = Buffer.from(c, "utf8");
  const objects = [
    Buffer.from("<< /Type /Catalog /Pages 2 0 R >>"),
    Buffer.from("<< /Type /Pages /Kids [3 0 R] /Count 1 >>"),
    Buffer.from("<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> /XObject << /Im1 6 0 R >> >> /Contents 7 0 R >>"),
    Buffer.from("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>"),
    Buffer.from("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>"),
    Buffer.concat([Buffer.from(`<< /Type /XObject /Subtype /Image /Width ${img.width} /Height ${img.height} /ColorSpace ${colorSpace} /BitsPerComponent 8 /Filter /DCTDecode /Length ${logo.length} >>\nstream\n`), logo, Buffer.from("\nendstream")]),
    Buffer.concat([Buffer.from(`<< /Length ${stream.length} >>\nstream\n`), stream, Buffer.from("endstream")])
  ];

  let out = Buffer.from("%PDF-1.4\n", "utf8");
  const offsets = [0];
  objects.forEach((obj, idx) => {
    offsets.push(out.length);
    out = Buffer.concat([out, Buffer.from(`${idx+1} 0 obj\n`), obj, Buffer.from("\nendobj\n")]);
  });
  const xref = out.length;
  let x = `xref\n0 ${objects.length+1}\n0000000000 65535 f \n`;
  for (let n=1;n<offsets.length;n++) x += `${String(offsets[n]).padStart(10,"0")} 00000 n \n`;
  x += `trailer\n<< /Size ${objects.length+1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return Buffer.concat([out, Buffer.from(x)]);
}

export default async function handler(req, res) {
  if (req.method === "GET") return res.status(200).json({ok:true,message:"Rankora coded PDF invoice API is working."});
  if (req.method !== "POST") return res.status(405).json({error:"Method not allowed."});

  const i = req.body || {};
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET || !process.env.GOOGLE_REFRESH_TOKEN) {
    return res.status(500).json({error:"Missing Gmail environment variables in Vercel."});
  }

  try {
    const form = new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
      grant_type: "refresh_token"
    });

    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: {"Content-Type":"application/x-www-form-urlencoded"},
      body: form
    });
    const tokenData = await tokenResponse.json();
    if (!tokenResponse.ok) throw new Error(tokenData.error_description || tokenData.error || "Could not refresh Gmail authorization.");

    const filename = `Rankora-Invoice-${String(i.invoiceNumber || "invoice").replace(/[^a-zA-Z0-9_-]/g,"-")}.pdf`;
    const boundary = "rankora_" + Date.now().toString(36);
    const attachment = makePdf(i).toString("base64");

    const raw = `To: ${i.customerEmail}\r
From: Rankora <rankorainvoices@gmail.com>\r
Subject: Rankora Invoice #${i.invoiceNumber}\r
MIME-Version: 1.0\r
Content-Type: multipart/mixed; boundary="${boundary}"\r
\r
--${boundary}\r
Content-Type: text/plain; charset=UTF-8\r
\r
Hello ${i.customerName || ""}, your Rankora invoice is attached as a PDF.\r
\r
--${boundary}\r
Content-Type: application/pdf; name="${filename}"\r
Content-Disposition: attachment; filename="${filename}"\r
Content-Transfer-Encoding: base64\r
\r
${attachment}\r
--${boundary}--`;

    const sendResponse = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
      method:"POST",
      headers:{
        Authorization:`Bearer ${tokenData.access_token}`,
        "Content-Type":"application/json"
      },
      body:JSON.stringify({raw:b64url(raw)})
    });
    const sendData = await sendResponse.json();
    if (!sendResponse.ok) throw new Error(sendData.error?.message || "Gmail could not send the invoice.");

    return res.status(200).json({success:true,id:sendData.id});
  } catch (error) {
    return res.status(500).json({error:error.message || "Server error."});
  }
}

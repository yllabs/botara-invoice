function esc(x){return String(x??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")}
function b64url(x){const b=Buffer.isBuffer(x)?x:Buffer.from(x);return b.toString("base64").replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"")}
function pdfEscape(s){return String(s).replace(/\\/g,"\\\\").replace(/\(/g,"\\(").replace(/\)/g,"\\)")}
function makePdf(lines){
  let c="BT\n/F1 20 Tf\n50 760 Td\n";
  c+=`(${pdfEscape(lines[0]||"RANKORA INVOICE")}) Tj\n/F1 11 Tf\n0 -35 Td\n`;
  for(let i=1;i<lines.length;i++)c+=`(${pdfEscape(lines[i])}) Tj\n0 -22 Td\n`;
  c+="ET";
  const o=[
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    `<< /Length ${Buffer.byteLength(c)} >>\nstream\n${c}\nendstream`
  ];
  let p="%PDF-1.4\n",off=[0];
  o.forEach((x,i)=>{off.push(Buffer.byteLength(p));p+=`${i+1} 0 obj\n${x}\nendobj\n`});
  const xr=Buffer.byteLength(p);
  p+=`xref\n0 ${o.length+1}\n0000000000 65535 f \n`;
  for(let i=1;i<off.length;i++)p+=String(off[i]).padStart(10,"0")+" 00000 n \n";
  p+=`trailer\n<< /Size ${o.length+1} /Root 1 0 R >>\nstartxref\n${xr}\n%%EOF`;
  return Buffer.from(p);
}
export default async function handler(req,res){
  if(req.method==="GET")return res.status(200).json({ok:true,message:"Rankora Gmail PDF API is working."});
  if(req.method!=="POST")return res.status(405).json({error:"Method not allowed."});
  const i=req.body||{};
  if(!process.env.GOOGLE_CLIENT_ID||!process.env.GOOGLE_CLIENT_SECRET||!process.env.GOOGLE_REFRESH_TOKEN)
    return res.status(500).json({error:"Missing Gmail environment variables in Vercel."});
  try{
    const tb=new URLSearchParams({
      client_id:process.env.GOOGLE_CLIENT_ID,
      client_secret:process.env.GOOGLE_CLIENT_SECRET,
      refresh_token:process.env.GOOGLE_REFRESH_TOKEN,
      grant_type:"refresh_token"
    });
    const tr=await fetch("https://oauth2.googleapis.com/token",{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},body:tb});
    const td=await tr.json();
    if(!tr.ok)throw Error(td.error_description||td.error||"Could not refresh Gmail authorization.");

    const total=Number(i.total||0).toFixed(2);
    const filename=`Rankora-Invoice-${String(i.invoiceNumber||"invoice").replace(/[^a-zA-Z0-9_-]/g,"-")}.pdf`;
    const pdf=makePdf([
      "RANKORA INVOICE","Phone: 386-868-9183","",
      `Invoice Number: ${i.invoiceNumber||""}`,`Due Date: ${i.dueDate||""}`,"",
      "BILL TO",`Customer: ${i.customerName||""}`,`Email: ${i.customerEmail||""}`,
      `Phone: ${i.customerPhone||""}`,`Address: ${i.customerAddress||""}`,"",
      "PRODUCT / SERVICE",`Product: ${i.product||""}`,`Quantity: ${i.quantity||""}`,
      `Unit Price: $${Number(i.unitPrice||0).toFixed(2)}`,`TOTAL DUE: $${total}`,"",
      `Notes: ${i.notes||""}`
    ]);
    const boundary="rankora_"+Date.now().toString(36);
    const raw=`To: ${i.customerEmail}\r
From: Rankora <rankorainvoices@gmail.com>\r
Subject: Rankora Invoice #${i.invoiceNumber}\r
MIME-Version: 1.0\r
Content-Type: multipart/mixed; boundary="${boundary}"\r
\r
--${boundary}\r
Content-Type: text/html; charset=UTF-8\r
\r
Hello ${esc(i.customerName)},<br><br>Your Rankora invoice is attached as a PDF.<br><br>Questions? Call or text Rankora at 386-868-9183.\r
--${boundary}\r
Content-Type: application/pdf; name="${filename}"\r
Content-Disposition: attachment; filename="${filename}"\r
Content-Transfer-Encoding: base64\r
\r
${pdf.toString("base64")}\r
--${boundary}--`;
    const sr=await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send",{
      method:"POST",
      headers:{Authorization:`Bearer ${td.access_token}`,"Content-Type":"application/json"},
      body:JSON.stringify({raw:b64url(raw)})
    });
    const sd=await sr.json();
    if(!sr.ok)throw Error(sd.error?.message||"Gmail could not send the invoice.");
    return res.status(200).json({success:true,id:sd.id});
  }catch(e){return res.status(500).json({error:e.message||"Server error."})}
}

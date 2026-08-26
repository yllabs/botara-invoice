function esc(x) {
  return String(x ?? "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
}
function b64url(s) {
  return Buffer.from(s).toString("base64").replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");
}
export default async function handler(req, res) {
  if (req.method === "GET") return res.status(200).json({ok:true,message:"Rankora Gmail API is working. Use POST to send an invoice."});
  if (req.method !== "POST") return res.status(405).json({error:"Method not allowed."});

  const i=req.body||{};
  if(!process.env.GOOGLE_CLIENT_ID||!process.env.GOOGLE_CLIENT_SECRET||!process.env.GOOGLE_REFRESH_TOKEN)
    return res.status(500).json({error:"Missing Gmail environment variables in Vercel."});

  try {
    const tokenBody=new URLSearchParams({
      client_id:process.env.GOOGLE_CLIENT_ID,
      client_secret:process.env.GOOGLE_CLIENT_SECRET,
      refresh_token:process.env.GOOGLE_REFRESH_TOKEN,
      grant_type:"refresh_token"
    });
    const tr=await fetch("https://oauth2.googleapis.com/token",{
      method:"POST",
      headers:{"Content-Type":"application/x-www-form-urlencoded"},
      body:tokenBody
    });
    const td=await tr.json();
    if(!tr.ok) throw new Error(td.error_description||td.error||"Could not refresh Gmail authorization.");

    const total=Number(i.total||0).toFixed(2);
    const html=`<div style="font-family:Arial,sans-serif;max-width:650px"><h1>Rankora</h1><p>Hello ${esc(i.customerName)},</p><p>Your Rankora invoice is ready.</p><table><tr><td><b>Invoice</b></td><td>${esc(i.invoiceNumber)}</td></tr><tr><td><b>Product</b></td><td>${esc(i.product)}</td></tr><tr><td><b>Due Date</b></td><td>${esc(i.dueDate)}</td></tr><tr><td><b>Amount Due</b></td><td>$${total}</td></tr></table>${i.notes?`<p><b>Notes:</b> ${esc(i.notes)}</p>`:""}<p>Questions? Call or text Rankora at 386-868-9183.</p></div>`;
    const raw=`To: ${i.customerEmail}\r\nFrom: Rankora <rankorainvoices@gmail.com>\r\nSubject: Rankora Invoice #${i.invoiceNumber}\r\nMIME-Version: 1.0\r\nContent-Type: text/html; charset=UTF-8\r\n\r\n${html}`;

    const sr=await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send",{
      method:"POST",
      headers:{Authorization:`Bearer ${td.access_token}`,"Content-Type":"application/json"},
      body:JSON.stringify({raw:b64url(raw)})
    });
    const sd=await sr.json();
    if(!sr.ok) throw new Error(sd.error?.message||"Gmail could not send the invoice.");
    return res.status(200).json({success:true,id:sd.id});
  } catch(e) {
    return res.status(500).json({error:e.message||"Server error."});
  }
}
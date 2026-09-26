const { github } = require("./github");

module.exports=async function handler(req,res){
if(req.method!=="GET"){
return res.status(405).end();
}

try{
const requested=String(req.query.path||"");

if(!requested){
return res.status(400).end("Missing media path.");
}

if(
requested.includes("..")||
requested.startsWith("/")||
!requested.startsWith("media/")
){
return res.status(400).end("Invalid media path.");
}

const response=await github(`contents/${requested}`);

if(!response.ok){
return res.status(response.status).end();
}

const file=await response.json();

if(!file.content){
return res.status(404).end();
}

const buffer=Buffer.from(
file.content.replace(/\n/g,""),
"base64"
);

const extension=requested.split(".").pop().toLowerCase();

const types={
png:"image/png",
jpg:"image/jpeg",
jpeg:"image/jpeg",
webp:"image/webp",
gif:"image/gif",
mp3:"audio/mpeg",
wav:"audio/wav",
ogg:"audio/ogg"
};

res.setHeader(
"Content-Type",
types[extension]||"application/octet-stream"
);

res.setHeader(
"Cache-Control",
"public, max-age=3600, s-maxage=3600"
);

return res.status(200).send(buffer);

}catch(error){
console.error("MEDIA ERROR:",error);
return res.status(500).end();
}
};

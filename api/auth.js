const crypto=require("crypto");
const {getFile,saveFile}=require("../github");

const COOKIE="biofyit_session";
const SESSION_SECRET=process.env.GITHUB_TOKEN||"biofyit-session-secret";

function hashPassword(password){
const salt=crypto.randomBytes(16).toString("hex");
const hash=crypto.scryptSync(password,salt,64).toString("hex");
return `${salt}:${hash}`;
}

function checkPassword(password,stored){
if(!stored||!stored.includes(":"))return false;
const [salt,hash]=stored.split(":");
const check=crypto.scryptSync(password,salt,64).toString("hex");
if(check.length!==hash.length)return false;
return crypto.timingSafeEqual(Buffer.from(check),Buffer.from(hash));
}

function sign(value){
return crypto.createHmac("sha256",SESSION_SECRET).update(value).digest("hex");
}

function makeSession(username){
const payload=Buffer.from(JSON.stringify({
username,
createdAt:Date.now()
})).toString("base64url");
return `${payload}.${sign(payload)}`;
}

function readSession(req){
const cookie=req.headers.cookie||"";
const match=cookie.match(new RegExp(`${COOKIE}=([^;]+)`));
if(!match)return null;

const value=match[1];
const parts=value.split(".");
if(parts.length!==2)return null;

const [payload,signature]=parts;
const expected=sign(payload);

if(signature.length!==expected.length)return null;

try{
if(!crypto.timingSafeEqual(Buffer.from(signature),Buffer.from(expected)))return null;

const data=JSON.parse(Buffer.from(payload,"base64url").toString("utf8"));

if(!data.username)return null;
if(Date.now()-Number(data.createdAt)>2592000000)return null;

return data.username;
}catch{
return null;
}
}

function setCookie(res,username){
const session=makeSession(username);

res.setHeader(
"Set-Cookie",
`${COOKIE}=${session}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=2592000`
);
}

function clearCookie(res){
res.setHeader(
"Set-Cookie",
`${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`
);
}

async function users(){
const file=await getFile("users.json");
return {
users:file?.content||[],
sha:file?.sha||null
};
}

module.exports=async function(req,res){
const action=String(req.query.action||"").toLowerCase();

try{
if(action==="register"){
if(req.method!=="POST"){
return res.status(405).json({success:false,error:"Method not allowed."});
}

const body=req.body||{};
const email=String(body.email||"").trim().toLowerCase();
const username=String(body.username||"").trim().toLowerCase();
const password=String(body.password||"");

if(!email||!username||!password){
return res.status(400).json({success:false,error:"All fields are required."});
}

if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){
return res.status(400).json({success:false,error:"Enter a valid email address."});
}

if(!/^[a-z0-9_]{3,32}$/.test(username)){
return res.status(400).json({
success:false,
error:"Username must be 3 to 32 characters and use only letters, numbers, and underscores."
});
}

if(password.length<8){
return res.status(400).json({
success:false,
error:"Password must be at least 8 characters."
});
}

const data=await users();

if(data.users.some(u=>u.email===email)){
return res.status(409).json({
success:false,
error:"That email is already registered."
});
}

if(data.users.some(u=>u.username===username)){
return res.status(409).json({
success:false,
error:"That username is already taken."
});
}

const user={
id:`user_${Date.now()}_${crypto.randomBytes(5).toString("hex")}`,
email,
username,
passwordHash:hashPassword(password),
createdAt:new Date().toISOString()
};

data.users.push(user);

await saveFile(
"users.json",
data.users,
data.sha,
`Create Biofyit user ${username}`
);

await saveFile(
`profiles/${username}.json`,
{
username,
displayName:username,
bio:"",
profilePicture:"",
background:"",
music:"",
lanyard:{
enabled:false,
id:null
},
links:[]
},
null,
`Create Biofyit profile ${username}`
);

setCookie(res,username);

return res.status(200).json({
success:true,
user:{
id:user.id,
email:user.email,
username:user.username
}
});
}

if(action==="login"){
if(req.method!=="POST"){
return res.status(405).json({success:false,error:"Method not allowed."});
}

const body=req.body||{};
const identifier=String(body.email||body.username||"").trim().toLowerCase();
const password=String(body.password||"");

if(!identifier||!password){
return res.status(400).json({
success:false,
error:"Enter your login details."
});
}

const data=await users();

const user=data.users.find(
u=>u.email===identifier||u.username===identifier
);

if(!user||!checkPassword(password,user.passwordHash)){
return res.status(401).json({
success:false,
error:"Incorrect username/email or password."
});
}

setCookie(res,user.username);

return res.status(200).json({
success:true,
user:{
id:user.id,
email:user.email,
username:user.username
}
});
}

if(action==="session"){
if(req.method!=="GET"){
return res.status(405).json({success:false,error:"Method not allowed."});
}

const username=readSession(req);

if(!username){
return res.status(401).json({
success:false,
error:"Not signed in."
});
}

const data=await users();

const user=data.users.find(u=>u.username===username);

if(!user){
clearCookie(res);

return res.status(401).json({
success:false,
error:"Account not found."
});
}

return res.status(200).json({
success:true,
user:{
id:user.id,
email:user.email,
username:user.username
}
});
}

if(action==="logout"){
clearCookie(res);

return res.status(200).json({
success:true
});
}

if(action==="username"){
const username=String(req.query.username||"").trim().toLowerCase();

if(!/^[a-z0-9_]{3,32}$/.test(username)){
return res.status(200).json({
success:true,
available:false
});
}

const data=await users();

return res.status(200).json({
success:true,
available:!data.users.some(u=>u.username===username)
});
}

return res.status(400).json({
success:false,
error:"Invalid authentication action."
});

}catch(error){
console.error("BIOFYIT AUTH ERROR:",error);

return res.status(500).json({
success:false,
error:"Authentication service error."
});
}
};

import { createHmac, createHash, randomUUID } from "node:crypto";
import { Router } from "express";
import { getAuth } from "@clerk/express";

const router = Router();
const BUCKET = "bazunk-test-product-videos";
const ENDPOINT = "https://br-square-star-bd7uovwy.storage.c-8.us-east-2.aws.neon.tech";
const REGION = "us-east-2";
const MAX_SIZE = 100 * 1024 * 1024;
const types: Record<string, string> = { "video/mp4": "mp4", "video/quicktime": "mov", "video/x-msvideo": "avi", "video/webm": "webm" };
const hash = (s: string) => createHash("sha256").update(s).digest("hex");
const hmac = (key: Buffer | string, s: string) => createHmac("sha256", key).update(s).digest();
function signedUrl(method: "PUT" | "GET" | "HEAD", key: string, contentType?: string) {
  const access = process.env.NEON_STORAGE_ACCESS_KEY_ID;
  const secret = process.env.NEON_STORAGE_SECRET_ACCESS_KEY;
  if (!access || !secret) throw Error("Video storage credentials are not configured.");
  const now = new Date();
  const timestamp = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
  const day = timestamp.slice(0, 8);
  const scope = `${day}/${REGION}/s3/aws4_request`;
  const endpoint = new URL(ENDPOINT);
  const path = `/${BUCKET}/${key.split("/").map(encodeURIComponent).join("/")}`;
  const query = new URLSearchParams({
    "X-Amz-Algorithm": "AWS4-HMAC-SHA256",
    "X-Amz-Credential": `${access}/${scope}`,
    "X-Amz-Date": timestamp,
    "X-Amz-Expires": "600",
    "X-Amz-SignedHeaders": contentType ? "content-type;host" : "host",
  });
  const canonicalQuery = [...query.entries()].map(([k,v]) => [encodeURIComponent(k),encodeURIComponent(v)] as const)
    .sort((a,b)=>a[0].localeCompare(b[0])).map(([k,v])=>`${k}=${v}`).join("&");
  const headers = contentType ? `content-type:${contentType}\nhost:${endpoint.host}\n` : `host:${endpoint.host}\n`;
  const canonical = [method,path,canonicalQuery,headers,contentType?"content-type;host":"host","UNSIGNED-PAYLOAD"].join("\n");
  const stringToSign = ["AWS4-HMAC-SHA256",timestamp,scope,hash(canonical)].join("\n");
  const signing = hmac(hmac(hmac(hmac("AWS4"+secret,day),REGION),"s3"),"aws4_request");
  const signature = createHmac("sha256",signing).update(stringToSign).digest("hex");
  return { url: `${endpoint.origin}${path}?${canonicalQuery}&X-Amz-Signature=${signature}`, headers: contentType ? {"Content-Type":contentType} : {} };
}
export function playbackVideoUrl(key: string): string | null {
  if (!/^test-videos\/[a-zA-Z0-9_-]+\/[0-9a-f-]{36}\.(mp4|mov|avi|webm)$/.test(key)) return null;
  return signedUrl("GET", key).url;
}
function owner(req: Parameters<typeof getAuth>[0]) {
  const auth = getAuth(req);
  return auth.isAuthenticated ? auth.userId : null;
}
export function ownsKey(userId: string, key: unknown): key is string {
  return typeof key === "string" && key.startsWith(`test-videos/${userId}/`) &&
    /^test-videos\/[a-zA-Z0-9_-]+\/[0-9a-f-]{36}\.(mp4|mov|avi|webm)$/.test(key);
}
async function checkStoredVideo(key: string): Promise<{ok:boolean;size:number;status:number}> {
  // Neon object storage supports signed GET; a signed HEAD may be rejected even
  // after a successful PUT. Request one byte and cancel the body immediately.
  const response = await fetch(signedUrl("GET", key).url, {headers: {Range:"bytes=0-0"}});
  const contentRange = response.headers.get("content-range");
  const rangeSize = contentRange?.match(/\/(\d+)$/)?.[1];
  const size = rangeSize ? Number(rangeSize) : Number(response.headers.get("content-length") || 0);
  await response.body?.cancel();
  return {ok:response.ok && size>0 && size<=MAX_SIZE, size, status:response.status};
}
export async function verifyVideo(userId: string, key: unknown): Promise<boolean> {
  if (!ownsKey(userId, key)) return false;
  return (await checkStoredVideo(key)).ok;
}
router.post("/product-videos/presign", (req,res) => {
  try {
    if (process.env.BAZUNK_CAPROVER_TEST !== "true") {res.status(404).end();return;}
    const userId=owner(req); if(!userId){res.status(401).json({error:"Sign in to upload a video."});return;}
    const {contentType,size}=req.body as {contentType?:string;size?:number};
    if(!contentType || !types[contentType] || !Number.isSafeInteger(size) || !size || size>MAX_SIZE) {
      res.status(400).json({error:"Choose an MP4, MOV, AVI or WebM file up to 100 MB."});return;
    }
    const objectKey=`test-videos/${userId}/${randomUUID()}.${types[contentType]}`;
    const signed=signedUrl("PUT",objectKey,contentType);
    res.json({uploadUrl:signed.url,headers:signed.headers,objectKey});
  } catch(err) {console.error("Video presign failed",err);res.status(503).json({error:"Video storage is not configured yet."});}
});
router.post("/product-videos/confirm",async(req,res)=>{
  try{
    if(process.env.BAZUNK_CAPROVER_TEST!=="true"){res.status(404).end();return;}
    const userId=owner(req);if(!userId){res.status(401).json({error:"Sign in required."});return;}
    const key=(req.body as {objectKey?:unknown}).objectKey;
    if(!ownsKey(userId,key)){res.status(403).json({error:"Invalid video reference."});return;}
    const verification=await checkStoredVideo(key);
    if(!verification.ok){
      console.warn("Video storage verification rejected", {status:verification.status,size:verification.size});
      res.status(400).json({error:`Video storage verification failed (HTTP ${verification.status}). Please retry.`});return;
    }
    res.json({objectKey:key,url:signedUrl("GET",key).url});
  }catch(err){console.error("Video confirmation failed",err);res.status(503).json({error:"Unable to verify video storage."});}
});
export default router;

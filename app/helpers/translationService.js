const axios = require('axios');
const crypto = require('crypto');

const enabled = String(process.env.AUTO_TRANSLATE || 'false').toLowerCase() === 'true';
const endpoint = process.env.TRANSLATION_ENDPOINT || 'https://translate.googleapis.com/translate_a/single';
const cache = new Map();

function key(text, target) { return crypto.createHash('sha1').update(`${target}|${text}`).digest('hex'); }

async function translateText(text, target='ta') {
  if (!enabled || target !== 'ta' || typeof text !== 'string' || !text.trim()) return text;
  if (/^https?:\/\//i.test(text) || /^data:/i.test(text)) return text;
  if (/^[0-9\s.,:+()/_-]+$/.test(text)) return text;
  // Don't translate text that is already predominantly Tamil.
  const tamil = (text.match(/[\u0B80-\u0BFF]/g) || []).length;
  if (tamil > text.length * 0.2) return text;
  const k=key(text,target);
  if (cache.has(k)) return cache.get(k);
  try {
    const r=await axios.get(endpoint,{params:{client:'gtx',sl:'auto',tl:target,dt:'t',q:text},timeout:Number(process.env.TRANSLATION_TIMEOUT_MS||3500)});
    const parts=r.data?.[0] || [];
    const out=parts.map(x=>x?.[0]||'').join('') || text;
    cache.set(k,out);
    return out;
  } catch (e) {
    return text;
  }
}
module.exports={translateText,enabled};

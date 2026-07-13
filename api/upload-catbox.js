export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'so POST' });
  try {
    const chunks = [];
    for await (const ch of req) chunks.push(ch);
    const buf = Buffer.concat(chunks);
    if (buf.length < 100000) return res.status(400).json({ error: 'corpo muito pequeno', bytes: buf.length });
    const fd = new FormData();
    fd.append('reqtype', 'fileupload');
    fd.append('fileToUpload', new Blob([buf], { type: 'video/mp4' }), 'criativo-rolo-pet.mp4');
    const r = await fetch('https://catbox.moe/user/api.php', { method: 'POST', body: fd });
    const texto = (await r.text()).trim();
    if (!r.ok || !texto.startsWith('http')) {
      return res.status(502).json({ error: 'catbox falhou', status: r.status, resposta: texto.slice(0, 200) });
    }
    return res.status(200).json({ ok: true, url: texto, bytes: buf.length });
  } catch (e) {
    return res.status(500).json({ error: String(e) });
  }
}


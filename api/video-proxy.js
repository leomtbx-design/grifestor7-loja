export default async function handler(req, res) {
  try {
    const r = await fetch('https://tmpfiles.org/dl/wDwh1gZj1tQj/rolo-pet-v5.mp4', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
        'Accept': '*/*'
      },
      redirect: 'follow'
    });
    if (!r.ok) return res.status(502).json({ error: 'origem status ' + r.status });
    const buf = Buffer.from(await r.arrayBuffer());
    const ct = r.headers.get('content-type') || '';
    if (buf.length < 500000 || ct.includes('text/html')) {
      return res.status(502).json({ error: 'conteudo invalido', tipo: ct, bytes: buf.length });
    }
    res.setHeader('Content-Type', 'video/mp4');
    res.setHeader('Content-Length', String(buf.length));
    res.setHeader('Content-Disposition', 'inline; filename="criativo-rolo-pet.mp4"');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    return res.status(200).send(buf);
  } catch (e) {
    return res.status(500).json({ error: String(e) });
  }
}


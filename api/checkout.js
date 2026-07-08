export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { customerName, customerEmail, customerPhone, customerCpf, customerAddress, customerNumber, customerComplement, customerCity, customerState, customerZipCode, product, color, size, paymentMethod, value } = req.body;

  if (!customerName || !customerEmail || !customerCpf || !customerAddress || !customerNumber || !customerCity || !customerState || !customerZipCode || !product || !paymentMethod) {
    return res.status(400).json({ error: 'Dados incompletos. Preencha todos os campos obrigatórios.' });
  }

  const apiKey = process.env.CHAVE_API_ASAAS;
  if (!apiKey) return res.status(500).json({ error: 'Chave API não configurada' });

  try {
    // 1. Criar cliente
    const customerRes = await fetch('https://api.asaas.com/v3/customers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'access_token': apiKey },
      body: JSON.stringify({
        name: customerName,
        email: customerEmail,
        phone: customerPhone,
        cpfCnpj: customerCpf.replace(/\D/g, ''),
        address: customerAddress,
        addressNumber: customerNumber,
        complement: customerComplement || '',
        city: customerCity,
        state: customerState,
        postalCode: customerZipCode.replace(/\D/g, '')
      })
    });

    const customer = await customerRes.json();
    if (!customer.id) return res.status(400).json({ error: 'Erro ao criar cliente', details: customer });

    // 2. Criar cobrança
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 1);
    const dueDateStr = dueDate.toISOString().split('T')[0];

    const billingType = paymentMethod === 'pix' ? 'PIX' : paymentMethod === 'boleto' ? 'BOLETO' : 'CREDIT_CARD';

    const paymentRes = await fetch('https://api.asaas.com/v3/payments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'access_token': apiKey },
      body: JSON.stringify({
        customer: customer.id,
        billingType,
        value: parseFloat(value),
        dueDate: dueDateStr,
        description: `Grifestor7 — ${product}${color ? ' — ' + color : ''}${size ? ' — Tam. ' + size : ''}`,
        externalReference: `order_${Date.now()}`
      })
    });

    const payment = await paymentRes.json();
    if (!payment.id) return res.status(400).json({ error: 'Erro ao criar pagamento', details: payment });

    // 3. PIX QR Code
    let pixData = null;
    if (billingType === 'PIX') {
      const pixRes = await fetch(`https://api.asaas.com/v3/payments/${payment.id}/pixQrCode`, {
        headers: { 'access_token': apiKey }
      });
      pixData = await pixRes.json();
    }

    return res.status(200).json({
      success: true,
      paymentId: payment.id,
      invoiceUrl: payment.invoiceUrl,
      bankSlipUrl: payment.bankSlipUrl,
      pixQrCode: pixData?.encodedImage,
      pixCopyPaste: pixData?.payload,
      value: payment.value
    });

  } catch (error) {
    return res.status(500).json({ error: 'Erro interno', details: error.message });
  }
}

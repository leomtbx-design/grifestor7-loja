export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const adminKey = process.env.PEDIDOS_ADMIN_KEY;
    const providedKey = req.query.key;
    if (!adminKey || providedKey !== adminKey) {
          return res.status(401).json({ error: 'Acesso negado. Chave invalida.' });
    }

  const apiKey = process.env.CHAVE_API_ASAAS;
    if (!apiKey) return res.status(500).json({ error: 'Chave API nao configurada' });

  try {
        const paymentsRes = await fetch('https://api.asaas.com/v3/payments?limit=60&offset=0', {
                headers: { 'access_token': apiKey }
        });
        const paymentsData = await paymentsRes.json();
        const payments = paymentsData.data || [];

      const customerCache = {};
        const pedidos = await Promise.all(payments.map(async (p) => {
                let customer = customerCache[p.customer];
                if (!customer) {
                          try {
                                      const cRes = await fetch(`https://api.asaas.com/v3/customers/${p.customer}`, {
                                                    headers: { 'access_token': apiKey }
                                      });
                                      customer = await cRes.json();
                                      customerCache[p.customer] = customer;
                          } catch (e) {
                                      customer = {};
                          }
                }

                                                             return {
                                                                       id: p.id,
                                                                       criadoEm: p.dateCreated,
                                                                       vencimento: p.dueDate,
                                                                       status: p.status,
                                                                       forma: p.billingType,
                                                                       valor: p.value,
                                                                       descricao: p.description,
                                                                       cliente: {
                                                                                   nome: customer.name || '',
                                                                                   email: customer.email || '',
                                                                                   telefone: customer.phone || customer.mobilePhone || '',
                                                                                   cpf: customer.cpfCnpj || '',
                                                                                   endereco: customer.address || '',
                                                                                   numero: customer.addressNumber || '',
                                                                                   complemento: customer.complement || '',
                                                                                   cidade: customer.city || customer.cityName || '',
                                                                                   estado: customer.state || '',
                                                                                   cep: customer.postalCode || ''
                                                                       }
                                                             };
        }));

      pedidos.sort((a, b) => new Date(b.criadoEm) - new Date(a.criadoEm));

      return res.status(200).json({ success: true, total: pedidos.length, pedidos });
  } catch (error) {
        return res.status(500).json({ error: 'Erro interno', details: error.message });
  }
}

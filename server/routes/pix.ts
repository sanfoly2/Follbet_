import { Router } from 'express';
import { MercadoPagoConfig, Payment } from 'mercadopago';

const router = Router();
const client = new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN || '' });
const payment = new Payment(client);

router.post('/', async (req, res) => {
  try {
    const result = await payment.create({
      body: {
        transaction_amount: req.body.amount,
        description: 'Deposito FollBet',
        payment_method_id: 'pix',
        payer: {
          email: req.body.email,
        },
      }
    });

    res.json({
      qr_code: result.point_of_interaction?.transaction_data?.qr_code,
      qr_code_base64: result.point_of_interaction?.transaction_data?.qr_code_base64,
      copy_paste: result.point_of_interaction?.transaction_data?.qr_code,
    });
  } catch (error) {
    console.error('Erro ao gerar Pix:', error);
    res.status(500).json({ error: 'Erro ao gerar Pix' });
  }
});

export default router;

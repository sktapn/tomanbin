/** Prévia de compartilhamento: tags Open Graph certas e sem HTML injetado */
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'segredo-de-teste-com-mais-de-32-caracteres!!';
process.env.CLIENT_URL = 'https://tomanbin.com.br';

const request = require('supertest');
const Product = require('../src/models/Product');
const app = require('../src/app');

const ID = '64b0000000000000000000ff';
const mockProduct = (p) => jest.spyOn(Product, 'findOne').mockReturnValue({ select: () => ({ catch: async () => p }) });
afterEach(() => jest.restoreAllMocks());

describe('GET /share/produto/:id', () => {
  it('gera as tags do produto com foto 1200×630 do Cloudinary', async () => {
    mockProduct({ name: 'Mago Chibi', price: 59.9, category: 'action-figures', stock: 3, description: '', images: ['https://res.cloudinary.com/x/image/upload/v1/tomanbin/a.jpg'] });
    const res = await request(app).get(`/share/produto/${ID}`);
    expect(res.status).toBe(200);
    expect(res.text).toContain('<meta property="og:title" content="Mago Chibi | Tomanbin">');
    expect(res.text).toContain('R$ 59,90 · Action Figures · Pronta entrega em Boa Vista');
    expect(res.text).toContain('/image/upload/c_pad,b_rgb:fffaf6,w_1200,h_630,f_jpg,q_auto/v1/tomanbin/a.jpg');
    expect(res.text).toContain(`url=https://tomanbin.com.br/produto/${ID}`);
  });

  it('imagem SVG (não aparece no WhatsApp) usa a imagem padrão da loja', async () => {
    mockProduct({ name: 'X', price: 10, category: 'buttons', stock: 0, images: ['http://localhost:5001/static/products/x.svg'] });
    const res = await request(app).get(`/share/produto/${ID}`);
    expect(res.text).toContain('content="https://tomanbin.com.br/og-image.png"');
    expect(res.text).toContain('Esgotado');
  });

  it('nome com HTML é escapado', async () => {
    mockProduct({ name: '<script>alert(1)</script>', price: 10, category: 'buttons', stock: 1, images: [] });
    const res = await request(app).get(`/share/produto/${ID}`);
    expect(res.text).not.toContain('<script>');
  });

  it('produto inexistente ou id inválido → volta para a loja', async () => {
    mockProduct(null);
    const a = await request(app).get(`/share/produto/${ID}`);
    const b = await request(app).get('/share/produto/abc');
    expect(a.status).toBe(302);
    expect(b.headers.location).toBe('https://tomanbin.com.br/loja');
  });
});

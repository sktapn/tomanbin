/**
 * Upload de fotos de produto: só admin, só imagem de verdade, até 5 MB.
 */
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'segredo-de-teste-com-mais-de-32-caracteres!!';
delete process.env.CLOUDINARY_URL; // testa o modo local

const fs = require('fs');
const path = require('path');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const User = require('../src/models/User');
const app = require('../src/app');

const ADMIN_ID = '64b000000000000000000001';
const USER_ID = '64b000000000000000000002';
const tokenFor = (id) => jwt.sign({ id }, process.env.JWT_SECRET);
const UPLOAD_DIR = path.join(__dirname, '..', 'public', 'uploads');

// PNG mínimo válido (1x1 pixel)
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64'
);

const created = [];
beforeEach(() => {
  jest.spyOn(User, 'findById').mockImplementation(async (id) =>
    id === ADMIN_ID ? { _id: ADMIN_ID, role: 'admin' } : id === USER_ID ? { _id: USER_ID, role: 'user' } : null
  );
});
afterEach(() => jest.restoreAllMocks());
afterAll(() => created.forEach((f) => fs.rmSync(f, { force: true })));

const upload = (token, buffer, filename = 'foto.png') =>
  request(app).post('/api/uploads/image').set('Authorization', `Bearer ${token}`).attach('image', buffer, filename);

describe('Upload de fotos', () => {
  it('admin envia PNG → 201 com a URL da foto', async () => {
    const res = await upload(tokenFor(ADMIN_ID), PNG);
    expect(res.status).toBe(201);
    expect(res.body.url).toMatch(/\/static\/uploads\/.+\.png$/);
    const file = path.join(UPLOAD_DIR, res.body.url.split('/').pop());
    created.push(file);
    expect(fs.existsSync(file)).toBe(true);
  });

  it('cliente comum não pode enviar → 403', async () => {
    const res = await upload(tokenFor(USER_ID), PNG);
    expect(res.status).toBe(403);
  });

  it('arquivo que não é imagem (mesmo com nome .png) → 400', async () => {
    const res = await upload(tokenFor(ADMIN_ID), Buffer.from('<script>alert(1)</script> isto não é imagem'), 'falso.png');
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/JPG, PNG ou WEBP/);
  });

  it('foto maior que 5 MB → 400', async () => {
    const big = Buffer.concat([PNG, Buffer.alloc(5 * 1024 * 1024 + 10)]);
    const res = await upload(tokenFor(ADMIN_ID), big);
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/maior que 5 MB/);
  });
});

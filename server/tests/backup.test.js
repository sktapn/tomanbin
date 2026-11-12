/** Backup criptografado: só abre com a senha certa */
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'segredo-de-teste-com-mais-de-32-caracteres!!';

const request = require('supertest');
const { encrypt, decrypt } = require('../scripts/backupCrypto');
const app = require('../src/app');

describe('Criptografia do backup', () => {
  const data = Buffer.from(JSON.stringify({ users: [{ name: 'Ana', email: 'ana@x.com' }] }));

  it('volta igual com a senha certa', () => {
    expect(decrypt(encrypt(data, 'senha-forte-123'), 'senha-forte-123').equals(data)).toBe(true);
  });

  it('o arquivo não contém os dados em texto aberto', () => {
    expect(encrypt(data, 'senha-forte-123').toString('latin1')).not.toContain('ana@x.com');
  });

  it('senha errada não abre', () => {
    expect(() => decrypt(encrypt(data, 'senha-forte-123'), 'outra-senha')).toThrow(/Senha do backup incorreta/);
  });
});

describe('GET /api/health', () => {
  it('sem banco conectado responde 503 (o monitor dispara o alerta)', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(503);
    expect(res.body.database).toBe('desconectado');
  });
});

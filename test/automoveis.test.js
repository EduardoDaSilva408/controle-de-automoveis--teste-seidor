import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, test } from 'node:test';
import Database from 'better-sqlite3';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { createDatabase } from '../src/database.js';

let database;
let app;

const automovel = { placa: 'ABC1D23', marca: 'Toyota', cor: 'Prata' };
const motorista = { nome: 'Maria da Silva' };
const dataInicio = '2026-11-07T10:00:00.000Z';

beforeEach(() => {
  database = createDatabase(':memory:');
  app = createApp({ database });
});

afterEach(() => {
  database.close();
});

async function criarAutomovel(dados = automovel) {
  const response = await request(app).post('/api/automoveis').send(dados);
  assert.equal(response.status, 201);
  return response.body;
}

async function criarMotorista(dados = motorista) {
  const response = await request(app).post('/api/motoristas').send(dados);
  assert.equal(response.status, 201);
  return response.body;
}

async function criarUtilizacao(automovelId, motoristaId, extra = {}) {
  return request(app).post('/api/utilizacoes').send({
    automovel_id: automovelId,
    motorista_id: motoristaId,
    data_inicio: dataInicio,
    motivo: 'Visita a cliente',
    ...extra
  });
}

test('serve a interface web da frota', async () => {
  const response = await request(app).get('/');
  assert.equal(response.status, 200);
  assert.match(response.text, /Gestão de automóveis/);
  assert.match(response.text, /Utilizações/);
  assert.match(response.text, /type="module" src="\/app\.js"/);

  for (const module of ['automoveis', 'motoristas', 'utilizacoes']) {
    const asset = await request(app).get(`/js/${module}.js`);
    assert.equal(asset.status, 200);
    assert.match(asset.text, new RegExp(`init${module[0].toUpperCase()}${module.slice(1)}`));
  }
});

test('cadastra, lista, filtra, consulta, atualiza e exclui automóveis', async () => {
  const criado = await criarAutomovel();
  await criarAutomovel({ placa: 'DEF2G34', marca: 'Honda', cor: 'Preto' });

  assert.equal(criado.id, 1);
  assert.equal(criado.placa, 'ABC1D23');
  assert.equal((await request(app).get('/api/automoveis')).body.length, 2);
  assert.equal((await request(app).get('/api/automoveis?marca=toy&cor=prat')).body.length, 1);
  assert.equal((await request(app).get(`/api/automoveis/${criado.id}`)).body.marca, 'Toyota');

  const atualizado = await request(app).put(`/api/automoveis/${criado.id}`).send({
    placa: 'XYZ9K87', marca: 'Toyota', cor: 'Azul'
  });
  assert.equal(atualizado.status, 200);
  assert.equal(atualizado.body.placa, 'XYZ9K87');

  assert.equal((await request(app).delete(`/api/automoveis/${criado.id}`)).status, 204);
  assert.equal((await request(app).get(`/api/automoveis/${criado.id}`)).status, 404);
});

test('valida campos obrigatórios e impede placas duplicadas', async () => {
  const incompleto = await request(app).post('/api/automoveis').send({ marca: 'Toyota' });
  assert.equal(incompleto.status, 400);
  assert.match(incompleto.body.erro, /placa/);

  await criarAutomovel();
  const duplicado = await request(app).post('/api/automoveis').send({ ...automovel, placa: 'abc1d23' });
  assert.equal(duplicado.status, 409);
});

test('cadastra, lista por nome, consulta, atualiza e exclui motoristas', async () => {
  const criado = await criarMotorista();
  await criarMotorista({ nome: 'João Pereira' });

  assert.equal(criado.id, 1);
  assert.equal((await request(app).get('/api/motoristas?nome=maria')).body.length, 1);
  assert.equal((await request(app).get(`/api/motoristas/${criado.id}`)).body.nome, motorista.nome);

  const atualizado = await request(app).put(`/api/motoristas/${criado.id}`).send({ nome: 'Maria Souza' });
  assert.equal(atualizado.status, 200);
  assert.equal(atualizado.body.nome, 'Maria Souza');

  assert.equal((await request(app).delete(`/api/motoristas/${criado.id}`)).status, 204);
  assert.equal((await request(app).get(`/api/motoristas/${criado.id}`)).status, 404);
});

test('rejeita motorista sem nome e não permite duplicar placa por caixa diferente', async () => {
  assert.equal((await request(app).post('/api/motoristas').send({ nome: ' ' })).status, 400);
  await criarAutomovel();
  assert.equal((await request(app).post('/api/automoveis').send({ ...automovel, placa: 'abc1d23' })).status, 409);
});

test('registra e finaliza utilização com informações do motorista e automóvel', async () => {
  const carro = await criarAutomovel();
  const pessoa = await criarMotorista();
  const criada = await criarUtilizacao(carro.id, pessoa.id);

  assert.equal(criada.status, 201);
  assert.equal(criada.body.motorista_nome, pessoa.nome);
  assert.equal(criada.body.automovel_placa, carro.placa);
  assert.equal(criada.body.motivo, 'Visita a cliente');
  assert.equal((await request(app).get('/api/utilizacoes')).body.length, 1);

  const finalizada = await request(app).patch(`/api/utilizacoes/${criada.body.id}/finalizar`).send({});
  assert.equal(finalizada.status, 200);
  assert.ok(finalizada.body.data_fim);
  assert.equal((await request(app).patch(`/api/utilizacoes/${criada.body.id}/finalizar`).send({})).status, 409);
});

test('não permite que um automóvel ou motorista tenha utilizações simultâneas', async () => {
  const carroUm = await criarAutomovel();
  const carroDois = await criarAutomovel({ placa: 'DEF2G34', marca: 'Honda', cor: 'Preto' });
  const pessoaUm = await criarMotorista();
  const pessoaDois = await criarMotorista({ nome: 'João Pereira' });

  assert.equal((await criarUtilizacao(carroUm.id, pessoaUm.id)).status, 201);
  assert.equal((await criarUtilizacao(carroDois.id, pessoaUm.id)).status, 409);
  assert.equal((await criarUtilizacao(carroUm.id, pessoaDois.id)).status, 409);
  assert.equal((await criarUtilizacao(carroDois.id, pessoaDois.id)).status, 201);
});

test('exige dados e datas válidas para utilização', async () => {
  const carro = await criarAutomovel();
  const pessoa = await criarMotorista();
  assert.equal((await criarUtilizacao(carro.id, pessoa.id, { motivo: ' ' })).status, 400);
  assert.equal((await criarUtilizacao(carro.id, pessoa.id, { data_inicio: 'data inválida' })).status, 400);
  assert.equal((await criarUtilizacao(999, pessoa.id)).status, 404);
});

test('impede remover recursos com histórico de utilização', async () => {
  const carro = await criarAutomovel();
  const pessoa = await criarMotorista();
  await criarUtilizacao(carro.id, pessoa.id);

  assert.equal((await request(app).delete(`/api/automoveis/${carro.id}`)).status, 409);
  assert.equal((await request(app).delete(`/api/motoristas/${pessoa.id}`)).status, 409);
});

test('retorna 400 para JSON inválido e 404 para rota desconhecida', async () => {
  const resposta = await request(app)
    .post('/api/automoveis')
    .set('Content-Type', 'application/json')
    .send('{"placa":');

  assert.equal(resposta.status, 400);
  assert.equal((await request(app).get('/rota-inexistente')).status, 404);
});

test('migra e preserva os automóveis cadastrados no formato anterior', () => {
  const directory = mkdtempSync(path.join(tmpdir(), 'frota-migration-'));
  const filename = path.join(directory, 'legacy.sqlite');
  const legacy = new Database(filename);
  legacy.exec(`
    CREATE TABLE automoveis (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      marca TEXT NOT NULL,
      modelo TEXT NOT NULL,
      ano INTEGER NOT NULL,
      cor TEXT NOT NULL,
      placa TEXT NOT NULL COLLATE NOCASE UNIQUE,
      valor REAL NOT NULL,
      criado_em TEXT NOT NULL DEFAULT (datetime('now'))
    );
    INSERT INTO automoveis (marca, modelo, ano, cor, placa, valor)
    VALUES ('Toyota', 'Corolla', 2022, 'Prata', 'ABC1D23', 125000);
  `);
  legacy.close();

  const migrated = createDatabase(filename);
  assert.deepEqual(migrated.prepare('SELECT id, marca, cor, placa FROM automoveis').get(), {
    id: 1, marca: 'Toyota', cor: 'Prata', placa: 'ABC1D23'
  });
  assert.equal(migrated.prepare('SELECT COUNT(*) AS count FROM automoveis_legado').get().count, 1);
  migrated.close();
  rmSync(directory, { recursive: true, force: true });
});

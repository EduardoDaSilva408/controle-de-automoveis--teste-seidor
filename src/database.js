import Database from 'better-sqlite3';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectDirectory = path.dirname(fileURLToPath(import.meta.url));

function createSchema(database) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS automoveis (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      placa TEXT NOT NULL COLLATE NOCASE UNIQUE,
      cor TEXT NOT NULL,
      marca TEXT NOT NULL,
      criado_em TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS motoristas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL COLLATE NOCASE,
      criado_em TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS utilizacoes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      automovel_id INTEGER NOT NULL REFERENCES automoveis(id) ON DELETE RESTRICT,
      motorista_id INTEGER NOT NULL REFERENCES motoristas(id) ON DELETE RESTRICT,
      data_inicio TEXT NOT NULL,
      data_fim TEXT,
      motivo TEXT NOT NULL,
      criado_em TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE UNIQUE INDEX IF NOT EXISTS uma_utilizacao_ativa_por_automovel
      ON utilizacoes (automovel_id) WHERE data_fim IS NULL;
    CREATE UNIQUE INDEX IF NOT EXISTS uma_utilizacao_ativa_por_motorista
      ON utilizacoes (motorista_id) WHERE data_fim IS NULL;
  `);
}

function migrateLegacyAutomoveis(database) {
  const columns = database.prepare('PRAGMA table_info(automoveis)').all();
  if (!columns.some((column) => column.name === 'modelo')) {
    return;
  }

  const hasLegacyArchive = database
    .prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'automoveis_legado'")
    .get();
  if (hasLegacyArchive) {
    throw new Error('Migração interrompida: a tabela automoveis_legado já existe.');
  }

  const migrate = database.transaction(() => {
    database.exec('ALTER TABLE automoveis RENAME TO automoveis_legado');
    createSchema(database);
    database.exec(`
      INSERT INTO automoveis (id, placa, cor, marca, criado_em)
      SELECT id, placa, cor, marca, criado_em
      FROM automoveis_legado
    `);
  });
  migrate();
}

export function createDatabase(filename = process.env.DATABASE_FILE) {
  const databaseFile = filename ?? path.join(projectDirectory, '..', 'data', 'automoveis.sqlite');

  if (databaseFile !== ':memory:') {
    mkdirSync(path.dirname(path.resolve(databaseFile)), { recursive: true });
  }

  const database = new Database(databaseFile);
  database.pragma('foreign_keys = ON');
  migrateLegacyAutomoveis(database);
  createSchema(database);

  return database;
}

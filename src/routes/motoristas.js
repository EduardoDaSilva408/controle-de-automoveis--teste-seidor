import { Router } from 'express';

export function createMotoristasRouter(database) {
  const router = Router();
  const buscarPorId = database.prepare('SELECT * FROM motoristas WHERE id = ?');
  const inserir = database.prepare('INSERT INTO motoristas (nome) VALUES (?)');
  const atualizar = database.prepare('UPDATE motoristas SET nome = ? WHERE id = ?');
  const remover = database.prepare('DELETE FROM motoristas WHERE id = ?');

  router.get('/', (request, response) => {
    const nome = typeof request.query.nome === 'string' ? request.query.nome.trim() : '';
    const motoristas = nome
      ? database.prepare('SELECT * FROM motoristas WHERE nome LIKE ? COLLATE NOCASE ORDER BY id').all(`%${nome}%`)
      : database.prepare('SELECT * FROM motoristas ORDER BY id').all();
    response.json(motoristas);
  });

  router.get('/:id', (request, response) => {
    const motorista = buscarPorId.get(request.params.id);
    if (!motorista) {
      return response.status(404).json({ erro: 'Motorista não encontrado.' });
    }
    return response.json(motorista);
  });

  router.post('/', (request, response) => {
    const nome = request.body?.nome;
    if (typeof nome !== 'string' || !nome.trim()) {
      return response.status(400).json({ erro: 'O campo "nome" deve ser um texto não vazio.' });
    }

    const resultado = inserir.run(nome.trim());
    return response.status(201).json(buscarPorId.get(resultado.lastInsertRowid));
  });

  router.put('/:id', (request, response) => {
    const nome = request.body?.nome;
    if (typeof nome !== 'string' || !nome.trim()) {
      return response.status(400).json({ erro: 'O campo "nome" deve ser um texto não vazio.' });
    }

    const resultado = atualizar.run(nome.trim(), request.params.id);
    if (resultado.changes === 0) {
      return response.status(404).json({ erro: 'Motorista não encontrado.' });
    }
    return response.json(buscarPorId.get(request.params.id));
  });

  router.delete('/:id', (request, response) => {
    try {
      const resultado = remover.run(request.params.id);
      if (resultado.changes === 0) {
        return response.status(404).json({ erro: 'Motorista não encontrado.' });
      }
      return response.status(204).end();
    } catch (error) {
      if (error.code === 'SQLITE_CONSTRAINT_FOREIGNKEY' || error.code === 'SQLITE_CONSTRAINT_TRIGGER') {
        return response.status(409).json({ erro: 'Não é possível excluir um motorista que possui utilizações registradas.' });
      }
      throw error;
    }
  });

  return router;
}

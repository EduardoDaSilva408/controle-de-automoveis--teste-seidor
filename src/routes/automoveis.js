import { Router } from 'express';

function validarAutomovel(dados) {
  if (dados === null || typeof dados !== 'object' || Array.isArray(dados)) {
    return 'Envie um objeto JSON com os dados do automóvel.';
  }

  for (const campo of ['placa', 'cor', 'marca']) {
    if (typeof dados[campo] !== 'string' || dados[campo].trim() === '') {
      return `O campo "${campo}" deve ser um texto não vazio.`;
    }
  }

  return null;
}

function mapearAutomovel(dados) {
  return {
    placa: dados.placa.trim().toUpperCase(),
    cor: dados.cor.trim(),
    marca: dados.marca.trim()
  };
}

function filtrarLista(request, database) {
  const filtros = [];
  const parametros = [];

  for (const campo of ['marca', 'cor']) {
    const valor = request.query[campo];
    if (typeof valor === 'string' && valor.trim()) {
      filtros.push(`${campo} LIKE ? COLLATE NOCASE`);
      parametros.push(`%${valor.trim()}%`);
    }
  }

  const consulta = `SELECT * FROM automoveis ${filtros.length ? `WHERE ${filtros.join(' AND ')}` : ''} ORDER BY id`;
  return database.prepare(consulta).all(...parametros);
}

export function createAutomoveisRouter(database) {
  const router = Router();
  const listar = database.prepare('SELECT * FROM automoveis ORDER BY id');
  const buscarPorId = database.prepare('SELECT * FROM automoveis WHERE id = ?');
  const inserir = database.prepare(`
    INSERT INTO automoveis (placa, cor, marca)
    VALUES (@placa, @cor, @marca)
  `);
  const atualizar = database.prepare(`
    UPDATE automoveis SET placa = @placa, cor = @cor, marca = @marca WHERE id = @id
  `);
  const remover = database.prepare('DELETE FROM automoveis WHERE id = ?');

  router.get('/', (request, response) => {
    const temFiltros = ['marca', 'cor'].some((campo) => typeof request.query[campo] === 'string' && request.query[campo].trim());
    response.json(temFiltros ? filtrarLista(request, database) : listar.all());
  });

  router.get('/:id', (request, response) => {
    const automovel = buscarPorId.get(request.params.id);
    if (!automovel) {
      return response.status(404).json({ erro: 'Automóvel não encontrado.' });
    }
    return response.json(automovel);
  });

  router.post('/', (request, response) => {
    const erro = validarAutomovel(request.body);
    if (erro) {
      return response.status(400).json({ erro });
    }

    try {
      const resultado = inserir.run(mapearAutomovel(request.body));
      return response.status(201).json(buscarPorId.get(resultado.lastInsertRowid));
    } catch (error) {
      if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
        return response.status(409).json({ erro: 'Já existe um automóvel cadastrado com essa placa.' });
      }
      throw error;
    }
  });

  router.put('/:id', (request, response) => {
    const erro = validarAutomovel(request.body);
    if (erro) {
      return response.status(400).json({ erro });
    }

    try {
      const resultado = atualizar.run({ id: request.params.id, ...mapearAutomovel(request.body) });
      if (resultado.changes === 0) {
        return response.status(404).json({ erro: 'Automóvel não encontrado.' });
      }
      return response.json(buscarPorId.get(request.params.id));
    } catch (error) {
      if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
        return response.status(409).json({ erro: 'Já existe um automóvel cadastrado com essa placa.' });
      }
      throw error;
    }
  });

  router.delete('/:id', (request, response) => {
    try {
      const resultado = remover.run(request.params.id);
      if (resultado.changes === 0) {
        return response.status(404).json({ erro: 'Automóvel não encontrado.' });
      }
      return response.status(204).end();
    } catch (error) {
      if (error.code === 'SQLITE_CONSTRAINT_FOREIGNKEY' || error.code === 'SQLITE_CONSTRAINT_TRIGGER') {
        return response.status(409).json({ erro: 'Não é possível excluir um automóvel que possui utilizações registradas.' });
      }
      throw error;
    }
  });

  return router;
}

import { Router } from 'express';

function dataValida(valor) {
  return typeof valor === 'string' && valor.trim() !== '' && !Number.isNaN(Date.parse(valor));
}

export function createUtilizacoesRouter(database) {
  const router = Router();
  const listar = database.prepare(`
    SELECT
      u.id, u.automovel_id, u.motorista_id, u.data_inicio, u.data_fim, u.motivo,
      m.nome AS motorista_nome,
      a.placa AS automovel_placa, a.cor AS automovel_cor, a.marca AS automovel_marca
    FROM utilizacoes u
    JOIN motoristas m ON m.id = u.motorista_id
    JOIN automoveis a ON a.id = u.automovel_id
    ORDER BY u.id DESC
  `);
  const buscarDetalhes = database.prepare(`
    SELECT
      u.id, u.automovel_id, u.motorista_id, u.data_inicio, u.data_fim, u.motivo,
      m.nome AS motorista_nome,
      a.placa AS automovel_placa, a.cor AS automovel_cor, a.marca AS automovel_marca
    FROM utilizacoes u
    JOIN motoristas m ON m.id = u.motorista_id
    JOIN automoveis a ON a.id = u.automovel_id
    WHERE u.id = ?
  `);
  const buscarPorId = database.prepare('SELECT * FROM utilizacoes WHERE id = ?');
  const inserir = database.prepare(`
    INSERT INTO utilizacoes (automovel_id, motorista_id, data_inicio, motivo)
    VALUES (@automovel_id, @motorista_id, @data_inicio, @motivo)
  `);
  const atualizarDataFim = database.prepare('UPDATE utilizacoes SET data_fim = ? WHERE id = ?');

  router.get('/', (_request, response) => {
    response.json(listar.all());
  });

  router.post('/', (request, response) => {
    const { automovel_id: automovelId, motorista_id: motoristaId, data_inicio: dataInicio, motivo } = request.body ?? {};

    if (!Number.isInteger(automovelId) || automovelId < 1 || !Number.isInteger(motoristaId) || motoristaId < 1) {
      return response.status(400).json({ erro: 'Selecione um automóvel e um motorista válidos.' });
    }
    if (!dataValida(dataInicio)) {
      return response.status(400).json({ erro: 'Informe uma data de início válida.' });
    }
    if (typeof motivo !== 'string' || !motivo.trim()) {
      return response.status(400).json({ erro: 'O motivo de utilização é obrigatório.' });
    }

    if (!database.prepare('SELECT 1 FROM automoveis WHERE id = ?').get(automovelId)) {
      return response.status(404).json({ erro: 'Automóvel não encontrado.' });
    }
    if (!database.prepare('SELECT 1 FROM motoristas WHERE id = ?').get(motoristaId)) {
      return response.status(404).json({ erro: 'Motorista não encontrado.' });
    }

    const usoAutomovel = database.prepare('SELECT 1 FROM utilizacoes WHERE automovel_id = ? AND data_fim IS NULL').get(automovelId);
    if (usoAutomovel) {
      return response.status(409).json({ erro: 'Este automóvel já está em utilização.' });
    }
    const usoMotorista = database.prepare('SELECT 1 FROM utilizacoes WHERE motorista_id = ? AND data_fim IS NULL').get(motoristaId);
    if (usoMotorista) {
      return response.status(409).json({ erro: 'Este motorista já está utilizando um automóvel.' });
    }

    try {
      const resultado = inserir.run({
        automovel_id: automovelId,
        motorista_id: motoristaId,
        data_inicio: new Date(dataInicio).toISOString(),
        motivo: motivo.trim()
      });
      return response.status(201).json(buscarDetalhes.get(resultado.lastInsertRowid));
    } catch (error) {
      if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
        return response.status(409).json({ erro: 'O automóvel ou o motorista já está em utilização.' });
      }
      throw error;
    }
  });

  router.patch('/:id/finalizar', (request, response) => {
    const utilizacao = buscarPorId.get(request.params.id);
    if (!utilizacao) {
      return response.status(404).json({ erro: 'Utilização não encontrada.' });
    }
    if (utilizacao.data_fim !== null) {
      return response.status(409).json({ erro: 'Esta utilização já foi finalizada.' });
    }

    const dataFimInformada = request.body?.data_fim;
    const dataFim = dataFimInformada === undefined ? new Date().toISOString() : dataFimInformada;
    if (!dataValida(dataFim) || Date.parse(dataFim) < Date.parse(utilizacao.data_inicio)) {
      return response.status(400).json({ erro: 'A data de finalização deve ser válida e igual ou posterior à data de início.' });
    }

    atualizarDataFim.run(new Date(dataFim).toISOString(), request.params.id);
    return response.json(buscarDetalhes.get(request.params.id));
  });

  return router;
}

# Gestão de automóveis

Aplicação web e API REST para administrar automóveis, motoristas e as utilizações dos veículos. Construída com Node.js, Express e SQLite; a interface web é servida pelo próprio Express.

## Requisitos

- Node.js 20.19 ou superior
- npm

## Instalação e execução

Abra o terminal nesta pasta do projeto e instale as dependências:

```bash
npm install
npm start
```

Durante o desenvolvimento, use `npm run dev` para reiniciar automaticamente após mudanças. Acesse a interface em [http://localhost:3000](http://localhost:3000). A porta pode ser alterada com a variável `PORT`; o arquivo SQLite pode ser definido com `DATABASE_FILE`. Sem configuração, o banco é criado em `data/automoveis.sqlite`.

No PowerShell do Windows, se a política de execução bloquear `npm`, use `npm.cmd` no lugar, por exemplo `npm.cmd install` e `npm.cmd start`.

## Interface web

Na página inicial, use o menu lateral para acessar **Automóveis**, **Motoristas** ou **Utilizações**. Nas telas de automóveis e motoristas é possível cadastrar, editar, excluir, consultar pelo botão de busca ou filtrar a lista. A tela de utilizações permite registrar uma saída, consultar o histórico com os nomes e dados do veículo, e finalizar uma utilização em andamento.

Automóveis e motoristas com histórico de utilização não podem ser excluídos, para preservar os registros. Uma utilização em andamento ocupa tanto o automóvel como o motorista até que seja finalizada.

## API

Todas as rotas aceitam e retornam JSON. Campos de texto obrigatórios não podem ficar vazios.

### Automóveis

| Método | Caminho | Ação |
|---|---|---|
| `GET` | `/api/automoveis` | Lista os automóveis; filtros opcionais `marca` e `cor` |
| `GET` | `/api/automoveis/:id` | Recupera um automóvel pelo identificador |
| `POST` | `/api/automoveis` | Cadastra um automóvel |
| `PUT` | `/api/automoveis/:id` | Atualiza um automóvel |
| `DELETE` | `/api/automoveis/:id` | Exclui um automóvel sem histórico |

Cadastro e atualização recebem:

```json
{
  "placa": "ABC1D23",
  "cor": "Prata",
  "marca": "Toyota"
}
```

A placa é única e sua comparação não diferencia maiúsculas de minúsculas.

### Motoristas

| Método | Caminho | Ação |
|---|---|---|
| `GET` | `/api/motoristas?nome=maria` | Lista motoristas, com filtro opcional pelo nome |
| `GET` | `/api/motoristas/:id` | Recupera um motorista pelo identificador |
| `POST` | `/api/motoristas` | Cadastra um motorista |
| `PUT` | `/api/motoristas/:id` | Atualiza um motorista |
| `DELETE` | `/api/motoristas/:id` | Exclui um motorista sem histórico |

Cadastro e atualização recebem:

```json
{ "nome": "Maria da Silva" }
```

### Utilizações

| Método | Caminho | Ação |
|---|---|---|
| `GET` | `/api/utilizacoes` | Lista o histórico com motorista e automóvel |
| `POST` | `/api/utilizacoes` | Inicia uma utilização |
| `PATCH` | `/api/utilizacoes/:id/finalizar` | Finaliza uma utilização em andamento |

Para iniciar uma utilização, envie os identificadores existentes e uma data válida:

```json
{
  "automovel_id": 1,
  "motorista_id": 1,
  "data_inicio": "2026-11-07T10:00:00.000Z",
  "motivo": "Visita a cliente"
}
```

A finalização aceita `data_fim` opcional. Se omitida, a API registra a data e hora atuais:

```json
{ "data_fim": "2026-11-07T12:00:00.000Z" }
```

Um automóvel e um motorista não podem ter mais de uma utilização sem data de finalização ao mesmo tempo. A API responde com `409` para conflitos de utilização, placas repetidas ou exclusão de recursos com histórico, `400` para dados inválidos e `404` para identificadores inexistentes.

## Testes

Execute os testes automatizados com:

```bash
npm test
```

Os testes usam bancos SQLite em memória ou temporários, não o banco de dados da aplicação.

## Estrutura

- `src/server.js`: inicializa o banco e o servidor.
- `src/app.js`: configura a API e serve a interface.
- `src/database.js`: cria o esquema SQLite e migra dados do cadastro anterior.
- `src/routes/`: operações de automóveis, motoristas e utilizações.
- `public/index.html`: documento único da interface SPA.
- `public/app.js`: inicializa os módulos e controla a navegação entre páginas.
- `public/js/automoveis.js`, `public/js/motoristas.js` e `public/js/utilizacoes.js`: lógica de cada seção da SPA.
- `public/js/shared.js`: chamadas à API e utilitários compartilhados.
- `public/styles.css`: estilos da interface.
- `test/`: testes de integração da API e da aplicação.

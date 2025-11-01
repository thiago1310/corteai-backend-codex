import { BadRequestException } from '@nestjs/common';
import { AiAgentService } from './ai-agent.service';
import { ConfiguracaoAgenteEntity } from './entities/configuracao-agente.entity';
import { DEFAULT_AGENT_NAME, DEFAULT_AGENT_PROMPT } from './ai-agent.constants';
import { BarbeariaEntity } from '../barbearias/barbearias.entity';
import { ConsultarBarbeariaWebhookDto } from './dto/consultar-barbearia-webhook.dto';
import { EvolutionWebhookDto } from './dto/evolution-webhook.dto';
import { ClienteEntity } from '../clientes/clientes.entity';
import { ChatHistoryEntity } from './entities/chat-history.entity';
import { ChatStatusEntity } from './entities/chat-status.entity';
import { ConexaoEvolutionEntity } from './entities/conexao-evolution.entity';

type MockRepo<T> = {
  findOne: jest.Mock;
  create: jest.Mock;
  save: jest.Mock;
  find: jest.Mock;
  createQueryBuilder: jest.Mock;
  delete: jest.Mock;
};

const createRepo = <T>(overrides?: Partial<MockRepo<T>>): MockRepo<T> => {
  const queryBuilder = {
    where: jest.fn().mockReturnThis(),
    getOne: jest.fn(),
  };

  return {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
    delete: jest.fn(),
    ...(overrides ?? {}),
  };
};

const createService = (overrides?: {
  historicoRepo?: Partial<MockRepo<ChatHistoryEntity>>;
  clienteRepo?: Partial<MockRepo<ClienteEntity>>;
  conexaoRepo?: Partial<MockRepo<ConexaoEvolutionEntity>>;
  configuracaoRepo?: Partial<MockRepo<ConfiguracaoAgenteEntity>>;
  barbeariaRepo?: Partial<MockRepo<BarbeariaEntity>>;
  chatStatusRepo?: Partial<MockRepo<ChatStatusEntity>>;
}) => {
  const historicoRepo = createRepo<ChatHistoryEntity>(overrides?.historicoRepo);
  const clienteRepo = createRepo<ClienteEntity>(overrides?.clienteRepo);
  const mensagensRepo = createRepo<any>();
  const dadosClienteRepo = createRepo<any>();
  const conexaoRepo = createRepo<ConexaoEvolutionEntity>(overrides?.conexaoRepo);
  const configuracaoRepo = createRepo<ConfiguracaoAgenteEntity>(
    overrides?.configuracaoRepo,
  );
  const barbeariaRepo = createRepo<BarbeariaEntity>(overrides?.barbeariaRepo);
  const chatStatusRepo = createRepo<ChatStatusEntity>(overrides?.chatStatusRepo);

  const service = new AiAgentService(
    {} as any,
    {} as any,
    {} as any,
    historicoRepo as any,
    clienteRepo as any,
    mensagensRepo as any,
    dadosClienteRepo as any,
    conexaoRepo as any,
    configuracaoRepo as any,
    barbeariaRepo as any,
    chatStatusRepo as any,
  );

  return {
    service,
    historicoRepo,
    clienteRepo,
    conexaoRepo,
    configuracaoRepo,
    barbeariaRepo,
    chatStatusRepo,
  };
};

describe('AiAgentService - agent configuration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.CLIENTES_WEBHOOK_TOKEN = 'cliente-token';
  });

  it('returns saved configuration when it already exists', async () => {
    const barbeariaId = 'barb-1';
    const configuracaoExistente: ConfiguracaoAgenteEntity = {
      id: 'cfg-1',
      barbeariaId,
      nomeAgente: 'Personalizado',
      promptSistema: 'Prompt atual',
      atualizadoEm: new Date('2024-01-01T00:00:00Z'),
    };

    const { service, configuracaoRepo } = createService({
      configuracaoRepo: {
        findOne: jest.fn().mockResolvedValue(configuracaoExistente),
      },
    });

    const resultado = await service.obterConfiguracaoAgente(barbeariaId);

    expect(configuracaoRepo.create).not.toHaveBeenCalled();
    expect(configuracaoRepo.save).not.toHaveBeenCalled();
    expect(resultado).toEqual({
      id: configuracaoExistente.id,
      barbeariaId,
      nomeAgente: configuracaoExistente.nomeAgente,
      promptSistema: configuracaoExistente.promptSistema,
      atualizadoEm: configuracaoExistente.atualizadoEm,
    });
  });

  it('creates default configuration when none exists', async () => {
    const barbeariaId = 'barb-2';

    const { service, configuracaoRepo } = createService({
      configuracaoRepo: {
        findOne: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockImplementation((dados) => dados),
        save: jest
          .fn()
          .mockImplementation(async (entity) => ({
            ...entity,
            id: 'cfg-nova',
            atualizadoEm: new Date('2024-02-02T00:00:00Z'),
          })),
      },
    });

    const resultado = await service.obterConfiguracaoAgente(barbeariaId);

    expect(configuracaoRepo.create).toHaveBeenCalledWith(expect.objectContaining({ barbeariaId }));
    expect(configuracaoRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        barbeariaId,
        nomeAgente: DEFAULT_AGENT_NAME,
        promptSistema: DEFAULT_AGENT_PROMPT,
      }),
    );
    expect(resultado.nomeAgente).toBe(DEFAULT_AGENT_NAME);
  });

  it('resets configuration to default values', async () => {
    const barbeariaId = 'barb-3';
    const configuracaoExistente: ConfiguracaoAgenteEntity = {
      id: 'cfg-3',
      barbeariaId,
      nomeAgente: 'Outro nome',
      promptSistema: 'Outro prompt',
      atualizadoEm: new Date('2024-03-03T00:00:00Z'),
    };

    const { service, configuracaoRepo } = createService({
      configuracaoRepo: {
        findOne: jest.fn().mockResolvedValue(configuracaoExistente),
        save: jest.fn().mockImplementation(async (entity) => ({
          ...entity,
          atualizadoEm: new Date('2024-03-04T00:00:00Z'),
        })),
      },
    });

    const resultado = await service.resetarConfiguracaoAgente(barbeariaId);

    expect(configuracaoRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'cfg-3',
        barbeariaId,
        nomeAgente: DEFAULT_AGENT_NAME,
        promptSistema: DEFAULT_AGENT_PROMPT,
      }),
    );
    expect(resultado.promptSistema).toBe(DEFAULT_AGENT_PROMPT);
  });

  it('returns barbershop configuration via webhook', async () => {
    const barbeariaId = 'barb-1';
    const barbearia: BarbeariaEntity = {
      id: barbeariaId,
      nome: 'Barbearia Teste',
      cpfCnpj: '12345678901',
      email: 'teste@barbearia.com',
      senha: 'hashed',
      link: 'barbearia-teste',
      telefone: '11999999999',
      dataNascimento: null as unknown as Date,
      emailValidado: true,
      telefoneValidado: false,
      statusAberto: true,
      validadeLicenca: null as unknown as Date,
      cep: null as unknown as string,
      uf: null as unknown as string,
      cidade: null as unknown as string,
      bairro: null as unknown as string,
      rua: null as unknown as string,
      numero: null as unknown as string,
      profissionais: [] as any,
      servicos: [] as any,
      horarios: [] as any,
      agendamentos: [] as any,
      faqs: [] as any,
      lancamentos: [] as any,
      funcionarios: [] as any,
    };

    const configuracaoExistente: ConfiguracaoAgenteEntity = {
      id: 'cfg-7',
      barbeariaId,
      nomeAgente: 'Assistente Personalizado',
      promptSistema: 'Prompt customizado',
      atualizadoEm: new Date('2024-04-04T00:00:00Z'),
    };

    const { service, configuracaoRepo, barbeariaRepo } = createService({
      configuracaoRepo: {
        findOne: jest.fn().mockResolvedValue(configuracaoExistente),
      },
      barbeariaRepo: {
        findOne: jest.fn().mockResolvedValue(barbearia),
      },
    });

    const dto: ConsultarBarbeariaWebhookDto = {
      token: 'cliente-token',
      barbeariaId,
    };

    const resultado = await service.consultarBarbeariaViaWebhook(dto);

    expect(barbeariaRepo.findOne).toHaveBeenCalledWith({ where: { id: barbeariaId } });
    expect(resultado.configuracaoAgente.nomeAgente).toBe('Assistente Personalizado');
  });

  it('throws when webhook token is invalid', async () => {
    const { service } = createService();

    await expect(
      service.consultarBarbeariaViaWebhook({
        token: 'invalido',
        barbeariaId: 'barb-1',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});

describe('AiAgentService - evolution webhook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.CLIENTES_WEBHOOK_TOKEN = 'cliente-token';
  });

  it('rejects webhook with invalid token', async () => {
    const { service } = createService();

    const dto: EvolutionWebhookDto = {
      token: 'errado',
    };

    await expect(service.processarEvolutionWebhook(dto)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('processes message webhook creating client and history', async () => {
    const barbeariaId = 'barb-1';
    const conexao: ConexaoEvolutionEntity = {
      id: 'cx-1',
      barbeariaId,
      instanceName: 'INST001',
      status: 'connected',
    } as ConexaoEvolutionEntity;

    const { service, conexaoRepo, clienteRepo, historicoRepo, chatStatusRepo } = createService({
      conexaoRepo: {
        findOne: jest.fn().mockResolvedValueOnce(conexao),
      },
      clienteRepo: {
        findOne: jest.fn().mockResolvedValueOnce(null),
        create: jest.fn().mockImplementation((dados) => dados),
        save: jest.fn().mockImplementation(async (entity) => ({
          ...entity,
          id: 'cliente-1',
        })),
      },
      historicoRepo: {
        findOne: jest.fn().mockResolvedValueOnce(null),
        create: jest.fn().mockImplementation((dados) => dados),
        save: jest.fn().mockImplementation(async (entity) => ({
          ...entity,
          id: 'hist-1',
          createdAt: new Date('2024-01-01T10:00:00Z'),
        })),
        find: jest.fn().mockResolvedValue([{
          messageId: 'msg-123',
          role: 'user',
          content: 'Funciona ?',
          createdAt: new Date('2024-01-01T10:00:00Z'),
        }]),
      },
      chatStatusRepo: {
        findOne: jest.fn().mockResolvedValueOnce(null),
        create: jest.fn().mockImplementation((dados) => dados),
        save: jest.fn().mockImplementation(async (entity) => ({
          ...entity,
          status: 1,
        })),
      },
    });

    const dto: EvolutionWebhookDto = {
      token: 'cliente-token',
      message: {
        chat_id: '5511999999999',
        content_type: 'text',
        content: 'Funciona ?',
        timestamp: '2024-05-05T10:00:00Z',
        event: 'incoming',
      },
      body: {
        event: 'messages.upsert',
        Telefone: '+55 11 99999-9999',
        NomeWhatsapp: 'Joao',
        Instance: 'INST001',
        messageId: 'msg-123',
      },
    };

    const resultado = await service.processarEvolutionWebhook(dto);

    expect(conexaoRepo.findOne).toHaveBeenCalled();
    expect(clienteRepo.save).toHaveBeenCalled();
    expect(historicoRepo.save).toHaveBeenCalled();
    expect(chatStatusRepo.save).toHaveBeenCalled();
    expect(resultado.cliente?.id).toBe('cliente-1');
    expect(resultado.mensagem?.conteudo).toBe('Funciona ?');
    expect(resultado.direcao).toBe('entrando');
    expect(resultado.historico).toHaveLength(1);
  });

  it('updates connection status on connection.update events', async () => {
    const barbeariaId = 'barb-2';
    const conexao: ConexaoEvolutionEntity = {
      id: 'cx-2',
      barbeariaId,
      instanceName: 'INST002',
      status: 'connecting',
    } as ConexaoEvolutionEntity;

    const clienteExistente: ClienteEntity = {
      id: 'cliente-2',
      barbeariaId,
      telefone: '+5511988887777',
      nome: 'Cliente',
      email: null,
      cpf: null,
      dataCadastro: new Date(),
      dataAniversario: null,
    } as ClienteEntity;

    const { service, conexaoRepo, clienteRepo, historicoRepo, chatStatusRepo } = createService({
      conexaoRepo: {
        findOne: jest.fn().mockResolvedValueOnce(conexao),
        save: jest.fn().mockImplementation(async (entity) => entity),
      },
      clienteRepo: {
        findOne: jest.fn().mockResolvedValueOnce(clienteExistente),
        save: jest.fn().mockImplementation(async (entity) => entity),
      },
      historicoRepo: {
        findOne: jest.fn().mockResolvedValueOnce(null),
        create: jest.fn(),
        save: jest.fn(),
        find: jest.fn().mockResolvedValue([]),
      },
      chatStatusRepo: {
        findOne: jest.fn().mockResolvedValueOnce({
          id: 'status-1',
          clienteId: 'cliente-2',
          status: 1,
          metadados: null,
        } as ChatStatusEntity),
        save: jest.fn().mockImplementation(async (entity) => entity),
      },
    });

    const dto: EvolutionWebhookDto = {
      token: 'cliente-token',
      body: {
        event: 'connection.update',
        Instance: 'INST002',
        Telefone: '+55 11 88888-7777',
        data: {
          state: 'open',
        },
      },
    };

    const resultado = await service.processarEvolutionWebhook(dto);

    expect(conexaoRepo.save).toHaveBeenCalledWith(expect.objectContaining({ status: 'open' }));
    expect(resultado.statusConexao).toBe('open');
  });
});

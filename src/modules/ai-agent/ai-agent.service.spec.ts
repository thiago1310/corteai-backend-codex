import { BadRequestException } from '@nestjs/common';
import { AiAgentService } from './ai-agent.service';
import { ConfiguracaoAgenteEntity } from './entities/configuracao-agente.entity';
import { DEFAULT_AGENT_NAME, DEFAULT_AGENT_PROMPT } from './ai-agent.constants';
import { BarbeariaEntity } from '../barbearias/barbearias.entity';
import { ConsultarBarbeariaWebhookDto } from './dto/consultar-barbearia-webhook.dto';

type MockRepo<T> = {
  findOne: jest.Mock;
  create: jest.Mock;
  save: jest.Mock;
};

type MockBarbeariaRepo = {
  findOne: jest.Mock;
};

const criarServico = (overrides?: {
  configuracaoRepo?: Partial<MockRepo<ConfiguracaoAgenteEntity>>;
  barbeariaRepo?: Partial<MockBarbeariaRepo>;
}) => {
  const configuracaoRepo: MockRepo<ConfiguracaoAgenteEntity> = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    ...(overrides?.configuracaoRepo ?? {}),
  };

  const barbeariaRepo: MockBarbeariaRepo = {
    findOne: jest.fn(),
    ...(overrides?.barbeariaRepo ?? {}),
  };

  const service = new AiAgentService(
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    configuracaoRepo as any,
    barbeariaRepo as any,
    {} as any,
  );

  return { service, configuracaoRepo, barbeariaRepo };
};

describe('AiAgentService - configuração do agente', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.CLIENTES_WEBHOOK_TOKEN = 'cliente-token';
  });

  it('retorna a configuração existente sem recriar', async () => {
    const barbeariaId = 'barb-1';
    const configuracaoExistente: ConfiguracaoAgenteEntity = {
      id: 'cfg-1',
      barbeariaId,
      nomeAgente: 'Personalizado',
      promptSistema: 'Prompt atual',
      atualizadoEm: new Date('2024-01-01T00:00:00Z'),
    };
    const { service, configuracaoRepo } = criarServico();
    configuracaoRepo.findOne.mockResolvedValue(configuracaoExistente);

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

  it('cria configuração default quando inexistente', async () => {
    const barbeariaId = 'barb-2';
    const { service, configuracaoRepo } = criarServico();

    configuracaoRepo.findOne.mockResolvedValue(null);
    const novaEntidade: Partial<ConfiguracaoAgenteEntity> = { barbeariaId };
    configuracaoRepo.create.mockReturnValue(novaEntidade);
    configuracaoRepo.save.mockImplementation(async (entity) => ({
      ...entity,
      id: 'cfg-nova',
      atualizadoEm: new Date('2024-02-02T00:00:00Z'),
    }));

    const resultado = await service.obterConfiguracaoAgente(barbeariaId);

    expect(configuracaoRepo.create).toHaveBeenCalledWith({ barbeariaId });
    expect(configuracaoRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        barbeariaId,
        nomeAgente: DEFAULT_AGENT_NAME,
        promptSistema: DEFAULT_AGENT_PROMPT,
      }),
    );
    expect(resultado).toEqual({
      id: 'cfg-nova',
      barbeariaId,
      nomeAgente: DEFAULT_AGENT_NAME,
      promptSistema: DEFAULT_AGENT_PROMPT,
      atualizadoEm: expect.any(Date),
    });
  });

  it('reseta a configuração para os valores padrão', async () => {
    const barbeariaId = 'barb-3';
    const configuracaoExistente: ConfiguracaoAgenteEntity = {
      id: 'cfg-3',
      barbeariaId,
      nomeAgente: 'Outro nome',
      promptSistema: 'Outro prompt',
      atualizadoEm: new Date('2024-03-03T00:00:00Z'),
    };
    const { service, configuracaoRepo } = criarServico();

    configuracaoRepo.findOne.mockResolvedValue(configuracaoExistente);
    configuracaoRepo.save.mockImplementation(async (entity) => ({
      ...entity,
      atualizadoEm: new Date('2024-03-04T00:00:00Z'),
    }));

    const resultado = await service.resetarConfiguracaoAgente(barbeariaId);

    expect(configuracaoRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'cfg-3',
        barbeariaId,
        nomeAgente: DEFAULT_AGENT_NAME,
        promptSistema: DEFAULT_AGENT_PROMPT,
      }),
    );
    expect(resultado.nomeAgente).toBe(DEFAULT_AGENT_NAME);
    expect(resultado.promptSistema).toBe(DEFAULT_AGENT_PROMPT);
  });

  it('consulta barbearia via webhook retornando dados da configuração', async () => {
    const barbeariaId = '4c6c5d6e-45f8-4d14-b0f3-72a8b4b1b8b5';
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

    const { service, configuracaoRepo, barbeariaRepo } = criarServico();
    barbeariaRepo.findOne.mockResolvedValue(barbearia);
    configuracaoRepo.findOne.mockResolvedValue(configuracaoExistente);

    const dto: ConsultarBarbeariaWebhookDto = {
      token: 'cliente-token',
      barbeariaId,
    };

    const resultado = await service.consultarBarbeariaViaWebhook(dto);

    expect(barbeariaRepo.findOne).toHaveBeenCalledWith({ where: { id: barbeariaId } });
    expect(resultado).toEqual({
      barbearia: {
        id: barbearia.id,
        nome: barbearia.nome,
        telefone: barbearia.telefone,
        link: barbearia.link,
        statusAberto: barbearia.statusAberto,
      },
      configuracaoAgente: {
        id: configuracaoExistente.id,
        barbeariaId,
        nomeAgente: configuracaoExistente.nomeAgente,
        promptSistema: configuracaoExistente.promptSistema,
        atualizadoEm: configuracaoExistente.atualizadoEm,
      },
    });
  });

  it('bloqueia consulta via webhook com token inválido', async () => {
    const { service } = criarServico();
    const dto: ConsultarBarbeariaWebhookDto = {
      token: 'invalido',
      barbeariaId: '4c6c5d6e-45f8-4d14-b0f3-72a8b4b1b8b5',
    };

    await expect(service.consultarBarbeariaViaWebhook(dto)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('bloqueia consulta via webhook para barbearia inexistente', async () => {
    const { service, barbeariaRepo } = criarServico();
    barbeariaRepo.findOne.mockResolvedValue(null);

    const dto: ConsultarBarbeariaWebhookDto = {
      token: 'cliente-token',
      barbeariaId: '4c6c5d6e-45f8-4d14-b0f3-72a8b4b1b8b5',
    };

    await expect(service.consultarBarbeariaViaWebhook(dto)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});


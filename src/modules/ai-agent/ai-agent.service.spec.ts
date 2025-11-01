import { AiAgentService } from './ai-agent.service';
import { ConfiguracaoAgenteEntity } from './entities/configuracao-agente.entity';
import { DEFAULT_AGENT_NAME, DEFAULT_AGENT_PROMPT } from './ai-agent.constants';

type MockRepo<T> = {
  findOne: jest.Mock;
  create: jest.Mock;
  save: jest.Mock;
};

const criarServico = (repoOverrides?: Partial<MockRepo<ConfiguracaoAgenteEntity>>) => {
  const configuracaoRepo: MockRepo<ConfiguracaoAgenteEntity> = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    ...repoOverrides,
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
    {} as any,
    {} as any,
  );

  return { service, configuracaoRepo };
};

describe('AiAgentService - configuração do agente', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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
});


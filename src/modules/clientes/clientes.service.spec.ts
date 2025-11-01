import { BadRequestException } from '@nestjs/common';
import { ClientesService } from './clientes.service';
import { ClienteEntity } from './clientes.entity';
import { ConexaoEvolutionEntity } from '../ai-agent/entities/conexao-evolution.entity';
import { ChatHistoryEntity } from '../ai-agent/entities/chat-history.entity';
import { SincronizarClienteEvolutionDto } from './dto/sincronizar-cliente-evolution.dto';

type MockRepo<T> = {
  findOne: jest.Mock;
  create: jest.Mock;
  save: jest.Mock;
  find: jest.Mock;
  delete: jest.Mock;
  createQueryBuilder: jest.Mock;
};

const criarMockRepo = <T>(overrides?: Partial<MockRepo<T>>): MockRepo<T> => {
  const queryBuilder = {
    where: jest.fn().mockReturnThis(),
    getOne: jest.fn(),
  };

  return {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    delete: jest.fn(),
    createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
    ...overrides,
  };
};

const criarService = (overrides?: {
  clientesRepo?: Partial<MockRepo<ClienteEntity>>;
  conexoesRepo?: Partial<MockRepo<ConexaoEvolutionEntity>>;
  chatHistoryRepo?: Partial<MockRepo<ChatHistoryEntity>>;
}) => {
  const clientesRepo = criarMockRepo<ClienteEntity>(overrides?.clientesRepo);
  const conexoesRepo = criarMockRepo<ConexaoEvolutionEntity>(overrides?.conexoesRepo);
  const chatHistoryRepo = criarMockRepo<ChatHistoryEntity>(overrides?.chatHistoryRepo);

  const service = new ClientesService(
    clientesRepo as any,
    conexoesRepo as any,
    chatHistoryRepo as any,
  );

  return { service, clientesRepo, conexoesRepo, chatHistoryRepo };
};

describe('ClientesService - sincronizarComEvolution', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.CLIENTES_WEBHOOK_TOKEN = 'token-teste';
  });

  it('resolve telefone via messageId quando telefone nao e informado', async () => {
    const { service, clientesRepo, conexoesRepo, chatHistoryRepo } = criarService();

    conexoesRepo.findOne.mockResolvedValue({
      id: 'conexao-1',
      barbeariaId: 'barb-1',
      instanceName: 'inst1',
    });

    const chatRegistro: Partial<ChatHistoryEntity> = {
      messageId: 'msg-123',
      telefoneCliente: '+55 11 98888-2222',
      barbeariaId: 'barb-1',
      role: 'user',
      content: 'oi',
      createdAt: new Date('2024-05-05T10:00:00Z'),
    };

    chatHistoryRepo.findOne.mockResolvedValue(chatRegistro);
    chatHistoryRepo.find.mockResolvedValue([
      chatRegistro,
      {
        ...chatRegistro,
        createdAt: new Date('2024-05-05T11:00:00Z'),
        role: 'assistant',
        content: 'resposta',
      },
    ]);

    clientesRepo.findOne.mockResolvedValue(null);
    clientesRepo.create.mockImplementation((dados) => dados);
    clientesRepo.save.mockImplementation(async (cliente) => ({
      id: 'cliente-1',
      ...cliente,
    }));

    const dto: SincronizarClienteEvolutionDto = {
      token: 'token-teste',
      instanceName: 'inst1',
      messageId: 'msg-123',
    };

    const resultado = await service.sincronizarComEvolution(dto);

    expect(chatHistoryRepo.findOne).toHaveBeenCalledWith({
      where: { messageId: 'msg-123', barbeariaId: 'barb-1' },
      order: { createdAt: 'DESC' },
    });
    expect(clientesRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({ telefone: '+551198888-2222' }),
    );
    expect(resultado.cliente.telefone).toBe('+551198888-2222');
    expect(resultado.historico).toHaveLength(2);
  });

  it('lanca erro quando messageId nao retorna telefone', async () => {
    const { service, conexoesRepo, chatHistoryRepo } = criarService();

    conexoesRepo.findOne.mockResolvedValue({
      id: 'conexao-1',
      barbeariaId: 'barb-1',
      instanceName: 'inst1',
    });

    chatHistoryRepo.findOne.mockResolvedValue(null);

    const dto: SincronizarClienteEvolutionDto = {
      token: 'token-teste',
      instanceName: 'inst1',
      messageId: 'msg-inexistente',
    };

    await expect(service.sincronizarComEvolution(dto)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});

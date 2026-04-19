import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { ClientesService } from '../clientes/clientes.service';

export type AuthScope = 'cliente';

export interface LoginDto {
  email: string;
  senha: string;
}

export type PasswordChangeScope = 'cliente';

export interface ChangePasswordDto {
  id: string;
  senhaAtual: string;
  novaSenha: string;
  scope: PasswordChangeScope;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly jwt: JwtService,
    private readonly clientes: ClientesService,
  ) {}

  async validateCliente(email: string, senha: string) {
    const cliente = await this.clientes.findByEmail(email);
    if (!cliente) return null;
    const ok = await bcrypt.compare(senha, cliente.senhaHash);
    return ok ? cliente : null;
  }

  async login(dto: LoginDto) {
    const cliente = await this.validateCliente(dto.email, dto.senha);
    if (!cliente) throw new UnauthorizedException('Credenciais invalidas');
    const payload = { sub: cliente.id, scope: 'cliente' as AuthScope, email: cliente.email };
    const access_token = await this.jwt.signAsync(payload);
    return { access_token };
  }

  async changePassword(dto: ChangePasswordDto) {
    if (dto.scope === 'cliente') {
      await this.clientes.updatePassword(dto.id, dto.senhaAtual, dto.novaSenha);
      return { success: true };
    }

    throw new BadRequestException('Scope invalido');
  }
}

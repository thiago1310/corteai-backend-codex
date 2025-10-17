import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsuariosService } from '../usuarios/usuarios.service';
import { BarbeariasService } from '../barbearias/barbearias.service';
import { ProfissionaisService } from '../profissionais/profissionais.service';

export type AuthScope = 'usuario' | 'barbearia';

export interface LoginDto {
  email: string;
  senha: string;
  scope?: AuthScope;
}

export type PasswordChangeScope = 'barbearia' | 'profissional';

export interface ChangePasswordDto {
  id: string;
  novaSenha: string;
  scope: PasswordChangeScope;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly jwt: JwtService,
    private readonly usuarios: UsuariosService,
    private readonly barbearias: BarbeariasService,
    private readonly profissionais: ProfissionaisService,
  ) {}

  async validateUsuario(email: string, senha: string) {
    const user = await this.usuarios.findByEmail(email);
    if (!user) return null;
    const ok = await bcrypt.compare(senha, user.senha);
    return ok ? user : null;
  }

  async validateBarbearia(email: string, senha: string) {
    const barb = await this.barbearias.findByEmail(email);
    if (!barb) return null;
    const ok = await bcrypt.compare(senha, barb.senha);
    return ok ? barb : null;
  }

  async login(dto: LoginDto) {
    const scope = dto.scope ?? 'usuario';
    if (scope === 'barbearia') {
      const barb = await this.validateBarbearia(dto.email, dto.senha);
      if (!barb) throw new UnauthorizedException('Credenciais invalidas');
      const payload = { sub: barb.id, scope: 'barbearia', email: barb.email };
      const access_token = await this.jwt.signAsync(payload);
      return { access_token };
    }
    const user = await this.validateUsuario(dto.email, dto.senha);
    if (!user) throw new UnauthorizedException('Credenciais invalidas');
    const payload = { sub: user.id, scope: 'usuario', email: user.email };
    const access_token = await this.jwt.signAsync(payload);
    return { access_token };
  }

  async changePassword(dto: ChangePasswordDto) {
    if (dto.scope === 'barbearia') {
      await this.barbearias.updatePassword(dto.id, dto.novaSenha);
      return { success: true };
    }

    if (dto.scope === 'profissional') {
      await this.profissionais.updatePassword(dto.id, dto.novaSenha);
      return { success: true };
    }

    throw new BadRequestException('Scope invalido');
  }
}

import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsuariosService } from '../usuarios/usuarios.service';
import { BarbeariasService } from '../barbearias/barbearias.service';

export type AuthScope = 'usuario' | 'barbearia';

export interface LoginDto {
  email: string;
  senha: string;
  scope?: AuthScope;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly jwt: JwtService,
    private readonly usuarios: UsuariosService,
    private readonly barbearias: BarbeariasService,
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
      if (!barb) throw new UnauthorizedException('Credenciais inválidas');
      const payload = { sub: barb.id, scope: 'barbearia', email: barb.email };
      const access_token = await this.jwt.signAsync(payload);
      return { access_token };
    }
    const user = await this.validateUsuario(dto.email, dto.senha);
    if (!user) throw new UnauthorizedException('Credenciais inválidas');
    const payload = { sub: user.id, scope: 'usuario', email: user.email };
    const access_token = await this.jwt.signAsync(payload);
    return { access_token };
  }
}

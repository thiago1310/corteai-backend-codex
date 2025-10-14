import { Body, Controller, Post } from '@nestjs/common';
import { AuthService, LoginDto } from './auth.service';
import { UsuariosService, CreateUsuarioDto } from '../usuarios/usuarios.service';
import { BarbeariasService, CreateBarbeariaDto } from '../barbearias/barbearias.service';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly usuarios: UsuariosService,
    private readonly barbearias: BarbeariasService,
  ) {}

  @Post('login')
  login(@Body() body: LoginDto) {
    return this.auth.login(body);
  }

  @Post('register/usuario')
  registerUsuario(@Body() body: CreateUsuarioDto) {
    return this.usuarios.create(body);
  }

  @Post('register/barbearia')
  registerBarbearia(@Body() body: CreateBarbeariaDto) {
    return this.barbearias.create(body);
  }
}

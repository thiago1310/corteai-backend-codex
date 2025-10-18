import { Body, Controller, Patch, Post } from '@nestjs/common';
import { IsIn, IsString, MinLength } from 'class-validator';
import { AuthService, ChangePasswordDto, LoginDto, PasswordChangeScope } from './auth.service';
import { UsuariosService, CreateUsuarioDto } from '../usuarios/usuarios.service';
import { BarbeariasService } from '../barbearias/barbearias.service';
import { CreateBarbeariaDTO } from '../barbearias/barbearia.dto';

class ChangePasswordBody implements ChangePasswordDto {
  @IsString()
  id!: string;

  @IsString()
  @MinLength(6)
  senhaAtual!: string;

  @IsString()
  @MinLength(6)
  novaSenha!: string;

  @IsIn(['barbearia', 'profissional'])
  scope!: PasswordChangeScope;
}

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
  registerBarbearia(@Body() body: CreateBarbeariaDTO) {
    return this.barbearias.create(body);
  }

  @Patch('password')
  changePassword(@Body() body: ChangePasswordBody) {
    return this.auth.changePassword(body);
  }
}

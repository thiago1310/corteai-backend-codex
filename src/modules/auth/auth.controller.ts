import { Body, Controller, Patch, Post } from '@nestjs/common';
import { IsIn, IsString, MinLength } from 'class-validator';
import { AuthService, ChangePasswordDto, LoginDto, PasswordChangeScope } from './auth.service';
import { ClientesService } from '../clientes/clientes.service';
import { CreateClienteDto } from '../clientes/dto/create-cliente.dto';

class ChangePasswordBody implements ChangePasswordDto {
  @IsString()
  id!: string;

  @IsString()
  @MinLength(6)
  senhaAtual!: string;

  @IsString()
  @MinLength(6)
  novaSenha!: string;

  @IsIn(['cliente'])
  scope!: PasswordChangeScope;
}

@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly clientes: ClientesService,
  ) {}

  @Post('login')
  login(@Body() body: LoginDto) {
    return this.auth.login(body);
  }

  @Post('register/cliente')
  registerCliente(@Body() body: CreateClienteDto) {
    return this.clientes.create(body);
  }

  @Patch('password')
  changePassword(@Body() body: ChangePasswordBody) {
    return this.auth.changePassword(body);
  }
}

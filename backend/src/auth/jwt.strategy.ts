
import {
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../prisma/prisma.service.js';
import { getJwtSecret } from './auth.config.js';

interface JwtPayload {
  sub: string;
  jti: string;
  sv?: number;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(private readonly prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: getJwtSecret(),
      issuer: 'nexora-api',
      audience: 'nexora-web',
      algorithms: ['HS256'],
    });
  }

  async validate(payload: JwtPayload) {
    if (
      !payload ||
      typeof payload.sub !== 'string' ||
      typeof payload.jti !== 'string'
    ) {
      throw new UnauthorizedException();
    }

    // Previously issued tokens belong to the initial session version.
    const tokenVersion = payload.sv === undefined ? 0 : payload.sv;

    if (
      !Number.isSafeInteger(tokenVersion) ||
      tokenVersion < 0
    ) {
      throw new UnauthorizedException();
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: { role: true },
    });

    if (
      !user ||
      user.status !== 'ACTIVE' ||
      user.mustChangePassword ||
      user.sessionVersion !== tokenVersion
    ) {
      throw new UnauthorizedException();
    }

    return {
      id: user.id,
      email: user.email,
      role: user.role.name,
    };
  }
}

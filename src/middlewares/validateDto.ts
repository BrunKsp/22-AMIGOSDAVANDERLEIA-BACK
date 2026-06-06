import { Request, Response, NextFunction } from "express";
import { plainToInstance } from "class-transformer";
import { validate, ValidationError } from "class-validator";

type ClassConstructor<T> = new (...args: any[]) => T;

function formatErrors(errors: ValidationError[]): Record<string, string[]> {
  return errors.reduce<Record<string, string[]>>((acc, err) => {
    acc[err.property] = Object.values(err.constraints ?? {});
    return acc;
  }, {});
}

export function validateDto<T extends object>(DtoClass: ClassConstructor<T>) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const instance = plainToInstance(DtoClass, req.body);
    const errors = await validate(instance, { whitelist: true, forbidNonWhitelisted: true });

    if (errors.length > 0) {
      res.status(422).json({
        message: "Erro de validação",
        errors: formatErrors(errors),
      });
      return;
    }

    req.body = instance;
    next();
  };
}

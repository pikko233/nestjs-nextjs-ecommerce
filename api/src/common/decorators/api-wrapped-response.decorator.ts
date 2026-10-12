import { applyDecorators, HttpStatus, Type } from '@nestjs/common';
import { ApiExtraModels, ApiResponse, getSchemaPath } from '@nestjs/swagger';
import { ApiResponseDto } from '../dto/api-response.dto.js';

interface ApiWrappedResponseOptions {
  status?: HttpStatus;
  description?: string;
  isArray?: boolean;
  nullable?: boolean;
}

// 泛型在运行时会被擦除，这里用 allOf 把 data 的真实结构拼进 ApiResponseDto
export const ApiWrappedResponse = <TModel extends Type<unknown>>(
  model: TModel,
  {
    status = HttpStatus.OK,
    description,
    isArray = false,
    nullable = false,
  }: ApiWrappedResponseOptions = {},
) => {
  const ref = { $ref: getSchemaPath(model) };
  const data = isArray
    ? { type: 'array', items: ref }
    : nullable
      ? { oneOf: [ref], nullable: true }
      : ref;

  return applyDecorators(
    ApiExtraModels(ApiResponseDto, model),
    ApiResponse({
      status,
      description,
      schema: {
        allOf: [
          { $ref: getSchemaPath(ApiResponseDto) },
          { properties: { data }, required: ['data'] },
        ],
      },
    }),
  );
};

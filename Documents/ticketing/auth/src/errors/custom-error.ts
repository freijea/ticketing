export abstract class CustomError extends Error {
  // Define os requerimentos que uma subclasse de uma classe deverá seguir a cada vez que extender o objeto principal.
  abstract statusCode: number;

  constructor(message: string) {
    super();
    Object.setPrototypeOf(this, CustomError.prototype);
  }

  abstract serializeErrors(): { message: string, field?: string } []

  // ? é um parâmetro opcional
  // [] no final é que precisa ser uma array com os objetos especificados

};
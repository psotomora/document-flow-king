import { test } from "node:test";
import assert from "node:assert/strict";
import { ErrorApi } from "./api";
import { esSesionEnUso } from "./sesion-unica";

test("un rechazo 409 del ingreso es una sesión en uso", () => {
  assert.equal(esSesionEnUso(new ErrorApi("en uso", 409)), true);
});

test("credenciales incorrectas no se tratan como sesión en uso", () => {
  assert.equal(esSesionEnUso(new ErrorApi("incorrecto", 401)), false);
});

import { test } from "node:test";
import assert from "node:assert/strict";
const err = (estado: number) => Object.assign(new Error("x"), { estado });
import { esSesionEnUso } from "./sesion-unica";

test("un rechazo 409 del ingreso es una sesión en uso", () => {
  assert.equal(esSesionEnUso(err(409)), true);
});

test("credenciales incorrectas no se tratan como sesión en uso", () => {
  assert.equal(esSesionEnUso(err(401)), false);
});

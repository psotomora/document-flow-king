import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

const source = readFileSync(new URL("../api/FlujoEfectivo.Api/Datos/Softland.cs", import.meta.url), "utf8");

for (const [catalogo, alias, filtro] of [
  ["CLIENTE", "f", "filtroCliente"],
  ["PROVEEDOR", "d", "filtroProveedor"],
]) {
  test(`${catalogo}: solo ACTIVO S, sin cruzar compañías con el mismo código`, () => {
    // Ejecuta el predicado literal de producción, no una copia de su lógica.
    const predicate = source.match(new RegExp(`var ${filtro} = [\\s\\S]*?\\? \\$"([^"\\n]+)"`))?.[1];
    assert.ok(predicate, "Debe existir el filtro productivo");
    const result = spawnSync("python3", ["-c", `
import json, sqlite3, sys
table, alias, predicate = json.loads(sys.argv[1])
db = sqlite3.connect(':memory:')
for company in ['empresa1', 'empresa2']:
    db.execute(f"ATTACH DATABASE ':memory:' AS [{company}]")
    db.execute(f'CREATE TABLE [{company}].[{table}] ([{table}] TEXT, ACTIVO TEXT)')
    db.execute(f'CREATE TABLE [{company}].[DOCUMENTOS] ([{table}] TEXT)')
    rows = [('activo', 'S'), ('inactivo', 'N'), ('otro', 'I'), ('cero', '0'), ('vacio', ''), ('nulo', None), ('compartido', 'S' if company == 'empresa1' else 'N')]
    db.executemany(f'INSERT INTO [{company}].[{table}] VALUES (?, ?)', rows)
    db.executemany(f'INSERT INTO [{company}].[DOCUMENTOS] VALUES (?)', [(code,) for code, _ in rows] + [('sin_catalogo',)])
output = {}
for company in ['empresa1', 'empresa2']:
    condition = predicate.replace('{e}', company)
    output[company] = [row[0] for row in db.execute(f'SELECT {alias}.[{table}] FROM [{company}].[DOCUMENTOS] {alias} WHERE 1=1 {condition} ORDER BY 1')]
print(json.dumps(output))
`, JSON.stringify([catalogo, alias, predicate])], { encoding: "utf8" });
    assert.equal(result.status, 0, result.stderr);
    assert.deepEqual(JSON.parse(result.stdout), {
      empresa1: ["activo", "compartido"],
      empresa2: ["activo"],
    });
  });
}

test("agente compila el mismo origen Softland que la API sin configuración SaaS", () => {
  const project = readFileSync(new URL("../agente/AplixCashFlowAgente/AplixCashFlowAgente.csproj", import.meta.url), "utf8");
  assert.match(project, /Compile Include="\.\.\/\.\.\/api\/FlujoEfectivo.Api\/Datos\/Softland.cs"/);
  assert.doesNotMatch(source, /\bSaas\./);
});
const { execSync } = require("child_process");

const name = process.argv[2];
if (!name) {
  console.error("Uso: yarn migration:generate <NomeDaMigration>");
  process.exit(1);
}

const path = `src/data/migrations/${name}`;
const cmd = `npx typeorm-ts-node-commonjs migration:generate ${path} -d src/config/dataSourceCli.ts`;

console.log(`Executando: ${cmd}\n`);
execSync(cmd, { stdio: "inherit" });

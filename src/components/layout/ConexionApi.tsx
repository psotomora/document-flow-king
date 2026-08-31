import { Database, HardDrive } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { configurarUrlApi, urlApi } from "@/lib/api";
import { useApp } from "@/contexto/AppContexto";

/**
 * Indicador del origen de datos (modo demo en memoria vs API .NET + SQL Server)
 * con un diálogo para configurar la URL de la API en tiempo de ejecución.
 */
export function ConexionApi() {
  const { modoApi } = useApp();
  const [abierto, setAbierto] = useState(false);
  const [url, setUrl] = useState("");

  useEffect(() => {
    setUrl(urlApi());
  }, [abierto]);

  const guardar = () => {
    configurarUrlApi(url);
    window.location.reload();
  };

  return (
    <Dialog open={abierto} onOpenChange={setAbierto}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-8 gap-1.5"
          title="Configurar conexión a SQL Server"
        >
          {modoApi ? (
            <Database className="size-4 text-success" />
          ) : (
            <HardDrive className="size-4 text-muted-foreground" />
          )}
          <span className="hidden text-xs sm:inline">
            {modoApi ? "SQL Server" : "Datos de prueba"}
          </span>
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Origen de datos</DialogTitle>
          <DialogDescription>
            Sin URL configurada la aplicación usa datos de prueba en memoria. Indique la URL de
            la API .NET para trabajar contra SQL Server.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="url-api">URL de la API</Label>
          <Input
            id="url-api"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="http://localhost:5000/api"
            autoComplete="off"
          />
          <p className="text-xs text-muted-foreground">
            También puede fijarla de forma permanente creando un archivo <code>.env</code> con
            <code> VITE_API_URL=http://localhost:5000/api</code>.
          </p>
        </div>
        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => {
              configurarUrlApi("");
              window.location.reload();
            }}
          >
            Usar datos de prueba
          </Button>
          <Button onClick={guardar} disabled={!url.trim()}>
            Conectar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

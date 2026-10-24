import { Database, HardDrive, Loader2 } from "lucide-react";
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
import { configurarUrlApi, probarConexionApi, urlApi } from "@/lib/api";
import { useApp } from "@/contexto/AppContexto";
import { toast } from "sonner";

/**
 * Indicador del origen de datos (modo demo en memoria vs API .NET + SQL Server)
 * con configuración técnica disponible únicamente en desarrollo.
 */
export function ConexionApi() {
  const { modoApi } = useApp();
  const [abierto, setAbierto] = useState(false);
  const [url, setUrl] = useState("");
  const [probando, setProbando] = useState(false);

  useEffect(() => {
    setUrl(urlApi());
  }, [abierto]);

  const guardar = async () => {
    setProbando(true);
    try {
      const urlValidada = await probarConexionApi(url);
      configurarUrlApi(urlValidada);
      window.location.reload();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No fue posible validar la conexión");
    } finally {
      setProbando(false);
    }
  };

  if (!import.meta.env.DEV) return null;

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
            La conexión usa /api del mismo dominio por defecto. Puede indicar una dirección
            alternativa para su entorno de desarrollo.
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
            Usar conexión automática
          </Button>
          <Button onClick={guardar} disabled={!url.trim() || probando}>
            {probando && <Loader2 className="size-4 animate-spin" aria-hidden />}
            {probando ? "Comprobando" : "Conectar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { EncabezadoPagina } from "@/components/comunes/EncabezadoPagina";
import { TarjetaLicencia } from "@/components/parametros/TarjetaLicencia";

export const Route = createFileRoute("/licencia")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { title: "Licencia | Aplix Cash Flow Insights" },
      { name: "description", content: "Estado, vigencia y activación de la licencia de Aplix Cash Flow Insights." },
      { property: "og:title", content: "Licencia | Aplix Cash Flow Insights" },
      { property: "og:description", content: "Consulte y active la licencia del producto." },
    ],
  }),
  component: PaginaLicencia,
});

function PaginaLicencia() {
  return (
    <div className="space-y-6">
      <EncabezadoPagina titulo="Licencia" descripcion="Estado, huella del servidor y carga del archivo de licencia." />
      <TarjetaLicencia />
    </div>
  );
}

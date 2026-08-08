import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Términos y Condiciones | RifandoMas',
  description:
    'Lee los Términos y Condiciones de uso de la plataforma RifandoMas. Conoce tus derechos y obligaciones al participar en sorteos.',
}

const LAST_UPDATED = '8 de junio de 2025'

function Section({
  id,
  number,
  title,
  children,
}: {
  id: string
  number: string
  title: string
  children: React.ReactNode
}) {
  return (
    <section id={id} className="scroll-mt-24">
      <h2
        className="font-title text-xl text-white mb-4 flex items-baseline gap-3"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: 10 }}
      >
        <span
          className="font-ui text-sm font-bold px-2 py-0.5 rounded-md flex-shrink-0"
          style={{ background: '#0C9646', color: '#fff' }}
        >
          {number}
        </span>
        {title}
      </h2>
      <div className="space-y-3 text-sm font-body leading-relaxed text-brand-muted">{children}</div>
    </section>
  )
}

function P({ children }: { children: React.ReactNode }) {
  return <p>{children}</p>
}

function Ol({ children }: { children: React.ReactNode }) {
  return <ol className="list-decimal list-outside ml-5 space-y-2">{children}</ol>
}

function Ul({ children }: { children: React.ReactNode }) {
  return <ul className="list-disc list-outside ml-5 space-y-1.5">{children}</ul>
}

function Li({ children }: { children: React.ReactNode }) {
  return <li>{children}</li>
}

function Dt({ children }: { children: React.ReactNode }) {
  return (
    <dt className="font-semibold text-white mt-3 first:mt-0">{children}</dt>
  )
}

function Dd({ children }: { children: React.ReactNode }) {
  return <dd className="ml-4">{children}</dd>
}

const TOC = [
  { id: 'generalidades', n: '01', label: 'Generalidades' },
  { id: 'definiciones', n: '02', label: 'Definiciones' },
  { id: 'registro', n: '03', label: 'Registro y Cuenta' },
  { id: 'servicio', n: '04', label: 'Funcionamiento del Servicio' },
  { id: 'compra', n: '05', label: 'Compra de Boletos' },
  { id: 'precios', n: '06', label: 'Precios y Pagos' },
  { id: 'cancelaciones', n: '07', label: 'Cancelaciones y Reembolsos' },
  { id: 'sorteo', n: '08', label: 'Realización del Sorteo' },
  { id: 'prohibiciones', n: '09', label: 'Prohibiciones' },
  { id: 'propiedad', n: '10', label: 'Propiedad Intelectual' },
  { id: 'responsabilidad', n: '11', label: 'Responsabilidad y Limitaciones' },
  { id: 'datos', n: '12', label: 'Protección de Datos Personales' },
  { id: 'cookies', n: '13', label: 'Cookies' },
  { id: 'modificaciones', n: '14', label: 'Modificaciones' },
  { id: 'jurisdiccion', n: '15', label: 'Jurisdicción y Ley Aplicable' },
]

export default function TerminosPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12 sm:py-16">

      {/* Encabezado */}
      <div className="mb-10">
        <p className="text-xs font-ui uppercase tracking-widest text-primary mb-2">Aviso Legal</p>
        <h1 className="font-title text-4xl sm:text-5xl text-white mb-4">
          TÉRMINOS Y CONDICIONES
        </h1>
        <p className="text-brand-muted text-sm font-body">
          Última actualización: <span className="text-white">{LAST_UPDATED}</span>
        </p>
        <div
          className="mt-6 p-4 rounded-xl text-sm font-body leading-relaxed text-brand-muted"
          style={{ background: 'rgba(12, 150, 70,0.07)', border: '1px solid rgba(12, 150, 70,0.2)' }}
        >
          Al acceder o usar la plataforma <strong className="text-white">RifandoMas</strong>, el
          Usuario acepta en su totalidad los presentes Términos y Condiciones. Si no está de
          acuerdo, le pedimos que se abstenga de utilizar el servicio.
        </div>
      </div>

      {/* Índice */}
      <nav
        className="mb-12 rounded-2xl p-5"
        style={{ background: '#1e1e1e', border: '1px solid rgba(255,255,255,0.07)' }}
        aria-label="Índice de contenidos"
      >
        <p className="text-xs font-ui uppercase tracking-widest text-brand-muted mb-3">
          Contenido
        </p>
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1">
          {TOC.map(({ id, n, label }) => (
            <li key={id}>
              <a
                href={`#${id}`}
                className="text-sm font-body text-brand-muted hover:text-primary transition-colors flex items-center gap-2"
              >
                <span className="text-xs text-primary font-ui">{n}</span>
                {label}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      {/* Secciones */}
      <div className="space-y-12">

        <Section id="generalidades" number="01" title="Generalidades">
          <P>
            <strong className="text-white">RifandoMas</strong> (en adelante "la Plataforma", "nosotros"
            o "la Empresa") es un servicio en línea operado por{' '}
            <strong className="text-white">[RAZÓN SOCIAL, S.A. de C.V.]</strong>, con domicilio en
            la República Mexicana y correo de contacto{' '}
            <a href="mailto:hola@rifandomas.com" className="text-primary hover:underline">
              hola@rifandomas.com
            </a>
            .
          </P>
          <P>
            La Plataforma actúa como intermediario tecnológico que conecta a organizadores de
            sorteos (<em>Socios</em>) con participantes (<em>Usuarios</em>), facilitando la venta
            de boletos y la gestión de resultados de manera digital.
          </P>
          <P>
            El uso de la Plataforma implica la aceptación plena de los presentes Términos y
            Condiciones, así como de nuestro{' '}
            <Link href="/privacidad" className="text-primary hover:underline">
              Aviso de Privacidad
            </Link>
            . Estos documentos constituyen el acuerdo completo entre el Usuario y RifandoMas.
          </P>
        </Section>

        <Section id="definiciones" number="02" title="Definiciones">
          <dl>
            <Dt>Plataforma</Dt>
            <Dd>
              El sitio web y los servicios digitales ofrecidos en rifandomas.com y sus subdominios.
            </Dd>
            <Dt>Usuario</Dt>
            <Dd>
              Toda persona física mayor de 18 años que accede a la Plataforma para participar en
              sorteos como comprador de boletos.
            </Dd>
            <Dt>Socio / Organizador</Dt>
            <Dd>
              Persona física o moral que, previo acuerdo con RifandoMas, crea y administra sorteos
              dentro de la Plataforma. Cada Socio es responsable de contar con las autorizaciones
              legales necesarias para la realización del sorteo.
            </Dd>
            <Dt>Sorteo</Dt>
            <Dd>
              Evento de suerte o azar publicado en la Plataforma por un Socio, consistente en la
              asignación aleatoria de premios entre los poseedores de boletos participantes.
            </Dd>
            <Dt>Boleto</Dt>
            <Dd>
              Número único asignado al Usuario al completar su pago, que le da derecho a participar
              en el Sorteo correspondiente.
            </Dd>
            <Dt>Pedido</Dt>
            <Dd>
              Solicitud de compra de uno o más boletos realizada por un Usuario para un Sorteo
              específico.
            </Dd>
            <Dt>Premio</Dt>
            <Dd>
              Bien o derecho que el Socio otorgará al ganador o ganadores del Sorteo, según las
              condiciones publicadas en la ficha del Sorteo.
            </Dd>
          </dl>
        </Section>

        <Section id="registro" number="03" title="Registro y Cuenta de Usuario">
          <P>
            Para adquirir boletos, el Usuario debe crear una cuenta proporcionando su nombre
            completo, correo electrónico y contraseña. Al registrarse, el Usuario declara:
          </P>
          <Ol>
            <Li>Ser mayor de 18 años.</Li>
            <Li>
              Que los datos proporcionados son verídicos, actuales y corresponden a su persona.
            </Li>
            <Li>Ser el único responsable de la confidencialidad de sus credenciales de acceso.</Li>
            <Li>
              Notificar de inmediato a RifandoMas ante cualquier uso no autorizado de su cuenta.
            </Li>
          </Ol>
          <P>
            RifandoMas se reserva el derecho de suspender o eliminar cuentas que incumplan estos
            Términos, sin responsabilidad alguna hacia el Usuario afectado.
          </P>
        </Section>

        <Section id="servicio" number="04" title="Funcionamiento del Servicio">
          <P>
            <strong className="text-white">RifandoMas es un intermediario tecnológico</strong>, no
            el organizador de los sorteos publicados en la Plataforma. Nuestra función consiste en:
          </P>
          <Ul>
            <Li>Facilitar la publicación y gestión de sorteos por parte de los Socios.</Li>
            <Li>Procesar la selección y reserva de boletos.</Li>
            <Li>Gestionar la comunicación entre Socios y Usuarios vía notificaciones.</Li>
            <Li>Proveer un sistema de verificación de boletos.</Li>
          </Ul>
          <P>
            Cada Socio es el único responsable de:
          </P>
          <Ul>
            <Li>
              Obtener y mantener vigente la autorización ante la Dirección General de Juegos y
              Sorteos (DGJS) de la Secretaría de Gobernación (SEGOB), conforme a la{' '}
              <em>Ley Federal de Juegos y Sorteos</em> y su Reglamento, cuando así se requiera.
            </Li>
            <Li>La veracidad de la información publicada en su sorteo.</Li>
            <Li>La entrega del premio al ganador en los términos y plazos anunciados.</Li>
            <Li>El cumplimiento de las obligaciones fiscales derivadas del sorteo.</Li>
          </Ul>
          <P>
            RifandoMas no garantiza los resultados de los sorteos ni la conducta de los Socios.
            Sin embargo, implementa controles de revisión antes de activar cualquier sorteo en la
            Plataforma.
          </P>
        </Section>

        <Section id="compra" number="05" title="Proceso de Compra de Boletos">
          <P>El proceso de adquisición de boletos se realiza en los siguientes pasos:</P>
          <Ol>
            <Li>
              <strong className="text-white">Selección:</strong> El Usuario elige el sorteo y el
              paquete de boletos deseado.
            </Li>
            <Li>
              <strong className="text-white">Reserva:</strong> El sistema asigna y reserva de manera
              temporal números específicos al Usuario por un tiempo limitado.
            </Li>
            <Li>
              <strong className="text-white">Pago:</strong> El Usuario realiza el pago por el método
              indicado en la ficha del sorteo. El pago se realiza directamente al Socio organizador
              según sus instrucciones.
            </Li>
            <Li>
              <strong className="text-white">Confirmación:</strong> Una vez verificado el pago por
              el Socio, los boletos se marcan como pagados y el Usuario recibe confirmación por
              WhatsApp o correo electrónico.
            </Li>
          </Ol>
          <P>
            Los boletos reservados que no sean pagados dentro del plazo establecido por el Socio
            quedarán disponibles nuevamente para otros participantes sin previo aviso.
          </P>
          <P>
            La asignación de números de boleto es aleatoria dentro del rango disponible y no
            garantiza números específicos salvo acuerdo expreso con el Socio.
          </P>
        </Section>

        <Section id="precios" number="06" title="Precios y Pagos">
          <P>
            Todos los precios publicados en la Plataforma están expresados en{' '}
            <strong className="text-white">pesos mexicanos (MXN)</strong> e incluyen el Impuesto al
            Valor Agregado (IVA) cuando aplique, según las condiciones de cada Socio.
          </P>
          <P>
            Los métodos de pago aceptados son definidos por cada Socio organizador y pueden incluir:
            transferencia bancaria (SPEI), depósito en efectivo, pago por CoDi, u otros métodos
            indicados en la ficha del sorteo.
          </P>
          <P>
            RifandoMas no procesa directamente los pagos ni almacena datos bancarios o de tarjetas
            de crédito/débito de los Usuarios. El Socio es responsable de confirmar la recepción
            del pago y actualizar el estatus del pedido en la Plataforma.
          </P>
          <P>
            La emisión de comprobantes fiscales digitales (CFDI) es responsabilidad del Socio
            organizador cuando proceda.
          </P>
        </Section>

        <Section id="cancelaciones" number="07" title="Cancelaciones y Reembolsos">
          <P>
            <strong className="text-white">Cancelación por el Socio:</strong> Si un sorteo es
            cancelado antes de realizarse por causas imputables al Socio, el Usuario tendrá derecho
            a la devolución del importe pagado según los mecanismos acordados con el Socio. RifandoMas
            coadyuvará en la gestión de la reclamación.
          </P>
          <P>
            <strong className="text-white">Sorteo no realizado en la fecha anunciada:</strong> Si el
            sorteo no se efectúa en la fecha publicada, el Socio deberá reprogramarlo o proceder al
            reembolso. RifandoMas notificará a los Usuarios del cambio.
          </P>
          <P>
            <strong className="text-white">Desistimiento del Usuario:</strong> Una vez confirmado el
            pago, el Usuario no podrá cancelar su participación ni solicitar reembolso por
            arrepentimiento, salvo disposición legal en contrario aplicable al caso concreto.
          </P>
          <P>
            Para cualquier reclamación, el Usuario puede contactar a RifandoMas en{' '}
            <a href="mailto:hola@rifandomas.com" className="text-primary hover:underline">
              hola@rifandomas.com
            </a>{' '}
            o directamente al Socio organizador del sorteo.
          </P>
          <P>
            Los Usuarios que no queden satisfechos con la resolución pueden acudir ante la
            Procuraduría Federal del Consumidor (<strong className="text-white">PROFECO</strong>) en
            términos de la Ley Federal de Protección al Consumidor.
          </P>
        </Section>

        <Section id="sorteo" number="08" title="Realización del Sorteo">
          <P>
            El sorteo se realizará en la fecha, hora y forma indicadas en la ficha del sorteo. El
            Socio es responsable de:
          </P>
          <Ul>
            <Li>
              Realizar el sorteo de manera transparente y verificable, preferentemente en
              transmisión en vivo ante un notario o mediante método aleatorio certificado.
            </Li>
            <Li>
              Publicar los números ganadores en la Plataforma y en sus redes sociales dentro de
              las 24 horas posteriores al sorteo.
            </Li>
            <Li>
              Contactar al ganador dentro de las 48 horas siguientes y entregar el premio en los
              plazos y términos anunciados.
            </Li>
            <Li>
              Conservar evidencia del sorteo durante al menos 3 (tres) meses posteriores a su
              realización.
            </Li>
          </Ul>
          <P>
            En caso de que el ganador no pueda ser localizado en un plazo de 30 días naturales, el
            Socio notificará a RifandoMas y definirá el procedimiento a seguir conforme a la
            normatividad aplicable.
          </P>
        </Section>

        <Section id="prohibiciones" number="09" title="Prohibiciones">
          <P>Está estrictamente prohibido para los Usuarios:</P>
          <Ul>
            <Li>
              Ser menor de 18 años. RifandoMas podrá solicitar verificación de edad en cualquier
              momento.
            </Li>
            <Li>
              Proporcionar datos de identidad falsos, incompletos o de terceros sin su
              consentimiento.
            </Li>
            <Li>Crear múltiples cuentas para un mismo titular.</Li>
            <Li>
              Usar bots, scripts u otros mecanismos automatizados para adquirir boletos de manera
              masiva o en detrimento de otros Usuarios.
            </Li>
            <Li>Revender boletos a precios superiores al valor original sin autorización.</Li>
            <Li>
              Usar la Plataforma para actividades de lavado de dinero, financiamiento al terrorismo
              u otras actividades ilícitas.
            </Li>
            <Li>
              Intentar vulnerar la seguridad, integridad o disponibilidad de la Plataforma.
            </Li>
            <Li>
              Publicar o transmitir contenido difamatorio, obsceno, racista, o que infrinja
              derechos de terceros.
            </Li>
          </Ul>
          <P>
            El incumplimiento de cualquiera de estas prohibiciones facultará a RifandoMas para
            suspender o cancelar la cuenta del infractor, sin perjuicio de las acciones legales
            que procedan.
          </P>
        </Section>

        <Section id="propiedad" number="10" title="Propiedad Intelectual">
          <P>
            La marca, logotipo, diseño, textos, imágenes, código fuente y demás elementos que
            integran la Plataforma son propiedad exclusiva de RifandoMas y están protegidos por la{' '}
            <em>Ley Federal del Derecho de Autor</em> y la <em>Ley de la Propiedad Industrial</em>{' '}
            vigentes en México.
          </P>
          <P>
            Se prohíbe la reproducción, distribución, modificación o uso comercial de cualquier
            elemento de la Plataforma sin autorización previa y por escrito de RifandoMas.
          </P>
          <P>
            Los Socios conservan los derechos sobre el contenido (imágenes, descripciones) que
            suben a la Plataforma, pero otorgan a RifandoMas una licencia no exclusiva para
            mostrarlo mientras el sorteo esté activo.
          </P>
        </Section>

        <Section id="responsabilidad" number="11" title="Responsabilidad y Limitaciones">
          <P>
            RifandoMas actúa como intermediario tecnológico y, en consecuencia:
          </P>
          <Ul>
            <Li>
              No garantiza el resultado de ningún sorteo ni la calidad o valor del premio ofrecido
              por el Socio.
            </Li>
            <Li>
              No es responsable del incumplimiento de obligaciones por parte del Socio organizador.
            </Li>
            <Li>
              No será responsable por daños indirectos, lucro cesante o pérdidas consecuentes
              derivadas del uso de la Plataforma.
            </Li>
            <Li>
              No garantiza la disponibilidad ininterrumpida del servicio; podrá suspenderlo
              temporalmente por mantenimiento o causas de fuerza mayor.
            </Li>
          </Ul>
          <P>
            En los casos en que la responsabilidad de RifandoMas resulte procedente, el monto
            máximo de indemnización no excederá el valor del boleto o boletos adquiridos por el
            Usuario en el sorteo en cuestión.
          </P>
          <P>
            Lo anterior es sin perjuicio de los derechos irrenunciables que la{' '}
            <em>Ley Federal de Protección al Consumidor</em> reconoce a los Usuarios.
          </P>
        </Section>

        <Section id="datos" number="12" title="Protección de Datos Personales">
          <P>
            RifandoMas trata los datos personales de sus Usuarios de conformidad con la{' '}
            <strong className="text-white">
              Ley Federal de Protección de Datos Personales en Posesión de los Particulares
              (LFPDPPP)
            </strong>{' '}
            y su Reglamento.
          </P>
          <P>
            Los datos recabados (nombre, correo, teléfono) se utilizan exclusivamente para prestar
            el servicio, gestionar su cuenta, enviarle notificaciones relacionadas con sus pedidos
            y cumplir obligaciones legales. No vendemos ni cedemos sus datos a terceros con fines
            comerciales no relacionados con el servicio.
          </P>
          <P>
            Para conocer en detalle cómo tratamos su información personal, sus derechos ARCO
            (Acceso, Rectificación, Cancelación y Oposición) y cómo ejercerlos, consulte nuestro{' '}
            <Link href="/privacidad" className="text-primary hover:underline font-semibold">
              Aviso de Privacidad
            </Link>
            .
          </P>
        </Section>

        <Section id="cookies" number="13" title="Cookies y Tecnologías de Rastreo">
          <P>
            La Plataforma utiliza cookies y almacenamiento local del navegador para:
          </P>
          <Ul>
            <Li>
              <strong className="text-white">Cookies esenciales:</strong> Mantener la sesión
              autenticada del Usuario (gestionadas por Supabase), proteger contra ataques CSRF y
              garantizar el correcto funcionamiento del servicio. No pueden desactivarse sin
              afectar la funcionalidad.
            </Li>
            <Li>
              <strong className="text-white">Almacenamiento de preferencias:</strong> Guardar
              preferencias de la interfaz como el estado del consentimiento de cookies.
            </Li>
          </Ul>
          <P>
            El Usuario puede configurar su navegador para bloquear o eliminar cookies. Tenga en
            cuenta que deshabilitar las cookies esenciales impedirá el inicio de sesión y la
            compra de boletos.
          </P>
          <P>
            No utilizamos cookies de publicidad comportamental ni compartimos datos de navegación
            con redes de anuncios de terceros.
          </P>
        </Section>

        <Section id="modificaciones" number="14" title="Modificaciones a los Términos">
          <P>
            RifandoMas se reserva el derecho de modificar los presentes Términos y Condiciones en
            cualquier momento. Las modificaciones serán notificadas mediante:
          </P>
          <Ul>
            <Li>Un aviso visible en la Plataforma al menos 15 días antes de su entrada en vigor.</Li>
            <Li>
              Correo electrónico a la dirección registrada por el Usuario, cuando el cambio sea
              sustancial.
            </Li>
          </Ul>
          <P>
            El uso continuado de la Plataforma después de la fecha de vigencia de los nuevos
            Términos implicará su aceptación. Si el Usuario no está de acuerdo, deberá suspender
            su uso y podrá solicitar la cancelación de su cuenta.
          </P>
        </Section>

        <Section id="jurisdiccion" number="15" title="Jurisdicción y Ley Aplicable">
          <P>
            Los presentes Términos y Condiciones se rigen por las leyes vigentes de los{' '}
            <strong className="text-white">Estados Unidos Mexicanos</strong>, en particular:
          </P>
          <Ul>
            <Li>Ley Federal de Protección al Consumidor y normas PROFECO.</Li>
            <Li>
              Ley Federal de Protección de Datos Personales en Posesión de los Particulares
              (LFPDPPP).
            </Li>
            <Li>Ley Federal de Juegos y Sorteos y su Reglamento.</Li>
            <Li>Código Civil Federal y Código de Comercio.</Li>
            <Li>Ley Federal del Derecho de Autor.</Li>
          </Ul>
          <P>
            Para la resolución de controversias, las partes se someten a la jurisdicción de los
            tribunales competentes de la Ciudad de México, renunciando a cualquier otro fuero que
            pudiera corresponderles por razón de su domicilio presente o futuro.
          </P>
          <P>
            Sin perjuicio de lo anterior, el Usuario conserva el derecho de acudir a{' '}
            <strong className="text-white">PROFECO</strong> para la conciliación de
            controversias de consumo conforme a la ley.
          </P>
        </Section>

      </div>

      {/* Pie de página legal */}
      <div
        className="mt-14 p-5 rounded-2xl text-xs font-body text-brand-muted space-y-1"
        style={{ background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.07)' }}
      >
        <p>
          <strong className="text-white">RifandoMas</strong> · hola@rifandomas.com
        </p>
        <p>Versión en vigor desde el {LAST_UPDATED}.</p>
        <p>
          Consulta también nuestro{' '}
          <Link href="/privacidad" className="text-primary hover:underline">
            Aviso de Privacidad
          </Link>
          .
        </p>
      </div>

    </div>
  )
}

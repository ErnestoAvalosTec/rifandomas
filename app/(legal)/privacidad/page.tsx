import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Aviso de Privacidad | RifandoMas',
  description:
    'Aviso de Privacidad de RifandoMas conforme a la LFPDPPP. Conoce cómo protegemos tus datos personales y cómo ejercer tus derechos ARCO.',
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

function Ul({ children }: { children: React.ReactNode }) {
  return <ul className="list-disc list-outside ml-5 space-y-1.5">{children}</ul>
}

function Li({ children }: { children: React.ReactNode }) {
  return <li>{children}</li>
}

function Table({
  headers,
  rows,
}: {
  headers: string[]
  rows: string[][]
}) {
  return (
    <div className="overflow-x-auto rounded-xl" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
      <table className="w-full text-xs font-body">
        <thead>
          <tr style={{ background: 'rgba(255,255,255,0.04)' }}>
            {headers.map((h) => (
              <th
                key={h}
                className="text-left px-4 py-3 font-ui font-semibold text-white uppercase tracking-wide"
                style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr
              key={i}
              style={{ borderBottom: i < rows.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}
            >
              {row.map((cell, j) => (
                <td key={j} className="px-4 py-3 text-brand-muted align-top">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

const TOC = [
  { id: 'responsable', n: '01', label: 'Identidad del Responsable' },
  { id: 'datos', n: '02', label: 'Datos Personales Recabados' },
  { id: 'finalidades', n: '03', label: 'Finalidades del Tratamiento' },
  { id: 'transferencias', n: '04', label: 'Transferencias de Datos' },
  { id: 'arco', n: '05', label: 'Derechos ARCO' },
  { id: 'menores', n: '06', label: 'Datos de Menores de Edad' },
  { id: 'cookies', n: '07', label: 'Cookies y Tecnologías Similares' },
  { id: 'seguridad', n: '08', label: 'Medidas de Seguridad' },
  { id: 'cambios', n: '09', label: 'Cambios al Aviso de Privacidad' },
  { id: 'contacto', n: '10', label: 'Contacto' },
]

export default function PrivacidadPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12 sm:py-16">

      {/* Encabezado */}
      <div className="mb-10">
        <p className="text-xs font-ui uppercase tracking-widest text-primary mb-2">
          Privacidad — LFPDPPP
        </p>
        <h1 className="font-title text-4xl sm:text-5xl text-white mb-4">
          AVISO DE PRIVACIDAD
        </h1>
        <p className="text-brand-muted text-sm font-body">
          Última actualización: <span className="text-white">{LAST_UPDATED}</span>
        </p>
        <div
          className="mt-6 p-4 rounded-xl text-sm font-body leading-relaxed text-brand-muted"
          style={{ background: 'rgba(12, 150, 70,0.07)', border: '1px solid rgba(12, 150, 70,0.2)' }}
        >
          El presente Aviso de Privacidad se emite en cumplimiento de la{' '}
          <strong className="text-white">
            Ley Federal de Protección de Datos Personales en Posesión de los Particulares
            (LFPDPPP)
          </strong>{' '}
          y su Reglamento, publicados en el Diario Oficial de la Federación. Te informamos cómo
          recopilamos, usamos y protegemos tus datos personales.
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

        <Section id="responsable" number="01" title="Identidad y Domicilio del Responsable">
          <P>
            El responsable del tratamiento de sus datos personales es:
          </P>
          <div
            className="rounded-xl p-5 space-y-2 text-sm"
            style={{ background: '#1e1e1e', border: '1px solid rgba(255,255,255,0.07)' }}
          >
            {[
              ['Denominación', 'RifandoMas / [RAZÓN SOCIAL, S.A. de C.V.]'],
              ['RFC', '[RFC del responsable]'],
              ['Domicilio', 'República Mexicana — [Calle, número, colonia, ciudad, C.P.]'],
              ['Correo electrónico', 'hola@rifandomas.com'],
              ['Sitio web', 'rifandomas.com'],
            ].map(([label, value]) => (
              <div key={label} className="flex gap-3">
                <span className="text-brand-muted font-ui min-w-[140px] flex-shrink-0">{label}:</span>
                <span className="text-white font-body">{value}</span>
              </div>
            ))}
          </div>
          <P>
            En adelante "el Responsable", "nosotros" o "RifandoMas".
          </P>
        </Section>

        <Section id="datos" number="02" title="Datos Personales que Recabamos">
          <P>
            Para la prestación del servicio, el Responsable recaba las siguientes categorías de
            datos personales:
          </P>

          <Table
            headers={['Categoría', 'Datos específicos', 'Cómo se obtienen']}
            rows={[
              ['Identificación', 'Nombre completo', 'Formulario de registro / compra'],
              ['Contacto', 'Correo electrónico, número de teléfono celular', 'Formulario de registro / compra'],
              ['Transaccionales', 'Números de boleto adquiridos, historial de pedidos, estatus de pagos', 'Generados automáticamente al realizar compras'],
              ['Técnicos', 'Dirección IP, tipo de navegador, sistema operativo, páginas visitadas dentro de la Plataforma', 'Cookies y registros del servidor'],
              ['Datos de sesión', 'Token de autenticación cifrado', 'Generado por el servicio de autenticación (Supabase)'],
            ]}
          />

          <P>
            <strong className="text-white">No recabamos datos personales sensibles</strong> en los
            términos del artículo 3, fracción VI de la LFPDPPP (datos sobre origen racial o étnico,
            estado de salud, religión, opiniones políticas, preferencias sexuales, biométricos, etc.).
          </P>
          <P>
            Tampoco almacenamos directamente datos de tarjetas de crédito/débito ni cuentas
            bancarias; los pagos se realizan entre el Usuario y el Socio organizador por los
            medios que éste determine.
          </P>
        </Section>

        <Section id="finalidades" number="03" title="Finalidades del Tratamiento">
          <P>
            Sus datos personales serán utilizados para las siguientes{' '}
            <strong className="text-white">finalidades primarias</strong> (necesarias para la
            relación contractual):
          </P>
          <Ul>
            <Li>Crear y gestionar su cuenta de usuario en la Plataforma.</Li>
            <Li>
              Procesar, confirmar y registrar la adquisición de boletos de sorteo.
            </Li>
            <Li>
              Enviar notificaciones relacionadas con sus pedidos, estatus de pago y resultados del
              sorteo mediante correo electrónico y/o mensaje de WhatsApp.
            </Li>
            <Li>
              Permitir la verificación del estatus de sus boletos a través del verificador
              público de la Plataforma.
            </Li>
            <Li>
              Contactarle en caso de ser ganador de un sorteo para coordinar la entrega del premio.
            </Li>
            <Li>
              Cumplir con obligaciones legales y requerimientos de autoridades competentes.
            </Li>
            <Li>Prevención de fraudes e investigación de actividades ilícitas.</Li>
          </Ul>

          <P>
            Adicionalmente, con su consentimiento expreso, podríamos tratar sus datos para las
            siguientes <strong className="text-white">finalidades secundarias</strong>:
          </P>
          <Ul>
            <Li>
              Enviarle comunicaciones promocionales sobre nuevos sorteos, ofertas especiales y
              contenido de su interés.
            </Li>
            <Li>
              Realizar encuestas de satisfacción para mejorar nuestro servicio.
            </Li>
            <Li>
              Elaborar estadísticas y análisis internos del comportamiento de uso de la Plataforma.
            </Li>
          </Ul>
          <P>
            Si no desea que sus datos sean tratados para las finalidades secundarias, puede
            manifestarlo en cualquier momento enviando un correo a{' '}
            <a href="mailto:hola@rifandomas.com" className="text-primary hover:underline">
              hola@rifandomas.com
            </a>{' '}
            con el asunto "Oposición a finalidades secundarias". La negativa no afectará la
            prestación del servicio principal.
          </P>
        </Section>

        <Section id="transferencias" number="04" title="Transferencias de Datos Personales">
          <P>
            Sus datos podrán ser compartidos con los siguientes terceros para los fines indicados:
          </P>

          <Table
            headers={['Destinatario', 'Finalidad', 'Consentimiento requerido']}
            rows={[
              [
                'Supabase Inc. (infraestructura de nube)',
                'Almacenamiento de base de datos y archivos; autenticación de usuarios',
                'No — necesario para el servicio',
              ],
              [
                'Socios organizadores del sorteo',
                'Confirmar el pago y coordinar la entrega del premio al ganador',
                'No — necesario para el servicio',
              ],
              [
                'WhatsApp (Meta Platforms) / Evolution API',
                'Envío de notificaciones de confirmación de pedido al número registrado',
                'No — informado en el registro',
              ],
              [
                'Autoridades competentes',
                'Cumplimiento de requerimientos legales, judiciales o administrativos',
                'No — obligación legal',
              ],
            ]}
          />

          <P>
            Fuera de los supuestos anteriores,{' '}
            <strong className="text-white">
              RifandoMas no vende, renta ni transfiere sus datos personales a terceros con fines
              comerciales.
            </strong>
          </P>
          <P>
            Supabase Inc. actúa como encargado del tratamiento bajo estrictos acuerdos de
            confidencialidad y medidas de seguridad conformes a estándares internacionales
            (SOC 2 Type II, ISO 27001). Para más información visite{' '}
            <span className="text-white">supabase.com/privacy</span>.
          </P>
        </Section>

        <Section id="arco" number="05" title="Derechos ARCO y Cómo Ejercerlos">
          <P>
            Usted tiene derecho a ejercer los siguientes derechos sobre sus datos personales
            conforme a la LFPDPPP:
          </P>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              {
                letra: 'A',
                nombre: 'Acceso',
                desc: 'Conocer qué datos personales tenemos sobre usted, para qué los usamos y las condiciones de su tratamiento.',
              },
              {
                letra: 'R',
                nombre: 'Rectificación',
                desc: 'Solicitar la corrección de sus datos personales cuando sean inexactos, incompletos o desactualizados.',
              },
              {
                letra: 'C',
                nombre: 'Cancelación',
                desc: 'Solicitar la eliminación de sus datos cuando considere que no son necesarios para la relación jurídica con nosotros o han dejado de serlo.',
              },
              {
                letra: 'O',
                nombre: 'Oposición',
                desc: 'Oponerse al tratamiento de sus datos para fines específicos (como las finalidades secundarias) o cuando exista causa legítima.',
              },
            ].map(({ letra, nombre, desc }) => (
              <div
                key={letra}
                className="rounded-xl p-4"
                style={{ background: '#1e1e1e', border: '1px solid rgba(255,255,255,0.07)' }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span
                    className="w-7 h-7 rounded-lg font-title text-base flex items-center justify-center text-white flex-shrink-0"
                    style={{ background: '#0C9646' }}
                  >
                    {letra}
                  </span>
                  <span className="font-semibold text-white text-sm">{nombre}</span>
                </div>
                <p className="text-xs leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>

          <P>
            Para ejercer cualquiera de estos derechos, envíe una solicitud al correo{' '}
            <a href="mailto:hola@rifandomas.com" className="text-primary hover:underline font-semibold">
              hola@rifandomas.com
            </a>{' '}
            con el asunto <strong className="text-white">"Solicitud ARCO"</strong>,
            incluyendo la siguiente información:
          </P>
          <Ul>
            <Li>Nombre completo y correo electrónico registrado en la Plataforma.</Li>
            <Li>
              Copia de documento de identificación oficial vigente (INE, pasaporte).
            </Li>
            <Li>Descripción clara y precisa del derecho que desea ejercer.</Li>
            <Li>
              Cualquier documento o información que facilite la localización de sus datos.
            </Li>
          </Ul>
          <P>
            RifandoMas dará respuesta a su solicitud en un plazo máximo de{' '}
            <strong className="text-white">20 días hábiles</strong> a partir de la recepción.
            En caso de que su solicitud sea procedente, se hará efectiva en un plazo de 15 días
            hábiles adicionales.
          </P>
          <P>
            Si considera que su derecho a la protección de datos personales ha sido vulnerado,
            puede acudir al{' '}
            <strong className="text-white">
              Instituto Nacional de Transparencia, Acceso a la Información y Protección de Datos
              Personales (INAI)
            </strong>{' '}
            en <span className="text-white">inai.org.mx</span>.
          </P>
        </Section>

        <Section id="menores" number="06" title="Datos de Menores de Edad">
          <P>
            La Plataforma <strong className="text-white">no está dirigida a personas menores de
            18 años</strong> y no recaba datos personales de menores de manera consciente e
            intencionada.
          </P>
          <P>
            Si usted es padre, madre o tutor y detecta que un menor ha proporcionado sus datos
            en la Plataforma sin su consentimiento, le pedimos notificarnos inmediatamente a{' '}
            <a href="mailto:hola@rifandomas.com" className="text-primary hover:underline">
              hola@rifandomas.com
            </a>{' '}
            para proceder a su eliminación de conformidad con la ley.
          </P>
        </Section>

        <Section id="cookies" number="07" title="Cookies y Tecnologías Similares">
          <P>
            La Plataforma utiliza las siguientes tecnologías para mejorar la experiencia del
            usuario y garantizar el funcionamiento del servicio:
          </P>

          <Table
            headers={['Tipo', 'Nombre / Origen', 'Finalidad', '¿Desactivable?']}
            rows={[
              [
                'Esencial de sesión',
                'sb-* (Supabase Auth)',
                'Mantener la sesión del usuario autenticado de forma segura',
                'No — el sitio no funciona sin ella',
              ],
              [
                'Preferencias (localStorage)',
                'rifandomas-cookies',
                'Recordar la preferencia de consentimiento de cookies del usuario',
                'Sí — borrando datos del navegador',
              ],
              [
                'Técnico (localStorage)',
                'Estado de UI (bubble dismissed, etc.)',
                'Guardar preferencias de interfaz de la sesión',
                'Sí — borrando datos del navegador',
              ],
            ]}
          />

          <P>
            Puede gestionar o eliminar las cookies desde la configuración de su navegador
            (Configuración → Privacidad → Cookies). Tenga en cuenta que deshabilitar las cookies
            esenciales impedirá el inicio de sesión y la compra de boletos.
          </P>
          <P>
            No utilizamos cookies de seguimiento publicitario, remarketing, ni compartimos datos
            de navegación con redes de publicidad de terceros.
          </P>
        </Section>

        <Section id="seguridad" number="08" title="Medidas de Seguridad">
          <P>
            RifandoMas implementa medidas técnicas, administrativas y físicas para proteger sus
            datos personales contra pérdida, robo, acceso no autorizado, divulgación, alteración
            o destrucción:
          </P>
          <Ul>
            <Li>
              <strong className="text-white">Cifrado en tránsito:</strong> Toda comunicación entre
              su navegador y nuestros servidores se realiza mediante HTTPS/TLS.
            </Li>
            <Li>
              <strong className="text-white">Contraseñas hasheadas:</strong> Las contraseñas se
              almacenan con bcrypt; nunca se guardan en texto plano.
            </Li>
            <Li>
              <strong className="text-white">Control de acceso por roles:</strong> Solo el personal
              autorizado accede a la base de datos; los Socios solo pueden ver los pedidos de sus
              propios sorteos.
            </Li>
            <Li>
              <strong className="text-white">Infraestructura en nube:</strong> Supabase (respaldos
              automáticos, cifrado en reposo, cumplimiento SOC 2).
            </Li>
            <Li>
              <strong className="text-white">Autenticación segura:</strong> Tokens JWT con
              expiración y rotación automática.
            </Li>
          </Ul>
          <P>
            En caso de que ocurra una vulneración de seguridad que afecte significativamente sus
            derechos, se lo notificaremos de inmediato por correo electrónico y se procederá
            conforme a lo previsto en la LFPDPPP.
          </P>
        </Section>

        <Section id="cambios" number="09" title="Cambios al Aviso de Privacidad">
          <P>
            El presente Aviso de Privacidad puede ser modificado periódicamente para reflejar
            cambios en nuestras prácticas, en la legislación aplicable o en los servicios que
            ofrecemos.
          </P>
          <P>
            Cualquier modificación sustancial será notificada mediante:
          </P>
          <Ul>
            <Li>Un aviso destacado en la Plataforma al iniciar sesión.</Li>
            <Li>
              Un correo electrónico a la dirección registrada, al menos 10 días naturales antes de
              su entrada en vigor.
            </Li>
          </Ul>
          <P>
            La versión actualizada siempre estará disponible en{' '}
            <Link href="/privacidad" className="text-primary hover:underline">
              rifandomas.com/privacidad
            </Link>
            . Le recomendamos consultar periódicamente este documento.
          </P>
        </Section>

        <Section id="contacto" number="10" title="Contacto">
          <P>
            Para cualquier duda, aclaración o solicitud relacionada con el tratamiento de sus
            datos personales, contáctenos:
          </P>
          <div
            className="rounded-xl p-5 space-y-2 text-sm"
            style={{ background: '#1e1e1e', border: '1px solid rgba(255,255,255,0.07)' }}
          >
            {[
              ['Correo electrónico', 'hola@rifandomas.com'],
              ['Asunto', '"Solicitud ARCO" o "Aviso de Privacidad"'],
              ['Horario de atención', 'Lunes a viernes de 9:00 a 18:00 hrs (Tiempo del Centro)'],
              ['Plazo de respuesta', '20 días hábiles'],
            ].map(([label, value]) => (
              <div key={label} className="flex gap-3">
                <span className="text-brand-muted font-ui min-w-[160px] flex-shrink-0">{label}:</span>
                <span className="text-white font-body">{value}</span>
              </div>
            ))}
          </div>
          <P>
            También puede acudir directamente ante el{' '}
            <strong className="text-white">INAI</strong> (Instituto Nacional de Transparencia,
            Acceso a la Información y Protección de Datos Personales) en{' '}
            <span className="text-white">inai.org.mx</span> si considera que sus derechos han
            sido vulnerados.
          </P>
        </Section>

      </div>

      {/* Pie */}
      <div
        className="mt-14 p-5 rounded-2xl text-xs font-body text-brand-muted space-y-1"
        style={{ background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.07)' }}
      >
        <p>
          <strong className="text-white">RifandoMas</strong> · Aviso de Privacidad conforme a la
          LFPDPPP · hola@rifandomas.com
        </p>
        <p>Versión en vigor desde el {LAST_UPDATED}.</p>
        <p>
          Consulta también nuestros{' '}
          <Link href="/terminos" className="text-primary hover:underline">
            Términos y Condiciones
          </Link>
          .
        </p>
      </div>

    </div>
  )
}

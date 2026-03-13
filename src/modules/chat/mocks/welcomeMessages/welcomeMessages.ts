export type DayPeriod = "morning" | "afternoon" | "night";

export interface WelcomeMessage {
  title: string;
  subtitle: string;
}

const WELCOME_MESSAGES: Record<DayPeriod, readonly WelcomeMessage[]> = {
  morning: [
    {
      title: "Buenos dias. Mew WebUI ya esta ronroneando.",
      subtitle: "Tu IA privada esta lista para arrancar sin ruido ni telemetria.",
    },
    {
      title: "Cafe, teclado y un prompt inteligente.",
      subtitle: "Hoy Mew WebUI te acompana con simplicidad y control total.",
    },
    {
      title: "Desperto la mente, desperto la IA.",
      subtitle: "Abrimos chat y convertimos ideas en acciones concretas.",
    },
    {
      title: "Miau morning mode: activado.",
      subtitle: "Tu espacio open source esta listo para crear desde temprano.",
    },
  ],
  afternoon: [
    {
      title: "Buenas tardes. Seguimos en modo enfoque.",
      subtitle: "Mew WebUI mantiene tus conversaciones privadas y rapidas.",
    },
    {
      title: "Hora perfecta para iterar sin drama.",
      subtitle: "Tu asistente de IA personal ya esta listo para ayudarte.",
    },
    {
      title: "Media jornada, cero complicaciones.",
      subtitle: "Simplicidad por fuera, potencia por dentro.",
    },
    {
      title: "Si hay bug, lo cazamos. Si hay idea, la refinamos.",
      subtitle: "Mew WebUI te cubre en ambos casos.",
    },
  ],
  night: [
    {
      title: "Buenas noches. Modo enfoque nocturno activado.",
      subtitle: "Mew WebUI sigue despierto para tus mejores ideas.",
    },
    {
      title: "La casa duerme, tu IA no.",
      subtitle: "Privacidad local y chat sin distracciones.",
    },
    {
      title: "Turno nocturno de creatividad.",
      subtitle: "Prompt tras prompt, todo queda en tu propio espacio.",
    },
    {
      title: "Un ultimo commit... o tres.",
      subtitle: "Mew WebUI esta listo para acompanar la sesion.",
    },
  ],
};

export function getDayPeriodByHour(hour: number): DayPeriod {
  const normalizedHour = ((hour % 24) + 24) % 24;

  if (normalizedHour >= 5 && normalizedHour < 12) return "morning";
  if (normalizedHour >= 12 && normalizedHour < 19) return "afternoon";
  return "night";
}

export function getWelcomeMessagesByHour(hour: number): readonly WelcomeMessage[] {
  return WELCOME_MESSAGES[getDayPeriodByHour(hour)];
}

export function getWelcomeMessageByHour(hour: number, seed: number = 0): WelcomeMessage {
  const messages = getWelcomeMessagesByHour(hour);
  const normalizedHour = ((hour % 24) + 24) % 24;
  const normalizedSeed = Number.isFinite(seed) ? Math.abs(Math.trunc(seed)) : 0;
  const index = (normalizedHour + normalizedSeed) % messages.length;
  return messages[index];
}

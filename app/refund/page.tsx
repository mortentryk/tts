import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Refusionspolitik - TTS Historie Platform',
  description: 'Refusionspolitik for vores interaktive TTS historie platform',
  alternates: {
    canonical: '/refund',
  },
  openGraph: {
    title: 'Refusionspolitik - TTS Historie Platform',
    description: 'Refusionspolitik for vores interaktive TTS historie platform',
    url: '/refund',
    type: 'article',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Refusionspolitik - TTS Historie Platform',
    description: 'Refusionspolitik for vores interaktive TTS historie platform',
  },
};

export default function RefundPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-8">Refusionspolitik</h1>
        
        <div className="space-y-6 text-gray-300">
          <section className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-2xl font-semibold mb-4 text-white">Digitalt Indholdspolitik</h2>
            <p>
              På grund af det digitale indhold er vores generelle politik ingen refusioner 
              når et køb er gennemført. Dette er fordi du modtager øjeblikkelig adgang til indholdet.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-white">Når Refusioner Kan Gælde</h2>
            <p className="mb-4">Refusioner kan overvejes under følgende omstændigheder:</p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li><strong>Tekniske Problemer:</strong> Hvis du ikke kan tilgå købt indhold på grund af tekniske problemer</li>
              <li><strong>Dubletkøb:</strong> Uheldige dubletkøb af samme historie</li>
              <li><strong>Uautoriserede Gebyrer:</strong> Hvis du bemærker uautoriserede gebyrer på din konto</li>
              <li><strong>Indhold Ikke Som Beskrevet:</strong> Hvis indholdet væsentligt afviger fra det, der blev annonceret</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-white">Abonnementsrefusioner</h2>
            <p>
              For abonnementsplaner kan du annullere når som helst, og du beholder adgang indtil 
              slutningen af din nuværende faktureringsperiode. Ingen delvise refusioner ydes for ubrugt abonnements tid.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-white">Sådan Anmoder Du Om En Refusion</h2>
            <p className="mb-4">For at anmode om en refusion:</p>
            <ol className="list-decimal list-inside space-y-2 ml-4">
              <li>Kontakt vores supportteam gennem vores udpegede kanaler</li>
              <li>Angiv din email-adresse og historie-ID, du købte</li>
              <li>Forklar grunden til din refusionsanmodning</li>
              <li>Vent på vores svar (typisk inden for 5 arbejdsdage)</li>
            </ol>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-white">Behandlingstid</h2>
            <p>
              Hvis din refusionsanmodning godkendes, behandles refusioner inden for 7-10 arbejdsdage 
              til den oprindelige betalingsmetode, der blev brugt til købet.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-white">Valuta</h2>
            <p>
              Alle priser vises i USD. Refusioner udstedes i samme valuta og beløb 
              som den oprindelige transaktion.
            </p>
          </section>

          <section className="bg-yellow-900/30 rounded-lg p-6 border border-yellow-600">
            <h2 className="text-2xl font-semibold mb-4 text-white">Spørgsmål?</h2>
            <p>
              Hvis du har spørgsmål om vores refusionspolitik eller mener, at du har et tilfælde for en refusion, 
              tøv ikke med at kontakte vores supportteam. Vi er her for at hjælpe!
            </p>
          </section>
        </div>

        <div className="mt-12 pt-8 border-t border-gray-700">
          <p className="text-sm text-gray-400">
            Sidst opdateret: {new Date().toLocaleDateString('da-DK')}
          </p>
        </div>
      </div>
    </div>
  );
}

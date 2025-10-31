import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Refusionspolitik - TTS Historier Platform',
  description: 'Refusionspolitik for vores interaktive TTS historier platform',
};

export default function RefundPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-8">Refusionspolitik</h1>
        
        <div className="space-y-6 text-gray-300">
          <section className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-2xl font-semibold mb-4 text-white">Digitalt Indhold Politik</h2>
            <p>
              På grund af den digitale karakter af vores interaktive historier, er vores generelle politik ingen refusioner 
              når et køb er gennemført. Dette skyldes, at du får umiddelbar adgang til indholdet.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-white">Når Refusioner Kan Gælde</h2>
            <p className="mb-4">Refusioner kan overvejes under følgende omstændigheder:</p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li><strong>Tekniske Problemer:</strong> Hvis du ikke kan få adgang til købt indhold på grund af tekniske problemer</li>
              <li><strong>Dubletkøb:</strong> Ved uheld køb af samme historie to gange</li>
              <li><strong>Uautoriserede Gebyrer:</strong> Hvis du bemærker uautoriserede gebyrer på din konto</li>
              <li><strong>Indhold Ikke Som Beskrevet:</strong> Hvis indholdet væsentligt afviger fra det annoncerede</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-white">Abonnementsrefusioner</h2>
            <p>
              For abonnementsplaner kan du annullere når som helst, og du beholder adgang indtil 
              slutningen af din nuværende faktureringsperiode. Ingen delvise refusioner gives for ubrugt abonnementstid.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-white">Sådan Anmoder Du Om Refusion</h2>
            <p className="mb-4">For at anmode om refusion:</p>
            <ol className="list-decimal list-inside space-y-2 ml-4">
              <li>Kontakt vores supportteam gennem vores angivne kanaler</li>
              <li>Angiv din e-mailadresse og historie-ID'et du købte</li>
              <li>Forklar årsagen til din refusionsanmodning</li>
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
              Hvis du har spørgsmål til vores refusionspolitik eller mener, du har et grundlag for refusion, 
              så tøv ikke med at kontakte vores supportteam. Vi er her for at hjælpe!
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


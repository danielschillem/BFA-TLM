<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <title>Reçu {{ $paiement->reference }}</title>
    <style>
        body { font-family: DejaVu Sans, sans-serif; font-size: 12px; color: #333; margin: 0; padding: 20px; }
        .header { text-align: center; border-bottom: 2px solid #2563eb; padding-bottom: 15px; margin-bottom: 20px; }
        .header h1 { color: #2563eb; margin: 0; font-size: 22px; }
        .header p { color: #666; margin: 5px 0 0; }
        .info-grid { display: table; width: 100%; margin-bottom: 20px; }
        .info-col { display: table-cell; width: 50%; vertical-align: top; }
        .info-col h3 { color: #2563eb; border-bottom: 1px solid #ddd; padding-bottom: 5px; font-size: 13px; }
        .info-col p { margin: 3px 0; }
        .label { color: #666; }
        table.details { width: 100%; border-collapse: collapse; margin: 20px 0; }
        table.details th { background: #2563eb; color: #fff; padding: 8px 12px; text-align: left; }
        table.details td { padding: 8px 12px; border-bottom: 1px solid #eee; }
        .total-row td { font-weight: bold; font-size: 14px; border-top: 2px solid #2563eb; }
        .status { display: inline-block; padding: 3px 10px; border-radius: 10px; font-size: 11px; font-weight: bold; }
        .status-confirme { background: #dcfce7; color: #166534; }
        .status-en_attente { background: #fef3c7; color: #92400e; }
        .status-echoue { background: #fecaca; color: #991b1b; }
        .footer { text-align: center; margin-top: 30px; padding-top: 15px; border-top: 1px solid #ddd; color: #999; font-size: 10px; }
    </style>
</head>
<body>
    <div class="header">
        <h1>TLM-BFA / BFA TLM</h1>
        <p>Plateforme de Télémédecine du Burkina Faso</p>
    </div>

    <h2 style="text-align:center; color:#333;">REÇU DE PAIEMENT</h2>

    <div class="info-grid">
        <div class="info-col">
            <h3>Informations paiement</h3>
            <p><span class="label">Référence :</span> {{ $paiement->reference }}</p>
            <p><span class="label">Date :</span> {{ $paiement->created_at->format('d/m/Y H:i') }}</p>
            <p><span class="label">Méthode :</span> {{ ucfirst(str_replace('_', ' ', $paiement->methode)) }}</p>
            <p><span class="label">Téléphone :</span> {{ $paiement->telephone ?? '—' }}</p>
            <p>
                <span class="label">Statut :</span>
                <span class="status status-{{ $paiement->statut }}">{{ strtoupper($paiement->statut) }}</span>
            </p>
        </div>
        <div class="info-col">
            <h3>Patient / Rendez-vous</h3>
            @if($paiement->rendezVous)
                <p><span class="label">Type :</span> {{ ucfirst($paiement->rendezVous->type) }}</p>
                <p><span class="label">Date RDV :</span> {{ $paiement->rendezVous->date?->format('d/m/Y') }} à {{ $paiement->rendezVous->heure }}</p>
                @if($paiement->rendezVous->patient)
                    <p><span class="label">Patient :</span> {{ $paiement->rendezVous->patient->prenoms }} {{ $paiement->rendezVous->patient->nom }}</p>
                @endif
                @if($paiement->rendezVous->user)
                    <p><span class="label">Médecin :</span> Dr {{ $paiement->rendezVous->user->nom }} {{ $paiement->rendezVous->user->prenoms }}</p>
                @endif
            @else
                <p>—</p>
            @endif
        </div>
    </div>

    <table class="details">
        <thead>
            <tr>
                <th>Description</th>
                <th style="text-align:right;">Montant</th>
            </tr>
        </thead>
        <tbody>
            <tr>
                <td>
                    Consultation médicale
                    @if($paiement->typeFacturation)
                        — {{ $paiement->typeFacturation->libelle }}
                    @endif
                </td>
                <td style="text-align:right;">{{ number_format($paiement->montant, 0, ',', ' ') }} FCFA</td>
            </tr>
            <tr class="total-row">
                <td>TOTAL</td>
                <td style="text-align:right;">{{ number_format($paiement->montant, 0, ',', ' ') }} FCFA</td>
            </tr>
        </tbody>
    </table>

    <div class="footer">
        <p>Ce document fait office de reçu de paiement.</p>
        <p>TLM-BFA — Plateforme de Télémédecine du Burkina Faso — {{ now()->format('Y') }}</p>
    </div>
</body>
</html>

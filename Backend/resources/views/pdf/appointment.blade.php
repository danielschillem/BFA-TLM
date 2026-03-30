<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <title>Rendez-vous #{{ $rdv->id }}</title>
    <style>
        body { font-family: DejaVu Sans, sans-serif; font-size: 11px; color: #333; margin: 0; padding: 20px; }
        .header { text-align: center; border-bottom: 2px solid #0891b2; padding-bottom: 12px; margin-bottom: 15px; }
        .header h1 { color: #0891b2; margin: 0; font-size: 20px; }
        .header p { color: #666; margin: 4px 0 0; font-size: 10px; }
        .meta-grid { display: table; width: 100%; margin-bottom: 15px; }
        .meta-col { display: table-cell; width: 50%; vertical-align: top; padding-right: 10px; }
        .meta-col h3 { color: #0891b2; border-bottom: 1px solid #ddd; padding-bottom: 4px; font-size: 12px; margin: 0 0 6px; }
        .meta-col p { margin: 2px 0; }
        .label { color: #666; font-size: 10px; }
        .section { margin-bottom: 14px; }
        .section h3 { color: #0891b2; font-size: 13px; border-bottom: 1px solid #e5e7eb; padding-bottom: 3px; margin: 0 0 6px; }
        table { width: 100%; border-collapse: collapse; margin: 4px 0 10px; font-size: 10px; }
        th { background: #f1f5f9; color: #334155; padding: 5px 8px; text-align: left; border-bottom: 1px solid #e2e8f0; }
        td { padding: 4px 8px; border-bottom: 1px solid #f1f5f9; }
        .badge { display: inline-block; padding: 1px 6px; border-radius: 8px; font-size: 9px; font-weight: bold; }
        .badge-green { background: #dcfce7; color: #166534; }
        .badge-yellow { background: #fef3c7; color: #92400e; }
        .badge-red { background: #fecaca; color: #991b1b; }
        .badge-blue { background: #dbeafe; color: #1e40af; }
        .footer { text-align: center; margin-top: 20px; padding-top: 10px; border-top: 1px solid #ddd; color: #999; font-size: 9px; }
    </style>
</head>
<body>
    <div class="header">
        <h1>TLM-BFA / LiptakoCare</h1>
        <p>Plateforme de Télémédecine du Burkina Faso</p>
    </div>

    <h2 style="text-align:center; color:#333; font-size:16px; margin-bottom:15px;">RÉCAPITULATIF DU RENDEZ-VOUS</h2>

    <div class="meta-grid">
        <div class="meta-col">
            <h3>Rendez-vous</h3>
            <p><span class="label">N° :</span> {{ $rdv->id }}</p>
            <p><span class="label">Date :</span> {{ $rdv->date_rdv ? \Carbon\Carbon::parse($rdv->date_rdv)->format('d/m/Y') : '—' }}</p>
            <p><span class="label">Heure :</span> {{ $rdv->heure_rdv ?? '—' }}</p>
            <p><span class="label">Type :</span> {{ $rdv->type === 'presentiel' ? 'Consultation physique' : 'Téléconsultation' }}</p>
            <p><span class="label">Statut :</span>
                @php
                    $statusLabels = ['en_attente' => 'En attente', 'confirme' => 'Confirmé', 'annule' => 'Annulé', 'en_cours' => 'En cours', 'termine' => 'Terminé'];
                @endphp
                {{ $statusLabels[$rdv->statut] ?? ucfirst($rdv->statut) }}
            </p>
            <p><span class="label">Motif :</span> {{ $rdv->motif ?? '—' }}</p>
        </div>
        <div class="meta-col">
            <h3>Professionnel de santé</h3>
            @if($rdv->user)
                <p><span class="label">Nom :</span> Dr. {{ $rdv->user->prenoms }} {{ $rdv->user->nom }}</p>
                @if($rdv->user->matricule)
                    <p><span class="label">Matricule :</span> {{ $rdv->user->matricule }}</p>
                @endif
            @endif

            <h3 style="margin-top: 10px;">Patient</h3>
            @if($rdv->patient)
                <p><span class="label">Nom :</span> {{ $rdv->patient->prenoms }} {{ $rdv->patient->nom }}</p>
                @if($rdv->patient->identifiant)
                    <p><span class="label">Identifiant :</span> {{ $rdv->patient->identifiant }}</p>
                @endif
                @if($rdv->patient->telephone_1)
                    <p><span class="label">Téléphone :</span> {{ $rdv->patient->telephone_1 }}</p>
                @endif
            @endif
        </div>
    </div>

    @if($rdv->actes && $rdv->actes->count() > 0)
    <div class="section">
        <h3>Actes médicaux</h3>
        <table>
            <thead>
                <tr>
                    <th>#</th>
                    <th>Libellé</th>
                    <th style="text-align:right">Montant</th>
                </tr>
            </thead>
            <tbody>
                @php $total = 0; @endphp
                @foreach($rdv->actes as $i => $acte)
                    @php $total += $acte->cout ?? 0; @endphp
                    <tr>
                        <td>{{ $i + 1 }}</td>
                        <td>{{ $acte->libelle }}</td>
                        <td style="text-align:right">{{ number_format($acte->cout ?? 0, 0, ',', ' ') }} FCFA</td>
                    </tr>
                @endforeach
            </tbody>
            <tfoot>
                <tr>
                    <td colspan="2"><strong>Total</strong></td>
                    <td style="text-align:right"><strong>{{ number_format($total, 0, ',', ' ') }} FCFA</strong></td>
                </tr>
            </tfoot>
        </table>
    </div>
    @endif

    @if($rdv->motif_annulation)
    <div class="section">
        <h3>Motif d'annulation</h3>
        <p>{{ $rdv->motif_annulation }}</p>
    </div>
    @endif

    <div class="footer">
        Généré le {{ now()->format('d/m/Y à H:i') }} — TLM-BFA / LiptakoCare
    </div>
</body>
</html>

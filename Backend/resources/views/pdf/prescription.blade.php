<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <title>Ordonnance — Consultation #{{ $consultation->id }}</title>
    <style>
        body { font-family: DejaVu Sans, sans-serif; font-size: 11px; color: #333; margin: 0; padding: 20px; }
        .header { display: table; width: 100%; margin-bottom: 20px; }
        .header-left { display: table-cell; width: 60%; vertical-align: top; }
        .header-right { display: table-cell; width: 40%; vertical-align: top; text-align: right; }
        .header h1 { color: #4f46e5; margin: 0; font-size: 18px; }
        .header p { margin: 2px 0; color: #666; font-size: 10px; }
        .doctor-info { margin-bottom: 15px; }
        .doctor-info h2 { color: #333; font-size: 14px; margin: 0 0 4px; }
        .label { color: #888; font-size: 10px; }
        .patient-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px; margin-bottom: 20px; }
        .patient-box h3 { margin: 0 0 6px; color: #4f46e5; font-size: 12px; }
        .rx-symbol { text-align: center; font-size: 24px; color: #4f46e5; font-weight: bold; margin: 10px 0; }
        .prescription-item { border-bottom: 1px dashed #e2e8f0; padding: 10px 0; }
        .prescription-item:last-child { border-bottom: none; }
        .med-name { font-weight: bold; font-size: 13px; color: #1e293b; }
        .med-detail { margin: 3px 0 0 15px; color: #475569; }
        .urgent-badge { display: inline-block; background: #fecaca; color: #991b1b; padding: 1px 6px; border-radius: 8px; font-size: 9px; font-weight: bold; }
        .footer { margin-top: 30px; border-top: 1px solid #e2e8f0; padding-top: 15px; }
        .signature { text-align: right; margin-top: 30px; }
        .signature p { margin: 2px 0; }
        .disclaimer { text-align: center; color: #999; font-size: 8px; margin-top: 20px; }
    </style>
</head>
<body>
    <div class="header">
        <div class="header-left">
            <h1>TLM-BFA / LiptakoCare</h1>
            <p>Plateforme de Télémédecine du Burkina Faso</p>
        </div>
        <div class="header-right">
            <p><span class="label">Date :</span> {{ now()->format('d/m/Y') }}</p>
            <p><span class="label">Réf. :</span> ORD-{{ $consultation->id }}-{{ now()->format('Ymd') }}</p>
        </div>
    </div>

    @if($doctor)
        <div class="doctor-info">
            <h2>Dr. {{ $doctor->first_name }} {{ $doctor->last_name }}</h2>
            @if($doctor->specialite)<p>{{ $doctor->specialite }}</p>@endif
            @if($doctor->telephone)<p>Tél : {{ $doctor->telephone }}</p>@endif
            @if($doctor->email)<p>{{ $doctor->email }}</p>@endif
        </div>
    @endif

    <div class="patient-box">
        <h3>Patient</h3>
        @if($patient)
            <p><span class="label">Nom :</span> <strong>{{ $patient->first_name }} {{ $patient->last_name }}</strong></p>
            @if($patient->date_naissance)
                <p><span class="label">Date de naissance :</span> {{ $patient->date_naissance->format('d/m/Y') }}
                    ({{ $patient->date_naissance->age }} ans)</p>
            @endif
            @if($patient->sexe)
                <p><span class="label">Sexe :</span> {{ $patient->sexe === 'M' ? 'Masculin' : 'Féminin' }}</p>
            @endif
        @endif
    </div>

    <div class="rx-symbol">℞</div>

    @foreach($prescriptions as $i => $p)
        <div class="prescription-item">
            <p class="med-name">
                {{ $i + 1 }}. {{ $p->denomination }}
                @if($p->urgent) <span class="urgent-badge">URGENT</span> @endif
            </p>
            @if($p->posologie)
                <p class="med-detail"><span class="label">Posologie :</span> {{ $p->posologie }}</p>
            @endif
            @if($p->duree_jours)
                <p class="med-detail"><span class="label">Durée :</span> {{ $p->duree_jours }} jours</p>
            @endif
            @if($p->instructions)
                <p class="med-detail"><span class="label">Instructions :</span> {{ $p->instructions }}</p>
            @endif
        </div>
    @endforeach

    @if($prescriptions->isEmpty())
        <p style="text-align:center; color:#999; margin:20px 0;">Aucune prescription pour cette consultation.</p>
    @endif

    <div class="signature">
        <p style="font-size:10px; color:#888;">Signature du médecin</p>
        <br><br>
        <p style="border-top:1px solid #333; display:inline-block; padding-top:4px;">
            Dr. {{ $doctor?->first_name }} {{ $doctor?->last_name }}
        </p>
        <p style="font-size:9px; color:#888;">{{ now()->format('d/m/Y') }}</p>
    </div>

    <div class="disclaimer">
        <p>Ordonnance générée par la plateforme TLM-BFA / LiptakoCare.</p>
        <p>Ce document est confidentiel et couvert par le secret médical.</p>
    </div>
</body>
</html>
